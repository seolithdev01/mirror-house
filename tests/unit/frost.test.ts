// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
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
    applyFog(rt, 1, 1000);
    expect(isFogged(rt[0]!, 2000)).toBe(true);
    expect(isFogged(rt[0]!, 26001)).toBe(false);
    applyFog(rt, 2, 1000);
    expect(isFogged(rt[1]!, 999_999)).toBe(true);
    expect(rt[1]!.captured).toBe(true);
  });
  it('breath spends and recharges with clamp', () => {
    expect(updateBreath(1, 0, true)).toBeCloseTo(1 - FOG_COST);
    expect(updateBreath(0, 4, false)).toBeCloseTo(1);
    expect(updateBreath(0.99, 4, false)).toBe(1);
  });

  it('mirrorVisual: captured beats an unexpired fog; expired fog reads clear', () => {
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0), m(2, 'beacon', 0, 0)]);
    applyFog(rt, 1, 1000);
    expect(mirrorVisual(rt[0]!, 1000)).toBe('fogged');
    expect(mirrorVisual(rt[0]!, 26_001)).toBe('clear');
    applyFog(rt, 2, 1000);
    expect(mirrorVisual(rt[1]!, 999_999)).toBe('captured');
  });

  it('isFogged is exactly "not clear" — the two can never disagree', () => {
    const rt = initMirrorRuntime([m(1, 'standing', 0, 0)]);
    for (const now of [0, 999, 1000, 26_000, 26_001, 1e9]) {
      applyFog(rt, 1, 1000);
      expect(isFogged(rt[0]!, now)).toBe(mirrorVisual(rt[0]!, now) !== 'clear');
    }
    expect(isFogged(rt[0]!, 2000)).toBe(true);
  });
});
