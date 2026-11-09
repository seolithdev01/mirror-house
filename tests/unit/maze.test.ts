// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir } from '../../src/engine/grid';
import {
  bfsDistances,
  floorFromGrid,
  generateFloor,
  TIER_ONE,
  type FloorParams,
} from '../../src/game/maze';
import { DWAAR_LAYOUT, dwaarGrid } from '../../src/game/campaign';

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

describe('floorFromGrid (M4/T2 — hand-authored grids)', () => {
  it('builds the Dwaar hall: all 83 open cells reachable from the entrance', () => {
    const f = floorFromGrid(dwaarGrid(), 'DWAAR1');
    expect(f.seed).toBe('DWAAR1');
    expect(f.grid.width).toBe(13);
    expect(f.grid.height).toBe(13);
    const dist = bfsDistances(f.grid, f.entrance);
    expect(Array.from(dist).filter((d) => d >= 0).length).toBe(83);
  });

  it('entrance = first open cell row-major; exit = bfs-farthest — deterministic', () => {
    const a = floorFromGrid(dwaarGrid(), 'AAAA');
    const b = floorFromGrid(dwaarGrid(), 'BBBB'); // geometry is seed-independent
    expect(a.entrance).toEqual({ x: 1, y: 1 });
    expect(a.exit).toEqual({ x: 11, y: 11 }); // the 180° mirror of the entrance
    expect(a.exit).toEqual(b.exit);
    expect(a.entrance).toEqual(b.entrance);
    expect(a.grid.wallSegments()).toEqual(b.grid.wallSegments());
    const dist = bfsDistances(a.grid, a.entrance);
    expect(dist[a.exit.y * 13 + a.exit.x]).toBe(Math.max(...Array.from(dist)));
  });

  it('opens only shared edges between adjacent open cells — wall cells keep every wall', () => {
    const f = floorFromGrid(dwaarGrid(), 'CCCC');
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) {
        if (DWAAR_LAYOUT[y]![x] !== '#') continue;
        for (const d of [Dir.North, Dir.East, Dir.South, Dir.West])
          expect(f.grid.canWalk(x, y, d), `wall cell ${x},${y} dir ${d}`).toBe(false);
      }
  });
});
