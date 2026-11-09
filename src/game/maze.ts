// SPDX-License-Identifier: Apache-2.0
import { createRng, type Rng } from '../engine/rng';
import { Dir, FloorGrid, DIR_VECTOR, type CellIndex } from '../engine/grid';

export interface FloorParams {
  seed: string;
  width: number;
  height: number;
  braid: number;
  rooms: number;
  roomMin: number;
  roomMax: number;
}

export interface Floor {
  seed: string;
  grid: FloorGrid;
  entrance: CellIndex;
  exit: CellIndex;
}

export const TIER_ONE: FloorParams = {
  seed: '',
  width: 15,
  height: 15,
  braid: 0.15,
  rooms: 3,
  roomMin: 2,
  roomMax: 4,
};

export function bfsDistances(grid: FloorGrid, start: CellIndex): Int32Array {
  const dist = new Int32Array(grid.width * grid.height).fill(-1);
  dist[start.y * grid.width + start.x] = 0;
  const queue: number[] = [start.y * grid.width + start.x];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cx = cur % grid.width;
    const cy = Math.floor(cur / grid.width);
    for (const d of [Dir.North, Dir.East, Dir.South, Dir.West]) {
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

function carveBacktracker(grid: FloorGrid, start: CellIndex, rng: Rng): void {
  const visited = new Uint8Array(grid.width * grid.height);
  visited[start.y * grid.width + start.x] = 1;
  const stack: CellIndex[] = [start];
  while (stack.length > 0) {
    const cur = stack[stack.length - 1]!;
    const closed: Dir[] = [];
    for (const d of [Dir.North, Dir.East, Dir.South, Dir.West]) {
      const n = grid.neighborIndex(cur.x, cur.y, d);
      if (n && visited[n.y * grid.width + n.x] === 0) closed.push(d);
    }
    if (closed.length === 0) {
      stack.pop();
      continue;
    }
    const dir = rng.pick(closed);
    grid.setOpen(cur.x, cur.y, dir);
    const next = grid.neighborIndex(cur.x, cur.y, dir)!;
    visited[next.y * grid.width + next.x] = 1;
    stack.push(next);
  }
}

function braidDeadEnds(grid: FloorGrid, braid: number, rng: Rng): void {
  if (braid <= 0) return;
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      let open = 0;
      for (const d of [Dir.North, Dir.East, Dir.South, Dir.West])
        if (!grid.hasWall(x, y, d)) open++;
      if (open !== 1 || !rng.chance(braid)) continue;
      const candidates = ([Dir.North, Dir.East, Dir.South, Dir.West] as Dir[]).filter(
        (d) => grid.hasWall(x, y, d) && grid.neighborIndex(x, y, d) !== null,
      );
      if (candidates.length > 0) grid.setOpen(x, y, rng.pick(candidates));
    }
}

function carveRooms(grid: FloorGrid, rooms: number, min: number, max: number, rng: Rng): void {
  for (let r = 0; r < rooms; r++) {
    const w = min + rng.int(max - min + 1);
    const h = min + rng.int(max - min + 1);
    const x0 = rng.int(grid.width - w + 1);
    const y0 = rng.int(grid.height - h + 1);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (x + 1 < x0 + w) grid.setOpen(x, y, Dir.East);
        if (y + 1 < y0 + h) grid.setOpen(x, y, Dir.South);
      }
  }
}

export function generateFloor(params: FloorParams): Floor {
  const rng = createRng(params.seed);
  const grid = new FloorGrid(params.width, params.height);
  const entrance: CellIndex = { x: rng.int(params.width), y: rng.int(params.height) };
  carveBacktracker(grid, entrance, rng);
  braidDeadEnds(grid, params.braid, rng);
  carveRooms(grid, params.rooms, params.roomMin, params.roomMax, rng);
  return { seed: params.seed, grid, entrance, exit: farthestCell(grid, entrance) };
}

/** A hand-authored floor layout: board size plus its open cells, row-major
 *  (the first open cell is the entrance by convention). */
export interface GridLayout {
  width: number;
  height: number;
  open: ReadonlyArray<CellIndex>;
}

/** The bfs-farthest reachable cell from `start` — the exit picker both floor
 *  paths share (ties break toward the lowest index, so it is deterministic). */
export function farthestCell(grid: FloorGrid, start: CellIndex): CellIndex {
  const dist = bfsDistances(grid, start);
  let bestIdx = 0;
  for (let i = 1; i < dist.length; i++) if (dist[i]! > dist[bestIdx]!) bestIdx = i;
  return { x: bestIdx % grid.width, y: Math.floor(bestIdx / grid.width) };
}

/** Floor from a hand-authored open-cell layout (the Dwaar threshold halls):
 *  an all-walls grid with the shared edge between two adjacent open cells
 *  opened — a wall cell keeps every wall — entrance = first open cell
 *  row-major, exit = the bfs-farthest cell from it (same picker as
 *  generateFloor). No rng: the layout IS the floor. */
export function floorFromGrid(layout: GridLayout, seed: string): Floor {
  const grid = new FloorGrid(layout.width, layout.height);
  const open = new Set(layout.open.map((c) => c.y * layout.width + c.x));
  for (const c of layout.open) {
    for (const d of [Dir.East, Dir.South] as const) {
      const n = grid.neighborIndex(c.x, c.y, d);
      if (n && open.has(n.y * layout.width + n.x)) grid.setOpen(c.x, c.y, d);
    }
  }
  const entrance = layout.open[0]!;
  return { seed, grid, entrance, exit: farthestCell(grid, entrance) };
}
