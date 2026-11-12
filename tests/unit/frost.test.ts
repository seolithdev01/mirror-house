// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { COLD_FOG_MS, FOG_DURATION_MS, THAW_LURE_RADIUS } from '../../src/engine/constants';
import { Dir, FloorGrid } from '../../src/engine/grid';
import {
  applyFog,
  fogTarget,
  initMirrorRuntime,
  isFogged,
  mirrorVisual,
  updateBreath,
  FOG_COST,
} from '../../src/game/frost';
import type { MirrorRef } from '../../src/game/floorObjects';

const m = (id: number, kind: MirrorRef['kind'], x: number, z: number, rotY = 0): MirrorRef => ({
  id,
  kind,
  x,
  z,
  rotY,
  cellX: 0,
  cellY: 0,
  pairId: null,
  wallDir: null,
});

/** A 5x5 grid with every internal wall open — LOS is always clear, so the
 *  kind/range/cone geometry can be tested on its own. */
const openGrid = (): FloorGrid => {
  const g = new FloorGrid(5, 5);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      if (x < 4) g.setOpen(x, y, Dir.East);
      if (y < 4) g.setOpen(x, y, Dir.South);
    }
  return g;
};

describe('frost', () => {
  it('fogTarget: nearest standing/beacon within range and cone; ignores true/silvered', () => {
    const player = { x: 0, y: 0, heading: 0 }; // facing north (-y)
    const mirrors = [
      m(1, 'standing', 0, -3),
      m(2, 'beacon', 0, -4.5),
      m(3, 'true', 0, -1),
      m(4, 'silvered', 0, -1.5),
    ];
    expect(fogTarget(mirrors, player, openGrid())?.id).toBe(1);
  });
  it('fogTarget: portraits fog exactly like standing glass (T2)', () => {
    const player = { x: 0, y: 0, heading: 0 };
    expect(fogTarget([m(1, 'portrait', 0, -3)], player, openGrid())?.id).toBe(1);
    // and they lose to a NEARER standing mirror — plain distance geometry
    const both = [m(1, 'portrait', 0, -4.5), m(2, 'standing', 0, -3)];
    expect(fogTarget(both, player, openGrid())?.id).toBe(2);
  });
  it('fogTarget: outside cone or range → null', () => {
    const player = { x: 0, y: 0, heading: 0 };
    expect(fogTarget([m(1, 'standing', 3, -3)], player, openGrid())).toBeNull(); // ~45° off-cone
    expect(fogTarget([m(1, 'standing', 0, -5.5)], player, openGrid())).toBeNull(); // beyond 5m
  });
  it('fogTarget: a wall between player and mirror blocks the frost (LOS)', () => {
    const g = new FloorGrid(5, 5); // fully walled — every cell isolated
    const player = { x: 0, y: 0, heading: 0 }; // cell (2,2)
    const mirror = m(1, 'standing', 0, -4); // cell (2,1): dead ahead, 4m — but across a wall
    expect(fogTarget([mirror], player, g)).toBeNull();
    g.setOpen(2, 2, Dir.North); // open the shared edge — the same geometry now fogs
    expect(fogTarget([mirror], player, g)?.id).toBe(1);
  });
  it('applyFog: standing times out, beacon is captured forever', () => {
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0), m(2, 'beacon', 0, 0)]);
    applyFog(rt, 1, 1000, FOG_DURATION_MS);
    expect(isFogged(rt[0]!, 2000)).toBe(true);
    expect(isFogged(rt[0]!, 26001)).toBe(false);
    applyFog(rt, 2, 1000, FOG_DURATION_MS);
    expect(isFogged(rt[1]!, 999_999)).toBe(true);
    expect(rt[1]!.captured).toBe(true);
  });
  it('applyFog: the caller owns the duration — a passed duration times out at now + duration (T6/T2)', () => {
    // T6/T2 — main passes fogDurationMs(campaign.floor): the base 25 s on the
    // cool floors, 12.5 s in the Furnace. applyFog itself stays floor-agnostic
    // (pure, heat-blind): whatever duration it is handed is the whole truth.
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0)]);
    applyFog(rt, 1, 1000, 12_500);
    expect(rt[0]!.foggedUntil).toBe(1000 + 12_500);
    expect(isFogged(rt[0]!, 13_500)).toBe(true);
    expect(isFogged(rt[0]!, 1000 + 12_500 + 1)).toBe(false);
  });
  it('applyFog: a beacon capture ignores the duration — captured is forever (T6/T2)', () => {
    const rt = initMirrorRuntime([m(2, 'beacon', 0, 0)]);
    applyFog(rt, 2, 1000, 12_500);
    expect(rt[0]!.captured).toBe(true);
    expect(rt[0]!.foggedUntil).toBeNull();
    expect(isFogged(rt[0]!, 999_999)).toBe(true);
  });
  it('applyFog: portrait fog is TIMED like standing — never a capture (T2)', () => {
    const rt = initMirrorRuntime([m(1, 'portrait', 0, 0)]);
    applyFog(rt, 1, 1000, FOG_DURATION_MS);
    expect(rt[0]!.captured).toBe(false);
    expect(isFogged(rt[0]!, 2000)).toBe(true);
    expect(isFogged(rt[0]!, 26_001)).toBe(false);
  });
  it('breath spends and recharges with clamp', () => {
    expect(updateBreath(1, 0, true)).toBeCloseTo(1 - FOG_COST);
    expect(updateBreath(0, 4, false)).toBeCloseTo(1);
    expect(updateBreath(0.99, 4, false)).toBe(1);
  });

  it('mirrorVisual: captured beats an unexpired fog; expired fog reads clear', () => {
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0), m(2, 'beacon', 0, 0)]);
    applyFog(rt, 1, 1000, FOG_DURATION_MS);
    expect(mirrorVisual(rt[0]!, 1000)).toBe('fogged');
    expect(mirrorVisual(rt[0]!, 26_001)).toBe('clear');
    applyFog(rt, 2, 1000, FOG_DURATION_MS);
    expect(mirrorVisual(rt[1]!, 999_999)).toBe('captured');
  });

  it('isFogged is exactly "not clear" — the two can never disagree', () => {
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0)]);
    for (const now of [0, 999, 1000, 26_000, 26_001, 1e9]) {
      applyFog(rt, 1, 1000, FOG_DURATION_MS);
      expect(isFogged(rt[0]!, now)).toBe(mirrorVisual(rt[0]!, now) !== 'clear');
    }
    expect(isFogged(rt[0]!, 2000)).toBe(true);
  });
});

// T8 — the Frozen Atrium: the tier's signature inversion. Every fogable pane
// (standing/portrait/distort — NEVER beacons, NEVER the true pair) spawns
// FROZEN: frost-white, eye-blind like fogged. The frost verb inverts there —
// frost on ice THAWS (the pane becomes a live eye + a warden lure, permanent
// for the attempt), frost on a thawed pane COLD-FOGS (COLD_FOG_MS — never
// meaningfully expires; the eye closes). Tiers ≤ 7 spawn unfrozen and read
// exactly as always.
describe('frost — T8 frozen atrium (the thaw inversion)', () => {
  const m8 = (id: number, kind: MirrorRef['kind']): MirrorRef => m(id, kind, 0, 0);

  it('constants: THAW_LURE_RADIUS = 10, COLD_FOG_MS = 600000', () => {
    expect(THAW_LURE_RADIUS).toBe(10);
    expect(COLD_FOG_MS).toBe(600000);
  });

  it('frozenSpawn freezes standing/portrait/distort — never beacons, never true, never silvered', () => {
    const kinds: MirrorRef['kind'][] = [
      'standing',
      'portrait',
      'distort',
      'beacon',
      'true',
      'silvered',
    ];
    const rt = initMirrorRuntime(
      kinds.map((k, i) => m8(i, k)),
      { frozenSpawn: true },
    );
    expect(rt.map((r) => r.frozen)).toEqual([true, true, true, false, false, false]);
    expect(rt.every((r) => r.thawed === false)).toBe(true);
    expect(rt.every((r) => r.foggedUntil === null)).toBe(true); // frozen is its own state, not a fog timer
  });

  it('no opts → nothing frozen: tiers ≤ 7 spawn byte-identical (the pin)', () => {
    const kinds: MirrorRef['kind'][] = ['standing', 'portrait', 'distort', 'beacon'];
    const rt = initMirrorRuntime(kinds.map((k, i) => m8(i, k)));
    expect(rt.every((r) => r.frozen === false)).toBe(true);
    expect(rt.every((r) => r.thawed === false)).toBe(true);
    // and frozenSpawn: false says the same thing as no opts at all
    const rtOff = initMirrorRuntime(
      kinds.map((k, i) => m8(i, k)),
      { frozenSpawn: false },
    );
    expect(rtOff.every((r) => r.frozen === false)).toBe(true);
  });

  it('a frozen pane is eye-blind (isFogged true) and reads the frozen visual', () => {
    const rt = initMirrorRuntime([m8(1, 'standing')], { frozenSpawn: true });
    expect(mirrorVisual(rt[0]!, 5000)).toBe('frozen');
    expect(isFogged(rt[0]!, 5000)).toBe(true); // the echo eyes start closed
  });

  it('applyFog on frozen THAWS: frozen=false, thawed=true, foggedUntil=null — a live eye for the attempt', () => {
    const rt = initMirrorRuntime([m8(1, 'standing')], { frozenSpawn: true });
    applyFog(rt, 1, 1000, COLD_FOG_MS); // duration is the caller's; the thaw branch ignores it
    expect(rt[0]!.frozen).toBe(false);
    expect(rt[0]!.thawed).toBe(true);
    expect(rt[0]!.foggedUntil).toBeNull();
    expect(mirrorVisual(rt[0]!, 999_999)).toBe('clear'); // permanent for the attempt — no timer
    expect(isFogged(rt[0]!, 999_999)).toBe(false); // the eye is OPEN
  });

  it('applyFog on thawed COLD-FOGS: foggedUntil = now + COLD_FOG_MS, thawed cleared', () => {
    const rt = initMirrorRuntime([m8(1, 'standing')], { frozenSpawn: true });
    applyFog(rt, 1, 1000, COLD_FOG_MS); // thaw
    expect(rt[0]!.thawed).toBe(true);
    applyFog(rt, 1, 5000, COLD_FOG_MS); // frost again — the cold fog
    expect(rt[0]!.thawed).toBe(false); // fogging a thawed pane clears the thaw
    expect(rt[0]!.frozen).toBe(false); // and it stays thawed-off: fog, not ice
    expect(rt[0]!.foggedUntil).toBe(5000 + COLD_FOG_MS);
    expect(mirrorVisual(rt[0]!, 5000 + COLD_FOG_MS)).toBe('fogged');
    expect(isFogged(rt[0]!, 5000 + COLD_FOG_MS)).toBe(true); // the eye closed
    // 600 s later it is STILL shut — the cold holds for the whole attempt
    expect(isFogged(rt[0]!, 5000 + COLD_FOG_MS)).toBe(true);
    expect(isFogged(rt[0]!, 5000 + COLD_FOG_MS + 1)).toBe(false); // the boundary is honest
  });

  it('a thawed pane reads clear — mirrorVisual precedence: captured → frozen → fogged → clear', () => {
    const rt = initMirrorRuntime([m8(1, 'standing'), m8(2, 'beacon')], { frozenSpawn: true });
    applyFog(rt, 1, 1000, COLD_FOG_MS); // thaw → clear
    expect(mirrorVisual(rt[0]!, 2000)).toBe('clear');
    // precedence: frozen outranks a stale fog timer (constructed directly —
    // live play never overlaps them, the pin is for the one derivation)
    const frozenThenFog = { ...rt[0]!, frozen: true, foggedUntil: 1 };
    expect(mirrorVisual(frozenThenFog, 2000)).toBe('frozen');
    // captured outranks everything, frozen included
    applyFog(rt, 2, 1000, COLD_FOG_MS); // the beacon captures — it was never frozen
    expect(mirrorVisual(rt[1]!, 999_999)).toBe('captured');
    expect(rt[1]!.captured).toBe(true);
    expect(rt[1]!.frozen).toBe(false);
  });

  it('isFogged truth table: captured/frozen/fogged blind — thawed and clear sighted', () => {
    const rt = initMirrorRuntime(
      [m8(0, 'standing'), m8(1, 'standing'), m8(2, 'standing'), m8(3, 'standing')],
      { frozenSpawn: true },
    );
    expect(isFogged(rt[0]!, 1000)).toBe(true); // frozen
    applyFog(rt, 1, 1000, COLD_FOG_MS); // thawed
    expect(isFogged(rt[1]!, 1000)).toBe(false);
    applyFog(rt, 2, 1000, COLD_FOG_MS); // thaw then cold-fog
    applyFog(rt, 2, 2000, COLD_FOG_MS);
    expect(isFogged(rt[2]!, 3000)).toBe(true); // fogged
    applyFog(rt, 3, 1000, COLD_FOG_MS); // thawed…
    rt[3]!.frozen = false; // …then plain-timed fog: the tiers ≤ 7 path
    rt[3]!.thawed = false;
    rt[3]!.foggedUntil = 500;
    expect(isFogged(rt[3]!, 1000)).toBe(false); // expired fog + not thawed/frozen → clear
    expect(mirrorVisual(rt[3]!, 1000)).toBe('clear');
  });
});
