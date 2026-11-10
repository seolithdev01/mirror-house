// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import {
  CELL_SIZE,
  DISTORT_MAX_CELLS,
  FOG_DURATION_MS,
  SENSE_RANGE,
} from '../../src/engine/constants';
import { generateFloor, TIER_ONE } from '../../src/game/maze';
import {
  distortDelta,
  generateFloorObjects,
  mirrorSpotFor,
  M2_PARAMS,
  type MirrorRef,
} from '../../src/game/floorObjects';
import { applyFog, fogTarget, initMirrorRuntime } from '../../src/game/frost';
import { crackTarget } from '../../src/game/houseState';
import { apparentPlayer } from '../../src/game/distort';
import { sensesPlayer, updateEcho, type EchoState } from '../../src/game/echo';
import type { PlayerState } from '../../src/game/player';

// The placement fixtures: one 15x15 procedural floor per seed, the
// floorobjects.test.ts convention.
const floorA = generateFloor({ ...TIER_ONE, seed: 'DISTORT' });
const floorB = generateFloor({ ...TIER_ONE, seed: 'CARNIVAL' });

// The apparent-position fixtures: one straight open corridor across the
// middle row of a 9x9 grid (row y=4, world y=0, centers x = -16..16) — wide
// enough that a ±2-cell displacement stays inside the grid for LOS tests.
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(9, 9);
  for (let x = 0; x < 8; x++) g.setOpen(x, 4, Dir.East);
  return g;
};

const dMir = (id: number, x: number, z: number, dx: number, dy: number): MirrorRef => ({
  id,
  kind: 'distort',
  x,
  z,
  rotY: 0,
  cellX: 4,
  cellY: 4,
  pairId: null,
  wallDir: null,
  distortDx: dx,
  distortDy: dy,
});

const standMir = (id: number, x: number, z: number): MirrorRef => ({
  id,
  kind: 'standing',
  x,
  z,
  rotY: 0,
  cellX: 4,
  cellY: 4,
  pairId: null,
  wallDir: null,
});

const playerAt = (x: number, y: number): PlayerState => ({ x, y, heading: 0 });

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

// ---------------------------------------------------------------------------
// Placement — the tier-4 carnival glass. 2–3 per floor via the rng-gated
// param (the portraits pattern), deltas per-id deterministic, draws LAST-LAST
// in the stream so tiers 1–3 stay byte-identical.
// ---------------------------------------------------------------------------
describe('distort placement — tier-4 mirrors, tier-1/2/3 streams untouched', () => {
  it('asks for 2–3 distort mirrors (the param is the floor of the range, one int(2) coin)', () => {
    const o = generateFloorObjects(floorA, { ...M2_PARAMS, distort: 2 });
    const distort = o.mirrors.filter((m) => m.kind === 'distort');
    expect(distort.length).toBeGreaterThanOrEqual(2);
    expect(distort.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic across rebuilds of the same floor', () => {
    const a = generateFloorObjects(floorA, { ...M2_PARAMS, distort: 2 });
    const b = generateFloorObjects(floorA, { ...M2_PARAMS, distort: 2 });
    expect(a).toEqual(b);
  });

  it('mounts every distort mirror on a wall like standing glass; never pairs, opens nothing', () => {
    const o = generateFloorObjects(floorA, { ...M2_PARAMS, distort: 2 });
    const distort = o.mirrors.filter((m) => m.kind === 'distort');
    expect(distort.length).toBeGreaterThan(0);
    for (const m of distort) {
      const spot = mirrorSpotFor(floorA.grid, m.cellX, m.cellY);
      expect(spot).not.toBeNull();
      expect(m.x).toBeCloseTo(spot!.x, 9);
      expect(m.z).toBeCloseTo(spot!.z, 9);
      expect(m.rotY).toBeCloseTo(spot!.rotY, 9);
      expect(m.pairId).toBeNull();
      expect(m.wallDir).toBeNull(); // not a T7 door
    }
  });

  it('no two mirrors share a cell when the distort walk the floor', () => {
    const o = generateFloorObjects(floorA, { ...M2_PARAMS, distort: 2 });
    const cells = o.mirrors.map((m) => `${m.cellX},${m.cellY}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('deltas are axis-aligned, never zero, within ±DISTORT_MAX_CELLS cells', () => {
    for (const floor of [floorA, floorB]) {
      const o = generateFloorObjects(floor, { ...M2_PARAMS, distort: 2 });
      for (const m of o.mirrors.filter((x) => x.kind === 'distort')) {
        const { distortDx: dx, distortDy: dy } = m;
        expect(dx).toBeDefined();
        expect(dy).toBeDefined();
        // exactly one axis carries the lie (axis-aligned)
        expect((dx === 0) !== (dy === 0), `mirror ${m.id}: (${dx},${dy})`).toBe(true);
        const mag = Math.abs(dx!) + Math.abs(dy!);
        expect(mag).toBeGreaterThanOrEqual(1); // never a no-op mirror
        expect(mag).toBeLessThanOrEqual(DISTORT_MAX_CELLS);
      }
    }
  });

  it('the delta is per-ID deterministic — the same id lies the same way on every floor', () => {
    const a = generateFloorObjects(floorA, { ...M2_PARAMS, distort: 2 });
    const b = generateFloorObjects(floorB, { ...M2_PARAMS, distort: 2 });
    const byId = new Map<number, { dx: number; dy: number }>();
    for (const m of [...a.mirrors, ...b.mirrors].filter((x) => x.kind === 'distort')) {
      const delta = { dx: m.distortDx!, dy: m.distortDy! };
      const seen = byId.get(m.id);
      if (seen) expect(delta, `mirror id ${m.id} must lie one way`).toEqual(seen);
      else byId.set(m.id, delta);
      expect(delta).toEqual(distortDelta(m.id)); // the stored field IS the pure fn
    }
    // the pure fn itself: stable, bounded, axis-aligned across a wide id sweep
    for (let id = 0; id < 64; id++) {
      expect(distortDelta(id)).toEqual(distortDelta(id));
      const { dx, dy } = distortDelta(id);
      expect((dx === 0) !== (dy === 0)).toBe(true);
      expect(Math.abs(dx) + Math.abs(dy)).toBeLessThanOrEqual(DISTORT_MAX_CELLS);
      expect(Math.abs(dx) + Math.abs(dy)).toBeGreaterThanOrEqual(1);
    }
  });

  it('default params place zero distort mirrors — and distort: 0 draws nothing (tiers 1–3 byte-identical)', () => {
    expect(generateFloorObjects(floorA).mirrors.filter((m) => m.kind === 'distort')).toHaveLength(
      0,
    );
    // the tier-2 stream (portraits drawn) is untouched by a zero distort ask
    const t2 = generateFloorObjects(floorA, { ...M2_PARAMS, portraits: 2 });
    expect(generateFloorObjects(floorA, { ...M2_PARAMS, portraits: 2, distort: 0 })).toEqual(t2);
    // the tier-3 stream (water drawn LAST) is untouched too — distort draws
    // AFTER water, never before
    const t3 = generateFloorObjects(floorA, { ...M2_PARAMS, water: 2 });
    expect(generateFloorObjects(floorA, { ...M2_PARAMS, water: 2, distort: 0 })).toEqual(t3);
  });
});

// ---------------------------------------------------------------------------
// apparentPlayer — the pure lie. While ANY unfogged distort mirror sees the
// player (mirror↔player LOS + SENSE_RANGE; the echo's own position is NOT
// part of the displacement), the first such mirror in list order displaces
// the player's apparent position by its fixed delta (cells → world meters).
// ---------------------------------------------------------------------------
describe('apparentPlayer', () => {
  it('clean floor, no distort mirrors: the true position', () => {
    const g = openGrid();
    const mirrors = [standMir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    const p = playerAt(4, 0);
    expect(apparentPlayer(p, mirrors, rt, g, 1000)).toEqual({ x: 4, y: 0 });
  });

  it('displaced while an unfogged distort mirror sees the player — cells to meters', () => {
    const g = openGrid();
    const mirrors = [dMir(1, 0, 0, 2, 0)];
    const rt = initMirrorRuntime(mirrors);
    const p = playerAt(4, 0); // 4 m from the glass, LOS clear, in SENSE_RANGE
    expect(apparentPlayer(p, mirrors, rt, g, 1000)).toEqual({
      x: 4 + 2 * CELL_SIZE,
      y: 0,
    });
  });

  it('the FIRST distort mirror in list order wins — deterministic', () => {
    const g = openGrid();
    const mirrors = [dMir(1, 0, 0, 1, 0), dMir(2, 0, 0, -2, 0)];
    const rt = initMirrorRuntime(mirrors);
    expect(apparentPlayer(playerAt(4, 0), mirrors, rt, g, 1000)).toEqual({
      x: 4 + CELL_SIZE,
      y: 0,
    });
  });

  it('fogging the distort mirror restores the truth — timed fog like standing, never a capture', () => {
    const g = openGrid();
    const mirrors = [dMir(1, 0, 0, 2, 0)];
    const rt = initMirrorRuntime(mirrors);
    applyFog(rt, 1, 1000);
    expect(rt[0]!.captured).toBe(false); // NOT a beacon
    expect(rt[0]!.foggedUntil).toBe(1000 + FOG_DURATION_MS);
    expect(apparentPlayer(playerAt(4, 0), mirrors, rt, g, 1000)).toEqual({ x: 4, y: 0 });
    // and once the fog lapses (mirror fog is inclusive at the boundary) the
    // lie returns
    expect(
      apparentPlayer(playerAt(4, 0), mirrors, rt, g, 1000 + FOG_DURATION_MS + 1).x,
    ).toBeCloseTo(4 + 2 * CELL_SIZE, 9);
  });

  it('beyond SENSE_RANGE of the glass, or behind a wall, the glass sees nothing to lie about', () => {
    const g = openGrid();
    const far = [dMir(1, 0, 0, 2, 0)];
    const rtFar = initMirrorRuntime(far);
    expect(apparentPlayer(playerAt(SENSE_RANGE + 1, 0), far, rtFar, g, 0)).toEqual({
      x: SENSE_RANGE + 1,
      y: 0,
    });
    // player in row y=3 (world y=-4): 4 m from the glass but across a wall
    const walled = [dMir(2, 0, 0, 2, 0)];
    const rtWalled = initMirrorRuntime(walled);
    expect(apparentPlayer(playerAt(0, -4), walled, rtWalled, g, 0)).toEqual({ x: 0, y: -4 });
  });

  it('a standing mirror never displaces — only the carnival glass lies', () => {
    const g = openGrid();
    const mirrors = [standMir(1, 0, 0), dMir(2, 8, 0, 0, -1)];
    const rt = initMirrorRuntime(mirrors);
    // the distort mirror at (8,0) is 4 m from the player, LOS clear → wins
    expect(apparentPlayer(playerAt(4, 0), mirrors, rt, g, 0)).toEqual({ x: 4, y: -CELL_SIZE });
  });
});

// ---------------------------------------------------------------------------
// The sight feed — sensesPlayer/updateEcho take the apparent position: the
// range check + the remembered chase cell are computed where you APPEAR.
// ---------------------------------------------------------------------------
describe('sensesPlayer — the displaced range check', () => {
  it('apparent beyond SENSE_RANGE hides a truly-in-range player', () => {
    const g = openGrid();
    const eye = [standMir(1, 0, 0)];
    const rt = initMirrorRuntime(eye);
    const echo = echoAt(-1.5, 0);
    const truePlayer = playerAt(12, 0); // 12 < 13: in range of the eye
    // without the lie: sensed
    expect(sensesPlayer(echo, truePlayer, eye, rt, [], g, 0)).toBe(true);
    // displaced to 12 + 8 = 20 m from the eye: out of range, not sensed
    expect(sensesPlayer(echo, truePlayer, eye, rt, [], g, 0, { x: 20, y: 0 })).toBe(false);
  });

  it('apparent within SENSE_RANGE reveals a truly-out-of-range player', () => {
    const g = openGrid();
    const eye = [standMir(1, 0, 0)];
    const rt = initMirrorRuntime(eye);
    const echo = echoAt(-1.5, 0);
    const truePlayer = playerAt(20, 0); // beyond the eye
    expect(sensesPlayer(echo, truePlayer, eye, rt, [], g, 0)).toBe(false);
    // the house thinks they stand 12 m out — the echo sees the lie
    expect(sensesPlayer(echo, truePlayer, eye, rt, [], g, 0, { x: 12, y: 0 })).toBe(true);
  });

  it('a wall between the apparent position and the eye blocks the sight', () => {
    const g = openGrid();
    const eye = [standMir(1, 0, 0)];
    const rt = initMirrorRuntime(eye);
    const echo = echoAt(-1.5, 0);
    const truePlayer = playerAt(4, 0);
    // apparent across the wall in row y=3: LOS eye↔apparent is blocked
    expect(sensesPlayer(echo, truePlayer, eye, rt, [], g, 0, { x: 4, y: -4 })).toBe(false);
  });

  it('an unfogged distort mirror is an EYE too — and fogging blinds it like standing glass', () => {
    const g = openGrid();
    const mirrors = [dMir(1, 0, 0, 2, 0)];
    const rt = initMirrorRuntime(mirrors);
    const echo = echoAt(-1.5, 0);
    const player = playerAt(1.5, 0);
    expect(sensesPlayer(echo, player, mirrors, rt, [], g, 1000)).toBe(true);
    applyFog(rt, 1, 1000);
    expect(sensesPlayer(echo, player, mirrors, rt, [], g, 2000)).toBe(false);
  });
});

describe('updateEcho — the chase targets the APPARENT cell', () => {
  it('the sense block remembers where you appear, not where you are', () => {
    const g = openGrid();
    const mirrors = [standMir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    const anchors = [{ x: -16, y: 0 }];
    const truePlayer = playerAt(4, 0);
    const next = updateEcho(
      echoAt(-1.5, 0, { nextSenseAt: 1000 }),
      truePlayer,
      mirrors,
      rt,
      [],
      g,
      anchors,
      1000,
      1 / 120,
      { x: 4 + 2 * CELL_SIZE, y: 0 }, // displaced 2 cells east
    );
    expect(next.mode).toBe('chase');
    expect(next.lastSensedCell).toEqual(g.cellAt(4 + 2 * CELL_SIZE, 0));
    expect(next.lastSensedCell).not.toEqual(g.cellAt(truePlayer.x, truePlayer.y));
  });

  it('without an apparent argument the true position is used (the tiers 1–3 contract)', () => {
    const g = openGrid();
    const mirrors = [standMir(1, 0, 0)];
    const rt = initMirrorRuntime(mirrors);
    const anchors = [{ x: -16, y: 0 }];
    const next = updateEcho(
      echoAt(-1.5, 0, { nextSenseAt: 1000 }),
      playerAt(4, 0),
      mirrors,
      rt,
      [],
      g,
      anchors,
      1000,
      1 / 120,
    );
    expect(next.lastSensedCell).toEqual(g.cellAt(4, 0));
  });
});

// ---------------------------------------------------------------------------
// Frost/capture treat distort like standing: fogable, NOT a beacon — and the
// glass cracks like glass.
// ---------------------------------------------------------------------------
describe('frost and cracks — distort is standing glass', () => {
  it('fogTarget offers the distort mirror in cone and range', () => {
    const g = openGrid();
    const mirrors = [dMir(1, 0, 0, 2, 0)];
    const player = { x: 0, y: 1.5, heading: 0 }; // in the corridor, south of the pane, facing it
    expect(fogTarget(mirrors, player, g)?.id).toBe(1);
  });

  it('crackTarget treats a sprint into the carnival glass like any glass', () => {
    const mirrors = [dMir(1, 0, 0, 2, 0)];
    const rt = initMirrorRuntime(mirrors);
    const player = { x: 0, y: 0.6, heading: 0 }; // 0.6 m south of the pane, facing it
    expect(crackTarget(mirrors, rt, player, true)?.id).toBe(1);
  });
});
