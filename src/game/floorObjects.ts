// SPDX-License-Identifier: Apache-2.0
//
// Deterministic floor-object placement (M2). Pure logic — no three.js imports:
// the wall-mount geometry convention of game/mirror.ts `mirrorSpots` is
// reimplemented here as `mirrorSpotFor` so renderers (T3/T4) and AI (T7) can
// consume the exact same spots without dragging rendering code into placement.
import { createRng } from '../engine/rng';
import { Dir, DIR_VECTOR, type FloorGrid } from '../engine/grid';
import { CELL_SIZE } from '../engine/constants';
import { bfsDistances, type Floor } from './maze';

export type MirrorKind = 'standing' | 'beacon' | 'true' | 'silvered';

export interface MirrorRef {
  id: number;
  kind: MirrorKind;
  x: number;
  z: number;
  rotY: number;
  cellX: number;
  cellY: number;
  pairId: number | null;
}

export interface FloorObjects {
  mirrors: MirrorRef[];
  echoSpawns: Array<{ x: number; y: number }>;
  patrolAnchors: Array<{ x: number; y: number }>;
}

export interface M2Params {
  standing: number;
  beacons: number;
  echoes: number;
  anchors: number;
}

export const M2_PARAMS: M2Params = { standing: 6, beacons: 3, echoes: 4, anchors: 6 };

export interface MirrorSpot {
  x: number;
  z: number;
  rotY: number;
  dir: Dir;
}

/**
 * Wall-mount geometry for one cell: first walled direction (N,E,S,W — same
 * convention as mirror.ts `mirrorSpots`), offset `CELL_SIZE/2 − 0.12` along
 * that dir, plane facing back into the cell. Returns null when the cell has no
 * walls at all (fully carved room interior).
 */
export function mirrorSpotFor(grid: FloorGrid, x: number, y: number): MirrorSpot | null {
  for (const d of [Dir.North, Dir.East, Dir.South, Dir.West] as const) {
    if (grid.hasWall(x, y, d)) {
      const { cx, cy } = grid.cellCenter(x, y);
      const v = DIR_VECTOR[d]!;
      return {
        x: cx + v.dx * (CELL_SIZE / 2 - 0.12),
        z: cy + v.dy * (CELL_SIZE / 2 - 0.12),
        rotY: Math.atan2(-v.dx, -v.dy), // plane normal (+z rotated) faces back into the cell
        dir: d,
      };
    }
  }
  return null;
}

interface Candidate {
  x: number;
  y: number;
  dist: number; // bfs distance from the entrance
  spot: MirrorSpot;
}

const key = (x: number, y: number): string => `${x},${y}`;
const chebyshev = (a: Candidate, b: Candidate): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const manhattan = (a: Candidate, b: Candidate): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Deterministic placement of all M2 floor objects from
 * `createRng(floor.seed + ':objects')`. Same floor + params → same result,
 * guaranteed: every random draw comes from one rng consumed in a fixed order
 * (standing shuffle → echo shuffle → anchor shuffle).
 *
 * Edge cases (degenerate tiny grids): every pool below may hold fewer cells
 * than the parameter asks for — we then simply place what exists and never
 * throw (`slice` clamps; no `rng.pick` on possibly-empty arrays).
 */
export function generateFloorObjects(floor: Floor, params: M2Params = M2_PARAMS): FloorObjects {
  const { grid } = floor;
  const rng = createRng(`${floor.seed}:objects`);
  const dist = bfsDistances(grid, floor.entrance);
  const special = new Set([
    key(floor.entrance.x, floor.entrance.y),
    key(floor.exit.x, floor.exit.y),
  ]);

  // Rule 1: candidate cells with >= 1 wall (i.e. a mountable spot), excluding
  // entrance/exit. Order: bfs distance from entrance descending, ties broken
  // by row then column — the canonical order all picks below walk.
  const candidates: Candidate[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (special.has(key(x, y))) continue;
      const spot = mirrorSpotFor(grid, x, y);
      if (!spot) continue;
      candidates.push({ x, y, dist: dist[y * grid.width + x] ?? -1, spot });
    }
  }
  candidates.sort((a, b) => b.dist - a.dist || a.y - b.y || a.x - b.x);

  const mirrors: MirrorRef[] = [];
  const used = new Set<string>();
  const place = (c: Candidate, kind: MirrorKind, pairId: number | null = null): number => {
    const id = mirrors.length;
    mirrors.push({
      id,
      kind,
      x: c.spot.x,
      z: c.spot.z,
      rotY: c.spot.rotY,
      cellX: c.x,
      cellY: c.y,
      pairId,
    });
    used.add(key(c.x, c.y));
    return id;
  };
  const remaining = (): Candidate[] => candidates.filter((c) => !used.has(key(c.x, c.y)));

  // Rule 2: beacons — far half of the candidates (sorted list above), greedy
  // picks >= 4 cells apart (Chebyshev). On tiny grids strict spacing may be
  // impossible; we then relax to "as spread as possible" by greedily adding
  // the candidate that maximizes its Chebyshev distance to the nearest
  // already-placed beacon (test seeds stay on 15x15 where strict holds).
  const farHalf = candidates.slice(0, Math.ceil(candidates.length / 2));
  const beaconCells: Candidate[] = [];
  for (const c of farHalf) {
    if (beaconCells.length >= params.beacons) break;
    if (beaconCells.every((b) => chebyshev(b, c) >= 4)) beaconCells.push(c);
  }
  while (beaconCells.length < params.beacons) {
    let best: Candidate | null = null;
    let bestScore = -1;
    for (const c of farHalf) {
      if (used.has(key(c.x, c.y)) || beaconCells.includes(c)) continue;
      const score = Math.min(...beaconCells.map((b) => chebyshev(b, c)));
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (!best) break; // pool exhausted — place what exists
    beaconCells.push(best);
  }
  for (const c of beaconCells) place(c, 'beacon');

  // Rule 3: true pair — among remaining candidates, the pair with maximal
  // Manhattan cell distance (O(n^2) is fine at <= ~200 cells). Ids i and i+1
  // reference each other via pairId. First pair found wins ties (deterministic
  // because candidate order is fixed).
  {
    const pool = remaining();
    let bi = -1;
    let bj = -1;
    let bestD = -1;
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const d = manhattan(pool[i]!, pool[j]!);
        if (d > bestD) {
          bestD = d;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi >= 0 && bj >= 0) {
      const idA = place(pool[bi]!, 'true');
      const idB = place(pool[bj]!, 'true');
      mirrors[idA]!.pairId = idB;
      mirrors[idB]!.pairId = idA;
    }
  }

  // Rule 4: silvered — first remaining candidate whose chosen wall edge leads
  // to an in-bounds neighbor (an interior edge; the maze is fully connected,
  // so opening it would join two entrance-reachable cells). If none qualifies
  // (degenerate grid where every candidate mounts on the outer boundary),
  // gracefully fall back to the first remaining candidate.
  {
    const pool = remaining();
    const c = pool.find((p) => grid.neighborIndex(p.x, p.y, p.spot.dir) !== null) ?? pool[0];
    if (c) place(c, 'silvered');
  }

  // Rule 5: standing — rng-shuffled leftovers, first `standing`. No cell
  // sharing is guaranteed by construction: every pick removes its cell.
  for (const c of rng.shuffle(remaining()).slice(0, params.standing)) place(c, 'standing');

  // Rule 6: echo spawns — rng-pick cells at bfs distance >= 6 from the
  // entrance, never the entrance/exit. Spawns/anchors are plain cell centers.
  const echoPool: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (special.has(key(x, y))) continue;
      if ((dist[y * grid.width + x] ?? -1) >= 6) {
        const { cx, cy } = grid.cellCenter(x, y);
        echoPool.push({ x: cx, y: cy });
      }
    }
  }
  const echoSpawns = rng.shuffle(echoPool).slice(0, params.echoes);

  // Rule 7: patrol anchors — rng-pick any entrance-reachable cell (the maze is
  // fully connected, so effectively any cell; the dist filter keeps it honest).
  const anchorPool: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if ((dist[y * grid.width + x] ?? -1) >= 0) {
        const { cx, cy } = grid.cellCenter(x, y);
        anchorPool.push({ x: cx, y: cy });
      }
    }
  }
  const patrolAnchors = rng.shuffle(anchorPool).slice(0, params.anchors);

  return { mirrors, echoSpawns, patrolAnchors };
}
