// SPDX-License-Identifier: Apache-2.0
//
// Pure grid line-of-sight: DDA (Amanatides–Woo) cell traversal. The ray is
// clear iff every cell boundary it crosses is an open maze edge. Corner ties —
// the ray passing exactly through a shared corner — cross one axis at a time,
// so a diagonal peek around a walled corner is blocked, matching the
// wall-plane collision the player feels.
import { CELL_SIZE } from './constants';
import { Dir, type FloorGrid } from './grid';

export function losClear(grid: FloorGrid, x0: number, y0: number, x1: number, y1: number): boolean {
  const start = grid.cellAt(x0, y0);
  const end = grid.cellAt(x1, y1);
  let cx = start.x;
  let cy = start.y;
  if (cx === end.x && cy === end.y) return true;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  // World coordinate of the first boundary ahead on each axis (grid boundary
  // index i sits at (i − width/2)·CELL_SIZE), as ray parameter t ∈ (0, 1).
  const boundaryX = ((stepX > 0 ? cx + 1 : cx) - grid.width / 2) * CELL_SIZE;
  const boundaryY = ((stepY > 0 ? cy + 1 : cy) - grid.height / 2) * CELL_SIZE;
  let tMaxX = dx !== 0 ? (boundaryX - x0) / dx : Infinity;
  let tMaxY = dy !== 0 ? (boundaryY - y0) / dy : Infinity;
  const tDeltaX = dx !== 0 ? Math.abs(CELL_SIZE / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(CELL_SIZE / dy) : Infinity;

  for (;;) {
    if (cx === end.x && cy === end.y) return true;
    const px = cx;
    const py = cy;
    if (tMaxX < tMaxY) {
      cx += stepX;
      tMaxX += tDeltaX;
      if (grid.hasWall(px, py, stepX > 0 ? Dir.East : Dir.West)) return false;
    } else {
      cy += stepY;
      tMaxY += tDeltaY;
      if (grid.hasWall(px, py, stepY > 0 ? Dir.South : Dir.North)) return false;
    }
    if (!grid.inBounds(cx, cy)) return false; // numeric escape from the grid — call it blocked
  }
}
