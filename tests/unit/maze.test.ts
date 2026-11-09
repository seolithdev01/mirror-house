// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { bfsDistances, generateFloor, TIER_ONE, type FloorParams } from '../../src/game/maze';

const params = (seed: string, over: Partial<FloorParams> = {}): FloorParams => ({
  ...TIER_ONE,
  seed,
  ...over,
});

describe('generateFloor', () => {
  it('is deterministic for a seed', () => {
    const a = generateFloor(params('AAAA'));
    const b = generateFloor(params('AAAA'));
    expect(a.entrance).toEqual(b.entrance);
    expect(a.exit).toEqual(b.exit);
    expect(a.grid.wallSegments()).toEqual(b.grid.wallSegments());
  });

  it('produces different layouts for different seeds', () => {
    const a = generateFloor(params('AAAA'));
    const b = generateFloor(params('BBBB'));
    expect(a.grid.wallSegments()).not.toEqual(b.grid.wallSegments());
  });

  it('every cell is reachable from the entrance', () => {
    const f = generateFloor(params('CCCC'));
    const dist = bfsDistances(f.grid, f.entrance);
    expect(Array.from(dist).every((d) => d >= 0)).toBe(true);
  });

  it('exit is the farthest cell from the entrance', () => {
    const f = generateFloor(params('CCCC'));
    const dist = bfsDistances(f.grid, f.entrance);
    const max = Math.max(...Array.from(dist));
    const i = f.exit.y * f.grid.width + f.exit.x;
    expect(dist[i]).toBe(max);
  });

  it('braiding strictly reduces dead ends (same seed)', () => {
    const tight = generateFloor(params('DDDD', { braid: 0 }));
    const loose = generateFloor(params('DDDD', { braid: 0.5 }));
    expect(loose.grid.deadEndCount()).toBeLessThan(tight.grid.deadEndCount());
  });

  it('respects dimensions', () => {
    const f = generateFloor(params('EEEE', { width: 9, height: 7 }));
    expect(f.grid.width).toBe(9);
    expect(f.grid.height).toBe(7);
  });
});
