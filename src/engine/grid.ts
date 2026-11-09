// SPDX-License-Identifier: Apache-2.0
import { CELL_SIZE } from './constants';

export const enum Dir {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}
export const WALL_BIT: readonly number[] = [1, 2, 4, 8]; // bit per Dir
export const OPPOSITE: readonly Dir[] = [Dir.South, Dir.West, Dir.North, Dir.East];
export const DIR_VECTOR: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export interface CellIndex {
  x: number;
  y: number;
}
export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class FloorGrid {
  readonly width: number;
  readonly height: number;
  private readonly walls: Uint8Array;
  private segCache: WallSegment[] | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.walls = new Uint8Array(width * height).fill(0b1111);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private idx(x: number, y: number): number {
    return y * this.width + x;
  }

  hasWall(x: number, y: number, dir: Dir): boolean {
    return (this.walls[this.idx(x, y)]! & WALL_BIT[dir]!) !== 0;
  }

  private setWallBit(x: number, y: number, dir: Dir, present: boolean): void {
    const i = this.idx(x, y);
    const bit = WALL_BIT[dir]!;
    this.walls[i] = present ? this.walls[i]! | bit : this.walls[i]! & ~bit;
    this.segCache = null;
  }

  setOpen(x: number, y: number, dir: Dir): void {
    const n = this.neighborIndex(x, y, dir);
    if (!n) throw new Error(`no neighbor ${x},${y} dir ${dir}`);
    this.setWallBit(x, y, dir, false);
    this.setWallBit(n.x, n.y, OPPOSITE[dir]!, false);
  }

  neighborIndex(x: number, y: number, dir: Dir): CellIndex | null {
    const v = DIR_VECTOR[dir]!;
    const nx = x + v.dx,
      ny = y + v.dy;
    return this.inBounds(nx, ny) ? { x: nx, y: ny } : null;
  }

  canWalk(x: number, y: number, dir: Dir): boolean {
    const n = this.neighborIndex(x, y, dir);
    return n !== null && !this.hasWall(x, y, dir);
  }

  deadEndCount(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        let open = 0;
        for (const d of [Dir.North, Dir.East, Dir.South, Dir.West])
          if (!this.hasWall(x, y, d)) open++;
        if (open === 1) count++;
      }
    return count;
  }

  cellCenter(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: (x - (this.width - 1) / 2) * CELL_SIZE,
      cy: (y - (this.height - 1) / 2) * CELL_SIZE,
    };
  }

  cellAt(px: number, py: number): CellIndex {
    const x = Math.min(this.width - 1, Math.max(0, Math.floor(px / CELL_SIZE + this.width / 2)));
    const y = Math.min(this.height - 1, Math.max(0, Math.floor(py / CELL_SIZE + this.height / 2)));
    return { x, y };
  }

  /** Unique wall edges: N and W per cell, plus E on last column and S on last row.
   *  Cached — invalidated on any wall mutation via setWallBit. */
  wallSegments(): WallSegment[] {
    return (this.segCache ??= this.buildSegments());
  }

  private buildSegments(): WallSegment[] {
    const segs: WallSegment[] = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const { cx, cy } = this.cellCenter(x, y);
        const left = cx - CELL_SIZE / 2,
          right = cx + CELL_SIZE / 2;
        const top = cy - CELL_SIZE / 2,
          bottom = cy + CELL_SIZE / 2;
        if (this.hasWall(x, y, Dir.North)) segs.push({ x1: left, y1: top, x2: right, y2: top });
        if (this.hasWall(x, y, Dir.West)) segs.push({ x1: left, y1: top, x2: left, y2: bottom });
        if (x === this.width - 1 && this.hasWall(x, y, Dir.East))
          segs.push({ x1: right, y1: top, x2: right, y2: bottom });
        if (y === this.height - 1 && this.hasWall(x, y, Dir.South))
          segs.push({ x1: left, y1: bottom, x2: right, y2: bottom });
      }
    return segs;
  }

  wallSegmentsNearCells(gx: number, gy: number): WallSegment[] {
    const all = this.wallSegments();
    return all.filter((s) => {
      const midX = (s.x1 + s.x2) / 2,
        midY = (s.y1 + s.y2) / 2;
      const c = this.cellAt(midX, midY);
      return Math.abs(c.x - gx) <= 1 && Math.abs(c.y - gy) <= 1;
    });
  }
}
