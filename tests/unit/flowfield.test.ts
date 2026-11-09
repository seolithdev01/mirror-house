// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import { buildFlowField, flowStep } from '../../src/engine/flowField';

// 5x5 grid, cell index i = y*5 + x.
const openRow = (g: FloorGrid, y: number): void => {
  for (let x = 0; x < g.width - 1; x++) g.setOpen(x, y, Dir.East);
};

describe('buildFlowField', () => {
  it('BFS distances from the target; unreachable cells stay -1', () => {
    const g = new FloorGrid(5, 5);
    openRow(g, 2); // only row 2 is walkable
    const f = buildFlowField(g, [{ x: 4, y: 2 }]);
    expect(f[2 * 5 + 4]).toBe(0); // target
    expect(f[2 * 5 + 3]).toBe(1);
    expect(f[2 * 5 + 0]).toBe(4);
    expect(f[0 * 5 + 0]).toBe(-1); // row 0 is walled off
    expect(f[4 * 5 + 2]).toBe(-1);
  });

  it('multiple targets take the minimum distance', () => {
    const g = new FloorGrid(5, 5);
    openRow(g, 2);
    const f = buildFlowField(g, [
      { x: 0, y: 2 },
      { x: 4, y: 2 },
    ]);
    expect(f[2 * 5 + 0]).toBe(0);
    expect(f[2 * 5 + 4]).toBe(0);
    expect(f[2 * 5 + 2]).toBe(2); // equidistant from both sources
  });
});

describe('flowStep', () => {
  it('descends strictly toward the target and stops there', () => {
    const g = new FloorGrid(5, 5);
    openRow(g, 2);
    const f = buildFlowField(g, [{ x: 4, y: 2 }]);
    expect(flowStep(f, g, 0, 2)).toEqual({ x: 1, y: 2 });
    expect(flowStep(f, g, 3, 2)).toEqual({ x: 4, y: 2 });
    expect(flowStep(f, g, 4, 2)).toBeNull(); // at the target: nothing strictly closer
    expect(flowStep(f, g, 0, 0)).toBeNull(); // unreachable cell
  });

  it('never steps across a wall even when the far side is closer', () => {
    // rows 2 and 3 are separate corridors joined only at x=0; target sits in
    // row 3 directly south of the probe cell — closer, but across a wall.
    const g = new FloorGrid(5, 5);
    openRow(g, 2);
    openRow(g, 3);
    g.setOpen(0, 2, Dir.South);
    const f = buildFlowField(g, [{ x: 4, y: 3 }]);
    expect(f[2 * 5 + 4]).toBe(9); // 4 west + 1 south + 4 east around the join
    expect(flowStep(f, g, 4, 2)).toEqual({ x: 3, y: 2 }); // west, not through the wall
  });
});
