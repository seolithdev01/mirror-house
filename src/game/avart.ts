// SPDX-License-Identifier: Apache-2.0
//
// Aavart the Ambusher (T4/T2) — fourth of the four Sentinels, lord of the
// Carnival of Faces (floors 31–40). Where Gher reads the road alone, Aavart
// reads your PACE: he projects where you will be — AVART_LEAD_S seconds of
// travel along your heading, scaled by how close to a sprint you run — and
// glides at the fastest sentinel speed to the path cell nearest that point,
// cutting your corner before you reach it. Sprint and he ambushes three
// cells ahead; creep and the lead collapses to your next step — the counter
// is your own stride. No feint holds him either: a read he cannot make (the
// projection leaves the roads, or there is nothing left to read) sends him
// to the objective itself, where he waits. Pure state machine, gher.ts's
// shape: updateAavart returns a new state and never mutates its input, and
// the glide rides the SAME buildFlowField/flowStep the echoes ride.
import { AVART_INTERCEPT_MS, AVART_LEAD_S, AVART_SENTINEL_FLOOR, SPRINT_SPEED } from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { buildFlowField, flowStep } from '../engine/flowField';

export const AVART_SPEED = 2.4; // m/s — the fastest Sentinel: he RUNS

export { AVART_SENTINEL_FLOOR };

export interface AvartState {
  x: number;
  y: number;
  heading: number;
  ambushAt: CellIndex | null;
  nextTickAt: number;
}

/** Spawn him at the patrol anchor FARTHEST from the player's spawn — the
 *  initGher/initTaal precedent: the first pace is the player's to set, and
 *  the far-anchor rule can never land a lethal figure on the returned
 *  player. No anchors → no Aavart (null): a floor with no roads cannot be
 *  ambushed. */
export function initAavart(
  anchors: ReadonlyArray<{ x: number; y: number }>,
  playerStart: { x: number; y: number },
): AvartState | null {
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
  return { x: far.x, y: far.y, heading: 0, ambushAt: null, nextTickAt: 0 };
}

/** The corner he cuts. A multi-source BFS field over the objectives (the
 *  uncaptured beacons + the stair door — the caller's business) gives the
 *  path from the player's CURRENT cell to their NEAREST goal; the ambush is
 *  the path cell nearest to the projection's cell. The projection: lead =
 *  AVART_LEAD_S · (speed / SPRINT_SPEED) seconds of travel along the
 *  heading — the faster they run, the further he reaches, and at a creep
 *  (speed ≈ 0) the lead collapses onto the player's own next path cell.
 *  When the projection lands OFF the roads (a heading no road honours) the
 *  read fails — no feint, no hold: he takes the path's LAST cell and waits
 *  at the objective. Standing on an objective, the ambush is the ground the
 *  player stands on; no objectives or an unreachable set → null. */
export function ambushCell(
  player: { x: number; y: number; heading: number; speed: number },
  grid: FloorGrid,
  objectives: ReadonlyArray<CellIndex>,
): CellIndex | null {
  if (objectives.length === 0) return null;
  const cell = grid.cellAt(player.x, player.y);
  const field = buildFlowField(grid, [...objectives]);
  const dist = field[cell.y * grid.width + cell.x]!;
  if (dist === 0) return cell; // the player IS at a goal — ambush it
  if (dist < 0) return null; // unreachable: no road to read

  // The full road: first step … the nearest objective (the path's last cell).
  const path: CellIndex[] = [];
  let cur = cell;
  for (let next = flowStep(field, grid, cur.x, cur.y); next !== null; next = flowStep(field, grid, cur.x, cur.y)) {
    path.push(next);
    cur = next;
  }

  // The projection: seconds of lead scaled by the stride, then that many
  // seconds of travel along the heading (heading 0 = north = −y).
  const lead = AVART_LEAD_S * (player.speed / SPRINT_SPEED);
  const reach = player.speed * lead; // meters
  const pCell = grid.cellAt(
    player.x + Math.sin(player.heading) * reach,
    player.y - Math.cos(player.heading) * reach,
  );
  if (field[pCell.y * grid.width + pCell.x]! < 0) {
    return path[path.length - 1]!; // off the roads — he waits at the objective
  }

  // The corner-cut: the path cell whose center lies nearest the projection's
  // cell (ties → the earlier cell on the path, deterministic).
  const pc = grid.cellCenter(pCell.x, pCell.y);
  let best = path[0]!;
  let bestD = Infinity;
  for (const c of path) {
    const cc = grid.cellCenter(c.x, c.y);
    const d = (cc.cx - pc.cx) ** 2 + (cc.cy - pc.cy) ** 2;
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

/** One step of the ambush — gher.ts's glide at a runner's pace. The caller
 *  offers the freshest projection every step; Aavart ADOPTS a new ambush
 *  cell only on the AVART_INTERCEPT_MS tick (his reaction time — change pace
 *  inside it and the old read stands), and a NULL offer changes nothing:
 *  where a feint stops Gher mid-stride, Aavart keeps the last read and
 *  finishes it. With an ambush in hand he glides the flow field at one
 *  constant AVART_SPEED — every step's endpoints lie in the union of
 *  adjacent open cells, so walls are respected by construction, the
 *  invariant the echo walk rides. */
export function updateAavart(
  a: AvartState,
  ambush: CellIndex | null,
  grid: FloorGrid,
  now: number,
  dtS: number,
): AvartState {
  let { ambushAt, nextTickAt } = a;
  if (ambush !== null && now >= a.nextTickAt) {
    ambushAt = ambush; // the tick: a fresh projection is adopted
    nextTickAt = now + AVART_INTERCEPT_MS;
  }
  if (ambushAt === null) return { ...a, ambushAt, nextTickAt };

  let { x, y, heading } = a;
  const field = buildFlowField(grid, [ambushAt]);
  const cell = grid.cellAt(x, y);
  const goal = flowStep(field, grid, cell.x, cell.y) ?? ambushAt;
  const { cx, cy } = grid.cellCenter(goal.x, goal.y);
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1e-9) {
    const step = Math.min(AVART_SPEED * dtS, dist); // never overshoot the ambush
    const vx = dx / dist;
    const vy = dy / dist;
    x += vx * step;
    y += vy * step;
    heading = Math.atan2(vx, -vy); // heading 0 = north = −y
  }
  return { x, y, heading, ambushAt, nextTickAt };
}
