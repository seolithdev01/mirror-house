// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';
import { losClear } from '../../src/engine/los';

// 5x5, CELL_SIZE=4: cell (x,y) center = ((x-2)*4, (y-2)*4); row y=2's open
// corridor runs along world y=0; edges sit at (i-2.5)*4 for boundary index i.
const openRow = (g: FloorGrid, y: number): void => {
  for (let x = 0; x < g.width - 1; x++) g.setOpen(x, y, Dir.East);
};
const openCol = (g: FloorGrid, x: number): void => {
  for (let y = 0; y < g.height - 1; y++) g.setOpen(x, y, Dir.South);
};

describe('losClear', () => {
  it('same cell → clear, including a zero-length ray', () => {
    const g = new FloorGrid(5, 5);
    expect(losClear(g, -8.1, -8.2, -7.9, -7.8)).toBe(true);
    expect(losClear(g, -8, -8, -8, -8)).toBe(true);
  });

  it('wall between adjacent cells → blocked', () => {
    const g = new FloorGrid(5, 5); // fresh grid: every edge walled
    expect(losClear(g, -8, -8, -4, -8)).toBe(false); // (0,0) → (1,0) across East wall
    expect(losClear(g, -8, -8, -8, -4)).toBe(false); // (0,0) → (0,1) across South wall
  });

  it('open corridor → clear along the full row and column, both directions', () => {
    const g = new FloorGrid(5, 5);
    openRow(g, 2);
    expect(losClear(g, -8, 0, 8, 0)).toBe(true);
    expect(losClear(g, 8, 0, -8, 0)).toBe(true);
    openCol(g, 0);
    expect(losClear(g, -8, -8, -8, 8)).toBe(true);
    expect(losClear(g, -8, 8, -8, -8)).toBe(true);
  });

  it('corridor with one closed edge → blocked exactly there', () => {
    const g = new FloorGrid(5, 5);
    g.setOpen(0, 2, Dir.East);
    g.setOpen(1, 2, Dir.East);
    g.setOpen(3, 2, Dir.East); // (2,2)|(3,2) stays walled
    expect(losClear(g, -8, 0, 0, 0)).toBe(true); // up to the closed edge's near side
    expect(losClear(g, -8, 0, 4, 0)).toBe(false); // ends inside (3,2), crosses the wall
    expect(losClear(g, -8, 0, 8, 0)).toBe(false);
  });

  it('corner-diagonal rays respect corner walls', () => {
    const g = new FloorGrid(5, 5);
    // center-to-center diagonal passes exactly through the shared corner; both
    // straight edges are walled, so there is no peeking through corners
    expect(losClear(g, -8, -8, -4, -4)).toBe(false);
    // clip the corner just east of the tie: crossings are (0,0)E then (1,0)S
    expect(losClear(g, -8, -8, -4, -4.4)).toBe(false);
    g.setOpen(0, 0, Dir.East);
    expect(losClear(g, -8, -8, -4, -4.4)).toBe(false); // (1,0)S still walled
    g.setOpen(1, 0, Dir.South);
    expect(losClear(g, -8, -8, -4, -4.4)).toBe(true);
  });

  it('diagonal across a fully open room → clear', () => {
    const g = new FloorGrid(5, 5);
    g.setOpen(0, 0, Dir.East);
    g.setOpen(0, 0, Dir.South);
    g.setOpen(1, 0, Dir.South);
    g.setOpen(0, 1, Dir.East);
    expect(losClear(g, -8, -8, -4, -4)).toBe(true);
  });
});
