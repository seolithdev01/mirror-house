// SPDX-License-Identifier: Apache-2.0
//
// Flow fields: multi-source BFS distances over open maze edges, and the
// strictly-closer descent an Echo walks cell by cell. Pure grid math.
import { Dir, DIR_VECTOR, type CellIndex, type FloorGrid } from './grid';

const DIRS = [Dir.North, Dir.East, Dir.South, Dir.West] as const;

/** BFS distance of every cell from the nearest target (0 at targets);
 *  −1 where unreachable. */
export function buildFlowField(grid: FloorGrid, targets: CellIndex[]): Int32Array {
  const dist = new Int32Array(grid.width * grid.height).fill(-1);
  const queue: number[] = [];
  for (const t of targets) {
    if (!grid.inBounds(t.x, t.y)) continue;
    const i = t.y * grid.width + t.x;
    if (dist[i] !== -1) continue; // duplicate target — first wins
    dist[i] = 0;
    queue.push(i);
  }
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]!;
    const cx = cur % grid.width;
    const cy = Math.floor(cur / grid.width);
    for (const d of DIRS) {
      if (!grid.canWalk(cx, cy, d)) continue;
      const v = DIR_VECTOR[d]!;
      const n = (cy + v.dy) * grid.width + (cx + v.dx);
      if (dist[n] === -1) {
        dist[n] = dist[cur]! + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

/** Open-edge neighbor with the strictly smallest distance (first on ties,
 *  N→E→S→W order); null at the target, on unreachable cells, or when the only
 *  closer cells sit across a wall. */
export function flowStep(
  field: Int32Array,
  grid: FloorGrid,
  x: number,
  y: number,
): CellIndex | null {
  if (!grid.inBounds(x, y)) return null;
  const cur = field[y * grid.width + x]!;
  if (cur <= 0) return null; // target (0) or unreachable (−1): nothing to descend
  let best: CellIndex | null = null;
  let bestDist = cur;
  for (const d of DIRS) {
    if (!grid.canWalk(x, y, d)) continue;
    const v = DIR_VECTOR[d]!;
    const n = field[(y + v.dy) * grid.width + (x + v.dx)]!;
    if (n >= 0 && n < bestDist) {
      best = { x: x + v.dx, y: y + v.dy };
      bestDist = n;
    }
  }
  return best;
}
