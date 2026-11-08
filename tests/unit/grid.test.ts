// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Dir, FloorGrid } from '../../src/engine/grid';

describe('FloorGrid', () => {
  it('starts fully walled', () => {
    const g = new FloorGrid(15, 15);
    expect(g.hasWall(7, 7, Dir.North)).toBe(true);
    expect(g.hasWall(0, 0, Dir.West)).toBe(true);
  });

  it('setOpen removes the wall from both sides', () => {
    const g = new FloorGrid(15, 15);
    g.setOpen(2, 2, Dir.North);
    expect(g.hasWall(2, 2, Dir.North)).toBe(false);
    expect(g.hasWall(2, 1, Dir.South)).toBe(false);
    expect(g.hasWall(2, 2, Dir.East)).toBe(true);
  });

  it('neighborIndex returns null out of bounds', () => {
    const g = new FloorGrid(5, 5);
    expect(g.neighborIndex(0, 0, Dir.West)).toBeNull();
    expect(g.neighborIndex(0, 0, Dir.South)).toEqual({ x: 0, y: 1 });
  });

  it('canWalk requires neighbor and no wall', () => {
    const g = new FloorGrid(5, 5);
    expect(g.canWalk(0, 0, Dir.North)).toBe(false); // out of bounds
    expect(g.canWalk(2, 2, Dir.East)).toBe(false); // wall
    g.setOpen(2, 2, Dir.East);
    expect(g.canWalk(2, 2, Dir.East)).toBe(true);
  });

  it('15x15 all-walls has 480 unique segments; opening one shared wall removes one', () => {
    const g = new FloorGrid(15, 15);
    expect(g.wallSegments()).toHaveLength(480); // 15*16 horizontal + 16*15 vertical
    g.setOpen(2, 2, Dir.North);
    expect(g.wallSegments()).toHaveLength(479);
  });

  it('cellCenter puts origin at grid center; cellAt inverts it', () => {
    const g = new FloorGrid(5, 5);
    const { cx, cy } = g.cellCenter(2, 2);
    expect(cx).toBeCloseTo(0);
    expect(cy).toBeCloseTo(0);
    expect(g.cellCenter(0, 0).cx).toBeCloseTo(-8);
    expect(g.cellAt(-8, 0)).toEqual({ x: 0, y: 2 });
  });

  it('deadEndCount counts cells with exactly 3 walls', () => {
    const g = new FloorGrid(3, 3);
    g.setOpen(1, 1, Dir.North);
    expect(g.deadEndCount()).toBe(2); // (1,1) and (1,0) each have exactly 3 walls
    g.setOpen(1, 1, Dir.South);
    expect(g.deadEndCount()).toBe(2); // (1,0) and (1,2) have 3 walls; (1,1) has 2
  });
});
