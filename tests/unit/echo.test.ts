// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import {
  CHASE_MEMORY_MS,
  ECHO_SPEED,
  SENSE_INTERVAL_MS,
  WATER_RIPPLE_MS,
} from '../../src/engine/constants';
import { applyFog, initMirrorRuntime } from '../../src/game/frost';
import type { MirrorRef } from '../../src/game/floorObjects';
import type { PlayerState } from '../../src/game/player';
import { initEchoes, sensesPlayer, updateEcho, type EchoState } from '../../src/game/echo';
import { initWaterRuntime, type WaterRuntime } from '../../src/game/water';

// One straight open corridor across the middle row of a 5x5 grid: row y=2,
// whose cell centers lie on world y=0 (x = -8..8). All sense geometry stays
// on this line; row y=1 (world y=-4) is walled off from it.
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let x = 0; x < 4; x++) g.setOpen(x, 2, Dir.East);
  return g;
};

const mir = (id: number, x: number, z: number): MirrorRef => ({
  id,
  kind: 'standing',
  x,
  z,
  rotY: 0,
  cellX: 2,
  cellY: 2,
  pairId: null,
  wallDir: null,
});

const echoAt = (x: number, y: number, over: Partial<EchoState> = {}): EchoState => ({
  id: 0,
  x,
  y,
  heading: 0,
  mode: 'patrol',
  anchorIdx: 0,
  target: null,
  field: null,
  lastSensedCell: null,
  loseMemoryAt: null,
  nextSenseAt: 0,
  stuckAwarded: false,
  ...over,
});

/** One still (or rippled) pool at a world spot — the water eye fixture. */
const poolAt = (x: number, y: number, rippledAt: number | null = null): WaterRuntime => ({
  x,
  y,
  rippledAt,
});

describe('initEchoes', () => {
  it('spawns one patrol echo per spawn point at world positions', () => {
    const g = openGrid();
    const spawns = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    const anchors = [
      { x: -8, y: 0 },
      { x: 0, y: 0 },
      { x: 8, y: 0 },
    ];
    const es = initEchoes(spawns, g, anchors, 500);
    expect(es).toHaveLength(2);
    expect(es.map((e) => e.id)).toEqual([0, 1]);
    expect(es[0]).toMatchObject({ x: -8, y: 0, mode: 'patrol', anchorIdx: 0, nextSenseAt: 500 });
    expect(es[1]).toMatchObject({ x: 8, y: 0, anchorIdx: 1 });
  });
});

describe('sensesPlayer', () => {
  it('senses through a shared visible mirror; fogging blinds it', () => {
    const g = openGrid();
    const mirrors = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    const echo = echoAt(-1.5, 0);
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    expect(sensesPlayer(echo, player, mirrors, rt, [], g, 1000)).toBe(true);
    applyFog(rt, 1, 1000);
    expect(sensesPlayer(echo, player, mirrors, rt, [], g, 2000)).toBe(false);
  });

  it('senses across the corridor through a distant shared mirror', () => {
    const g = openGrid();
    const mirrors = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    expect(sensesPlayer(echoAt(-8, 0), { x: 8, y: 0, heading: 0 }, mirrors, rt, [], g, 0)).toBe(
      true,
    );
  });

  it('senses through a portrait — the ancestors are eyes too (T2)', () => {
    const g = openGrid();
    const mirrors = [{ ...mir(1, 0, 0), kind: 'portrait' as const }];
    const rt = initMirrorRuntime(mirrors);
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    expect(sensesPlayer(echoAt(-1.5, 0), player, mirrors, rt, [], g, 1000)).toBe(true);
    applyFog(rt, 1, 1000); // fogging the pane blinds the eye, standing-style
    expect(sensesPlayer(echoAt(-1.5, 0), player, mirrors, rt, [], g, 2000)).toBe(false);
  });

  it('no mirror, or only out-of-range mirrors → blind', () => {
    const g = openGrid();
    expect(sensesPlayer(echoAt(-1.5, 0), { x: 1.5, y: 0, heading: 0 }, [], [], [], g, 0)).toBe(
      false,
    );
    const far = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(far);
    expect(sensesPlayer(echoAt(-50, 0), { x: 1.5, y: 0, heading: 0 }, far, rt, [], g, 0)).toBe(
      false,
    );
  });

  it('a wall between echo and mirror blocks the sight', () => {
    const g = openGrid();
    const mirrors = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    // echo in row 1 (world y=-4): mirror is 4m away but across a wall
    expect(sensesPlayer(echoAt(0, -4), { x: 1.5, y: 0, heading: 0 }, mirrors, rt, [], g, 0)).toBe(
      false,
    );
  });
});

// T3 — the water-mirrors: standing pools are Echo eyes like clear glass
// (kind-independent of the mirror list — NO MirrorRef, no fog state), and the
// ONE blindness is the player's ripple.
describe('sensesPlayer — water eyes (T3)', () => {
  it('senses through still water with no mirrors on the floor at all', () => {
    const g = openGrid();
    const water = initWaterRuntime([{ x: 0, y: 0 }]);
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    expect(sensesPlayer(echoAt(-1.5, 0), player, [], [], water, g, 1000)).toBe(true);
  });

  it('a rippled pool is blind — and the eye reopens when the ripple lapses', () => {
    const g = openGrid();
    const water = [poolAt(0, 0, 1000)]; // rippled at t=1000
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    expect(sensesPlayer(echoAt(-1.5, 0), player, [], [], water, g, 1000)).toBe(false);
    expect(
      sensesPlayer(echoAt(-1.5, 0), player, [], [], water, g, 1000 + WATER_RIPPLE_MS - 1),
    ).toBe(false); // the last blinded ms
    expect(sensesPlayer(echoAt(-1.5, 0), player, [], [], water, g, 1000 + WATER_RIPPLE_MS)).toBe(
      true,
    ); // expiry reopens the eye
  });

  it('a wall between echo and pool blocks the sight, like glass', () => {
    const g = openGrid();
    const water = initWaterRuntime([{ x: 0, y: 0 }]);
    expect(sensesPlayer(echoAt(0, -4), { x: 1.5, y: 0, heading: 0 }, [], [], water, g, 0)).toBe(
      false,
    );
  });

  it('water beyond SENSE_RANGE does not see; a still pool can carry the sight when every mirror is fogged', () => {
    const g = openGrid();
    const far = initWaterRuntime([{ x: -8, y: 0 }]);
    const player: PlayerState = { x: 60, y: 0, heading: 0 }; // out of range of everything
    expect(sensesPlayer(echoAt(8, 0), player, [], [], far, g, 0)).toBe(false);
    // fog the only mirror; the still pool keeps the echo's eye open
    const mirrors = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    applyFog(rt, 1, 0);
    const near = initWaterRuntime([{ x: 0, y: 0 }]);
    expect(
      sensesPlayer(echoAt(-1.5, 0), { x: 1.5, y: 0, heading: 0 }, mirrors, rt, near, g, 0),
    ).toBe(true);
  });
});

describe('updateEcho', () => {
  it('patrol → chase when the sense interval is due and a mirror shares the sight', () => {
    const g = openGrid();
    const mirrors = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    // before the interval: no sense check, stays patrol
    const before = updateEcho(
      echoAt(-1.5, 0, { nextSenseAt: 1000 }),
      player,
      mirrors,
      rt,
      [],
      g,
      anchors,
      999,
      1 / 120,
    );
    expect(before.mode).toBe('patrol');
    // at the interval: senses → chase, remembers the player cell
    const chase = updateEcho(
      echoAt(-1.5, 0, { nextSenseAt: 1000 }),
      player,
      mirrors,
      rt,
      [],
      g,
      anchors,
      1000,
      1 / 120,
    );
    expect(chase.mode).toBe('chase');
    expect(chase.lastSensedCell).toEqual(g.cellAt(1.5, 0));
    expect(chase.loseMemoryAt).toBe(1000 + CHASE_MEMORY_MS);
    expect(chase.nextSenseAt).toBe(1000 + SENSE_INTERVAL_MS);
  });

  it('chases through rippled-blind water too: a pool the player ripples mid-chase loses them', () => {
    const g = openGrid();
    const anchors = [{ x: -8, y: 0 }];
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    const chasing = echoAt(-1.5, 0, { loseMemoryAt: 0, nextSenseAt: 1000 });
    // still water carries the sense → chase begins
    const still = updateEcho(
      chasing,
      player,
      [],
      [],
      initWaterRuntime([{ x: 0, y: 0 }]),
      g,
      anchors,
      1000,
      1 / 120,
    );
    expect(still.mode).toBe('chase');
    // the memory lapses; the pool is rippled now — the fresh check finds no eye
    const rippled = updateEcho(
      { ...still, loseMemoryAt: 0, nextSenseAt: 2000 },
      player,
      [],
      [],
      [poolAt(0, 0, 1500)],
      g,
      anchors,
      2000,
      1 / 120,
    );
    expect(rippled.mode).toBe('patrol'); // the echo loses you
  });

  it('chase → patrol after CHASE_MEMORY_MS without a fresh sight', () => {
    const g = openGrid();
    const mirrors = [mir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    const anchors = [
      { x: -8, y: 0 },
      { x: 8, y: 0 },
    ];
    const player: PlayerState = { x: 30, y: 0, heading: 0 }; // far away: no sight
    const chasing = echoAt(-1.5, 0, {
      mode: 'chase',
      lastSensedCell: { x: 2, y: 2 },
      loseMemoryAt: 3000,
      nextSenseAt: 0,
    });
    expect(updateEcho(chasing, player, mirrors, rt, [], g, anchors, 2999, 1 / 120).mode).toBe(
      'chase',
    );
    const lost = updateEcho(chasing, player, mirrors, rt, [], g, anchors, 3000, 1 / 120);
    expect(lost.mode).toBe('patrol');
    expect(lost.target).toEqual(g.cellAt(anchors[0]!.x, anchors[0]!.y)); // back on the anchor
  });

  it('two fogged mirrors nearby and no unfogged eye → confused spin', () => {
    const g = openGrid();
    const mirrors = [mir(1, -7, 0), mir(2, -6, 0)];
    const rt = initMirrorRuntime(mirrors);
    applyFog(rt, 1, 0);
    applyFog(rt, 2, 0);
    const anchors = [{ x: 8, y: 0 }];
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    const e = updateEcho(echoAt(-8, 0), player, mirrors, rt, [], g, anchors, 1000, 0.5);
    expect(e.mode).toBe('confused');
    expect(e.target).toBeNull();
    expect(e.field).toBeNull();
    expect(e.heading).toBeCloseTo(1); // heading += 2·dtS = 2·0.5
  });

  it('one fogged mirror, or a clear eye nearby, does not confuse', () => {
    const g = openGrid();
    const anchors = [{ x: 8, y: 0 }];
    const player: PlayerState = { x: 1.5, y: 0, heading: 0 };
    // only one fogged mirror → patrol
    const one = [mir(1, -7, 0)];
    const rtOne = initMirrorRuntime(one);
    applyFog(rtOne, 1, 0);
    expect(updateEcho(echoAt(-8, 0), player, one, rtOne, [], g, anchors, 1000, 0.5).mode).toBe(
      'patrol',
    );
    // two fogged but one clear eye within CONFUSE_UNFOGGED_R → senses and chases instead
    const mix = [mir(1, -7, 0), mir(2, -6, 0), mir(3, -5, 0)];
    const rtMix = initMirrorRuntime(mix);
    applyFog(rtMix, 1, 0);
    applyFog(rtMix, 2, 0);
    expect(updateEcho(echoAt(-8, 0), player, mix, rtMix, [], g, anchors, 1000, 0.5).mode).toBe(
      'chase',
    );
  });

  it('patrol movement advances toward the next flow cell and rotates anchors on arrival', () => {
    const g = openGrid();
    const anchors = [
      { x: 8, y: 0 },
      { x: 0, y: 0 },
    ];
    const player: PlayerState = { x: 30, y: 0, heading: 0 }; // blind
    const noMirrors: MirrorRef[] = [];
    // next flow cell from (0,2) toward anchor cell (4,2) is (1,2) at (-4, 0)
    let e = updateEcho(
      echoAt(-8, 0, { nextSenseAt: 1_000_000 }),
      player,
      noMirrors,
      [],
      [],
      g,
      anchors,
      0,
      1 / 120,
    );
    expect(e.x).toBeCloseTo(-8 + ECHO_SPEED / 120);
    expect(e.y).toBeCloseTo(0);
    expect(e.heading).toBeCloseTo(Math.PI / 2); // heading 0 = north = -y → east is π/2
    // standing on the anchor center: arrival rotates to the next anchor and walks back
    e = updateEcho({ ...e, x: 8, y: 0 }, player, noMirrors, [], [], g, anchors, 10, 1 / 120);
    expect(e.anchorIdx).toBe(1);
    expect(e.x).toBeLessThan(8);
  });

  it('in-cell pursuit: echo in the sensed cell closes on the player position, not the cell center', () => {
    const g = openGrid();
    const anchors = [{ x: -8, y: 0 }];
    const player: PlayerState = { x: 1.5, y: 0.5, heading: 0 }; // cell (2,2), off-center
    // echo AT the sensed cell's center (0,0) with live memory of that cell —
    // the old code parked here: the cell-center goal was already reached.
    let e = echoAt(0, 0, {
      mode: 'chase',
      lastSensedCell: { x: 2, y: 2 },
      loseMemoryAt: 10_000,
      nextSenseAt: 1_000_000, // no fresh sense: chase purely on memory
    });
    let dist = Math.hypot(e.x - player.x, e.y - player.y);
    for (let i = 0; i < 240 && dist > 1e-9; i++) {
      e = updateEcho(e, player, [], [], [], g, anchors, 5000 + i * 8, 1 / 120);
      const next = Math.hypot(e.x - player.x, e.y - player.y);
      expect(next).toBeLessThan(dist); // every step closes
      dist = next;
    }
    expect(dist).toBeCloseTo(0, 1); // two seconds of pursuit ends on the player
  });

  it('in-cell pursuit guards the walls: a player who left the sensed cell is chased at its center', () => {
    const g = openGrid();
    const anchors = [{ x: -8, y: 0 }];
    const player: PlayerState = { x: 30, y: 0, heading: 0 }; // far away, outside the cell
    // echo off-center inside the sensed cell: it still walks to the cell
    // center — the live player position is only followed inside that cell.
    const e = echoAt(1.5, 0, {
      mode: 'chase',
      lastSensedCell: { x: 2, y: 2 },
      loseMemoryAt: 10_000,
      nextSenseAt: 1_000_000,
    });
    const next = updateEcho(e, player, [], [], [], g, anchors, 5000, 1 / 120);
    expect(next.x).toBeCloseTo(1.5 - ECHO_SPEED / 120); // toward (0,0), not toward x=30
    expect(next.y).toBeCloseTo(0);
  });
});
