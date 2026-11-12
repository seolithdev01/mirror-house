// SPDX-License-Identifier: Apache-2.0
//
// Deterministic floor-object placement (M2). Pure logic — no three.js imports:
// the wall-mount geometry convention of game/mirror.ts `mirrorSpots` is
// reimplemented here as `mirrorSpotFor` so renderers (T3/T4) and AI (T7) can
// consume the exact same spots without dragging rendering code into placement.
import { createRng } from '../engine/rng';
import { Dir, DIR_VECTOR, type FloorGrid } from '../engine/grid';
import { CELL_SIZE, DISTORT_MAX_CELLS } from '../engine/constants';
import { bfsDistances, type Floor } from './maze';

export type MirrorKind = 'standing' | 'beacon' | 'true' | 'silvered' | 'portrait' | 'distort';

export interface MirrorRef {
  id: number;
  kind: MirrorKind;
  x: number;
  z: number;
  rotY: number;
  cellX: number;
  cellY: number;
  pairId: number | null;
  /** The wall edge this object covers as a door (T7): standing/silvered mount
   *  on a wall and carry their dir; beacon/true/portrait/distort never open
   *  anything — null (portraits and carnival glass mount on a wall like
   *  standing glass, but open nothing). */
  wallDir: Dir | null;
  /** T4/T3 — the carnival glass's fixed lie: the apparent-position delta in
   *  CELLS (axis-aligned, 1..DISTORT_MAX_CELLS on exactly one axis), derived
   *  per-id deterministically by `distortDelta` — the same id lies the same
   *  way on every floor, no rng draw. Present only on kind 'distort'. */
  distortDx?: number;
  distortDy?: number;
}

/** The fixed lie one carnival pane tells: axis-aligned (exactly one axis
 *  carries it), magnitude 1..DISTORT_MAX_CELLS cells, derived purely from the
 *  mirror's id — bit 0 picks the axis, bit 1 the sign, bit 2 the extra cell —
 *  so the delta is stable across floors, rebuilds and saves (the placement
 *  counterpart of portraitSpec's per-id silhouette). Never zero: a distort
 *  mirror that told the truth would be a standing mirror. */
export function distortDelta(id: number): { dx: number; dy: number } {
  const axisX = id % 2 === 0;
  const sign = (id >> 1) % 2 === 0 ? 1 : -1;
  const mag = 1 + (Math.floor(id / 4) % DISTORT_MAX_CELLS); // 1..2 cells
  return axisX ? { dx: sign * mag, dy: 0 } : { dx: 0, dy: sign * mag };
}

export interface FloorObjects {
  mirrors: MirrorRef[];
  echoSpawns: Array<{ x: number; y: number }>;
  patrolAnchors: Array<{ x: number; y: number }>;
  /** T3 — the Gardens' standing water: WORLD cell centers of the pools
   *  (2–4 per tier-3 floor). Cell features, NOT MirrorRefs — the frost
   *  lantern never sees them; echo senses + the ripple own them (water.ts). */
  water: Array<{ x: number; y: number }>;
}

export interface M2Params {
  standing: number;
  beacons: number;
  echoes: number;
  anchors: number;
  /** T2 — the FLOOR of the portrait count: the rng flips one coin on top of
   *  it, so a tier-2 ask of 2 places 2–3 ancestor portraits. Zero (the
   *  default, all tier-1 floors) draws nothing — the rng stream stays
   *  byte-identical to the M2 order. */
  portraits: number;
  /** T3 — the FLOOR of the pool count: the rng rolls `waterRoll` on top of
   *  it, so a tier-3 ask of 2 places 2–4 standing pools. Zero (the default,
   *  tiers 1–2 and venues) draws nothing — the rng stream stays
   *  byte-identical to the M2/T2 order. */
  water: number;
  /** T9 — the size of the pool-count roll on top of `water`: the Gardens
   *  roll int(3) (a tier-3 ask of 2 places 2–4 pools), the Warrens roll
   *  int(2) (2–3 — the warren's water is thinner than the Gardens'). The
   *  default 3 (M2_PARAMS) keeps every pre-T9 caller — and therefore every
   *  floors 1–80 rng stream — byte-identical. */
  waterRoll: number;
  /** T4 — the FLOOR of the carnival-glass count: the rng flips one coin on
   *  top of it, so a tier-4 ask of 2 places 2–3 distorting mirrors. Zero
   *  (the default, tiers 1–3 and venues) draws nothing — the stream stays
   *  byte-identical to the M2/T2/T3 order (distort draws LAST-LAST). */
  distort: number;
}

export const M2_PARAMS: M2Params = {
  standing: 6,
  beacons: 3,
  echoes: 4,
  anchors: 6,
  portraits: 0,
  water: 0,
  waterRoll: 3,
  distort: 0,
};

/** The tier's TEXTURE ask (T9/T2 — the rng-gated kinds, pure derivation: tier
 *  in, counts out). This is the mapping the floor builder spreads over
 *  M2_PARAMS: the Hall of Ancestors hangs 2–3 ancestor portraits (tier 2),
 *  the Reflecting Gardens pool 2–4 standing pools (tier 3, the int(3) roll),
 *  the Carnival of Faces mounts 2–3 distorting panes (tier 4) — and, since
 *  T9, the Warden's Warrens pool the Gardens' water THINNED (2–3, the
 *  waterRoll-2 roll) and hang the Carnival's glass THINNED (1–2 panes, the
 *  ask of 1). Every other tier — and every venue side-floor — draws nothing,
 *  so the floors 1–80 rng streams stay byte-identical (the tier-9 draws are
 *  new-floor-only; the floors 1–80 sweep in floorobjects.test.ts pins it). */
export function textureParamsForTier(tier: number): {
  portraits: number;
  water: number;
  waterRoll: number;
  distort: number;
} {
  if (tier === 2) return { portraits: 2, water: 0, waterRoll: 3, distort: 0 };
  if (tier === 3) return { portraits: 0, water: 2, waterRoll: 3, distort: 0 };
  if (tier === 4) return { portraits: 0, water: 0, waterRoll: 3, distort: 2 };
  if (tier === 9) return { portraits: 0, water: 2, waterRoll: 2, distort: 1 };
  return { portraits: 0, water: 0, waterRoll: 3, distort: 0 };
}

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
 * (standing shuffle → [portraits: count coin + shuffle, only when
 * params.portraits > 0] → echo shuffle → anchor shuffle → [water: count
 * coin + shuffle, only when params.water > 0] → [distort: count coin +
 * shuffle, only when params.distort > 0 — LAST-LAST, so the carnival draws
 * append to the stream and never perturb the tier-1/2/3 order]).
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
    const delta = kind === 'distort' ? distortDelta(id) : null;
    mirrors.push({
      id,
      kind,
      x: c.spot.x,
      z: c.spot.z,
      rotY: c.spot.rotY,
      cellX: c.x,
      cellY: c.y,
      pairId,
      wallDir: kind === 'standing' || kind === 'silvered' ? c.spot.dir : null,
      ...(delta ? { distortDx: delta.dx, distortDy: delta.dy } : {}),
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

  // Rule 5.5 (T2): ancestor portraits — the tier-2 halls' dim glass. The
  // count is the rng's call (the param is the floor of the range, one coin
  // adds a third), then a shuffle of whatever cells the standing glass left.
  // Draws happen ONLY when portraits > 0, so tier-1/venue floors keep the
  // exact M2 rng stream — their experience is byte-identical.
  if (params.portraits > 0) {
    const count = params.portraits + rng.int(2); // 2→2–3
    for (const c of rng.shuffle(remaining()).slice(0, count)) place(c, 'portrait');
  }

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

  // Rule 8 (T3, T9/T2): the standing water. Pools are CELL features picked
  // from open cells (bfs-reachable) at Chebyshev distance >= 2 from BOTH the
  // entrance and the exit — never the cells themselves, never beside them.
  // They may share a cell with a wall-mounted mirror (floor vs wall), so
  // unlike the rules above they do not touch `used`. Draws happen ONLY when
  // params.water > 0 (tier 3, and — since T9 — tier 9: the Warrens pool the
  // Gardens' water again, thinner: 2–3, not 2–4) and LAST in the stream:
  // tiers 1–2 keep the exact M2/T2 rng order — their experience is
  // byte-identical (the floors 1–80 sweep pins it).
  let water: Array<{ x: number; y: number }> = [];
  if (params.water > 0) {
    const count = params.water + rng.int(params.waterRoll); // Gardens 2→2–4, Warrens 2→2–3
    const poolCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (special.has(key(x, y))) continue;
        if (Math.max(Math.abs(x - floor.entrance.x), Math.abs(y - floor.entrance.y)) < 2) continue;
        if (Math.max(Math.abs(x - floor.exit.x), Math.abs(y - floor.exit.y)) < 2) continue;
        if ((dist[y * grid.width + x] ?? -1) < 0) continue; // not open/reachable
        const { cx, cy } = grid.cellCenter(x, y);
        poolCells.push({ x: cx, y: cy });
      }
    }
    water = rng.shuffle(poolCells).slice(0, count);
  }

  // Rule 9 (T4/T3, T9/T2): the Carnival's distorting mirrors. Wall-mounted
  // like the standing glass (fogable exactly like it — frost.ts reads the
  // kind), the count the rng's call (the param is the floor of the range, one
  // coin adds one), then a shuffle of whatever cells the portraits/standing
  // glass left. Each pane's fixed lie is NOT an rng draw — it derives from
  // the mirror's id (distortDelta, per-id deterministic). Draws happen ONLY
  // when params.distort > 0 (tier 4; and — since T9 — tier 9's thin glass:
  // the ask of 1 flips 1–2 panes) and LAST-LAST in the stream: tiers 1–3
  // keep the exact M2/T2/T3 rng order — their experience is byte-identical.
  if (params.distort > 0) {
    const count = params.distort + rng.int(2); // Carnival 2→2–3, Warrens 1→1–2
    for (const c of rng.shuffle(remaining()).slice(0, count)) place(c, 'distort');
  }

  return { mirrors, echoSpawns, patrolAnchors, water };
}
