// SPDX-License-Identifier: Apache-2.0
//
// Gher the Encircler (T3/T2) — third of the four Sentinels, lord of the
// Reflecting Gardens (floors 21–30). Where the Echoes see through mirrors
// and Taal keeps a beat, Gher has NO sensing at all — he only predicts: he
// reads the roads' future (a BFS path from the player's current cell to
// their nearest plausible goal) and glides at one steady speed to seal the
// corridor ~3 cells ahead of the commit. The counter is the feint: the
// moment the player's heading leaves the path (the 60° commit window
// closes) the prediction goes null and he holds — commit the other way and
// the retarget tick is his reaction time. Pure state machine, taal.ts's
// shape: updateGher returns a new state and never mutates its input, and
// the walk rides the SAME buildFlowField/flowStep the echoes ride.
import { GHER_INTERCEPT_MS, GHER_SENTINEL_FLOOR } from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { buildFlowField, flowStep } from '../engine/flowField';

export const GHER_SPEED = 1.9; // m/s — one steady glide: no beat, no lurch

/** The commit window's cosine: the player's heading must sit within 60° of
 *  the path's next step for the prediction to hold — the same cone math the
 *  frost lantern owns (FROST_CONE_COS), held here for the roads. */
export const INTERCEPT_CONE_COS = Math.cos(Math.PI / 3);

/** How far down the player's path the seal aims: the 3rd cell — or the
 *  objective itself when it stands nearer than 3 steps. */
const LOOKAHEAD_STEPS = 3;

export { GHER_SENTINEL_FLOOR };

export interface GherState {
  x: number;
  y: number;
  heading: number;
  interceptAt: CellIndex | null;
  nextTickAt: number;
}

/** Spawn him at the patrol anchor FARTHEST from the player's spawn — the
 *  Gardens reset with the attempt, and the first commit is the player's to
 *  make. No anchors → no Gher (null): a floor with no roads cannot be
 *  encircled. */
export function initGher(
  anchors: ReadonlyArray<{ x: number; y: number }>,
  playerStart: { x: number; y: number },
): GherState | null {
  if (anchors.length === 0) return null;
  let far = anchors[0]!;
  let farD = -1;
  for (const a of anchors) {
    const d = (a.x - playerStart.x) ** 2 + (a.y - playerStart.y) ** 2;
    if (d > farD) {
      far = a;
      farD = d;
    }
  }
  return { x: far.x, y: far.y, heading: 0, interceptAt: null, nextTickAt: 0 };
}

/** The road he seals. A multi-source BFS field over the objectives (the
 *  uncaptured beacons + the stair door +, on the Act II floors, the ALIVE
 *  copies' cells — see gherObjectives; the caller's business) gives the
 *  path from the player's CURRENT cell to their NEAREST goal; the seal is
 *  the cell ~3 steps down that path — but ONLY while the player's heading
 *  points along the path's next step (the 60° commit window). Heading
 *  elsewhere → null: the feint, and Gher holds. Standing on an objective,
 *  the seal is the ground the player stands on; no objectives or an
 *  unreachable set (degenerate grid) → null. */
export function interceptCell(
  player: { x: number; y: number; heading: number },
  grid: FloorGrid,
  objectives: ReadonlyArray<CellIndex>,
): CellIndex | null {
  if (objectives.length === 0) return null;
  const cell = grid.cellAt(player.x, player.y);
  const field = buildFlowField(grid, [...objectives]);
  const dist = field[cell.y * grid.width + cell.x]!;
  if (dist === 0) return cell; // the player IS at a goal — seal it
  if (dist < 0) return null; // unreachable: no road to read

  // The path: descend the field toward the nearest objective, 3 cells down
  // (fewer when the objective itself stands nearer).
  const path: CellIndex[] = [];
  let cur = cell;
  for (let i = 0; i < LOOKAHEAD_STEPS; i++) {
    const next = flowStep(field, grid, cur.x, cur.y);
    if (next === null) break;
    path.push(next);
    cur = next;
  }

  // The commit window: the player's forward vector (heading 0 = north = −y)
  // must sit within 60° of the path's FIRST step — not the far cell. A
  // player facing at the objective across a bend is feinting by geometry.
  const first = path[0]!;
  const { cx, cy } = grid.cellCenter(first.x, first.y);
  const dx = cx - player.x;
  const dy = cy - player.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-9) return path[path.length - 1]!; // on the step's center — committed by position
  const fx = Math.sin(player.heading);
  const fy = -Math.cos(player.heading);
  if ((fx * dx + fy * dy) / len < INTERCEPT_CONE_COS) return null;
  return path[Math.min(LOOKAHEAD_STEPS - 1, path.length - 1)]!;
}

/** T6/T3 — the house guards its copies. Gher's objective candidates are the
 *  caller's roads (uncaptured beacons + stair door) PLUS the ALIVE decoy
 *  cells, each copy's world-meter spot mapped back to its cell. The gate is
 *  the decoys array itself: main feeds `[]` on every floor below 41 (copies
 *  only exist on the Act II floors), so the list grows exactly where copies
 *  can stand — and only Gher eats this feed; Aavart keeps the bare roads.
 *  The nearest-objective BFS downstream decides as always: a copy crossing
 *  his sector pulls the seal onto it, so the shard-hungry player shatters
 *  copies near a sealed road at their peril. Structural over the decoy
 *  shape (no decoy.ts import — the Encircler knows nothing of copies beyond
 *  their cells); a copy standing ON a base cell does not duplicate it.
 *  Pure: fresh array, inputs untouched. */
export function gherObjectives(
  base: ReadonlyArray<CellIndex>,
  decoys: ReadonlyArray<{ x: number; y: number; shattered: boolean }>,
  grid: FloorGrid,
): CellIndex[] {
  const cells = [...base];
  for (const d of decoys) {
    if (d.shattered) continue;
    const c = grid.cellAt(d.x, d.y);
    if (!cells.some((b) => b.x === c.x && b.y === c.y)) cells.push(c);
  }
  return cells;
}

/** T6/T3 — the caption's eye: does the seal stand on a LIVE copy's cell?
 *  Main speaks "the warden guards the copy" once per floor the first time
 *  this turns true after a build. A null seal seals nothing; a shattered
 *  copy's cell is a tombstone, not a ward. */
export function sealsDecoyCell(
  seal: CellIndex | null,
  decoys: ReadonlyArray<{ x: number; y: number; shattered: boolean }>,
  grid: FloorGrid,
): boolean {
  if (seal === null) return false;
  return decoys.some((d) => {
    if (d.shattered) return false;
    const c = grid.cellAt(d.x, d.y);
    return c.x === seal.x && c.y === seal.y;
  });
}

/** One step of the encirclement — taal.ts's walk with a seer's heart. The
 *  caller offers the freshest prediction every step; Gher ADOPTS a new
 *  intercept cell only on the GHER_INTERCEPT_MS tick (his reaction time —
 *  feint inside it and the road stays open), but a NULL lands at once: the
 *  moment the player's heading leaves the path he stops mid-stride and
 *  holds. With a seal in hand he glides the flow field at one constant
 *  GHER_SPEED — every step's endpoints lie in the union of adjacent open
 *  cells, so walls are respected by construction, the invariant the echo
 *  walk rides. No beat multiplier: the stride is a glide, always. */
export function updateGher(
  g: GherState,
  intercept: CellIndex | null,
  grid: FloorGrid,
  now: number,
  dtS: number,
): GherState {
  let { interceptAt, nextTickAt } = g;
  if (intercept === null) {
    interceptAt = null; // the feint lands at once — he holds
  } else if (now >= g.nextTickAt) {
    interceptAt = intercept; // the tick: a new seal is adopted
    nextTickAt = now + GHER_INTERCEPT_MS;
  }
  if (interceptAt === null) return { ...g, interceptAt, nextTickAt };

  let { x, y, heading } = g;
  const field = buildFlowField(grid, [interceptAt]);
  const cell = grid.cellAt(x, y);
  const goal = flowStep(field, grid, cell.x, cell.y) ?? interceptAt;
  const { cx, cy } = grid.cellCenter(goal.x, goal.y);
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1e-9) {
    const step = Math.min(GHER_SPEED * dtS, dist); // never overshoot the seal
    const vx = dx / dist;
    const vy = dy / dist;
    x += vx * step;
    y += vy * step;
    heading = Math.atan2(vx, -vy); // heading 0 = north = −y
  }
  return { x, y, heading, interceptAt, nextTickAt };
}
