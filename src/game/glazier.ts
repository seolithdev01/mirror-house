// SPDX-License-Identifier: Apache-2.0
//
// The Glazier (T10/T2) — the house's master, the last entity. Floors 91–99
// strip every mechanic away (pure mazes, the four Sentinels resting, the
// Echo roster thinned) and floor 100 hands the hunt to HIM: a teleport-walker
// who needs no senses, no mirrors, no noise — every GLAZIER_TELEPORT_S he
// relocates to the open cell FARTHEST from the player (a fresh perch, the
// bfs-farthest read the exit picker has always used), and between teleports
// he flow-walks straight AT the player at one steady GLAZIER_SPEED. Nothing
// fogs him (there is no glass left to fog), nothing lures him (the copies
// stopped at 90), nothing slows him (the Foundations flood no halls) — he IS
// the fog. Contact is the standard caught fail. Pure state machine, the
// gher.ts shape: updateGlazier returns a new state and never mutates its
// input, and the walk rides the SAME buildFlowField/flowStep every walker
// rides — while the perch reuses bfsDistances (the maze's own farthest-cell
// read), so spawn and relocation share one deterministic picker.
import { CONTACT_RADIUS, GLAZIER_FLOOR } from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { buildFlowField, flowStep } from '../engine/flowField';
import { bfsDistances } from './maze';

/** The teleport clock: every 12 s the master abandons his pursuit for a new
 *  far perch — the rhythm the Ground is danced to. */
export const GLAZIER_TELEPORT_S = 12;

/** The pursuit stride, m/s — one steady walk: slower than you sprint, faster
 *  than you dare be cornered. */
export const GLAZIER_SPEED = 2.0;

/** The approach line: within 3 m the master is HERE — the once-per-attempt
 *  caption's eye. */
export const GLAZIER_NEAR_M = 3;

export { GLAZIER_FLOOR };

export interface GlazierState {
  x: number;
  y: number;
  heading: number;
  nextTeleportAt: number;
}

/** His next perch: the open cell with MAX bfs-distance from the player
 *  (ties break to the FIRST row-major cell — deterministic, the same rule
 *  farthestCell keeps for exits). A perch is strictly farther than the
 *  player's own cell — he never lands where you stand. No strictly-farther
 *  reachable cell (a degenerate grid) → null: nowhere to perch. */
export function glazierTarget(
  grid: FloorGrid,
  player: { x: number; y: number },
): CellIndex | null {
  const start = grid.cellAt(player.x, player.y);
  const dist = bfsDistances(grid, start);
  let bestIdx = -1;
  for (let i = 0; i < dist.length; i++) {
    const d = dist[i]!;
    if (d >= 1 && (bestIdx === -1 || d > dist[bestIdx]!)) bestIdx = i;
  }
  return bestIdx === -1 ? null : { x: bestIdx % grid.width, y: Math.floor(bestIdx / grid.width) };
}

/** Spawn him at the perch farthest from the player's spawn — the Ground's
 *  opening grace is yours, the clock already runs. nextTeleportAt arms at
 *  `now + GLAZIER_TELEPORT_S·1000`; a degenerate grid (no far cell) leaves
 *  him on the player's cell, the only ground there is. */
export function initGlazier(
  grid: FloorGrid,
  player: { x: number; y: number },
  now: number,
): GlazierState {
  const perch = glazierTarget(grid, player) ?? grid.cellAt(player.x, player.y);
  const { cx, cy } = grid.cellCenter(perch.x, perch.y);
  return { x: cx, y: cy, heading: 0, nextTeleportAt: now + GLAZIER_TELEPORT_S * 1000 };
}

/** One step of the hunt. On the clock (`now >= nextTeleportAt`) he relocates
 *  to glazierTarget's cell center — wherever the player stands NOW — and
 *  resets the clock; the relocation is instant, so his heading carries until
 *  the next step re-aims it. Between teleports he flow-walks toward the
 *  player at one constant GLAZIER_SPEED — every step's endpoints lie in the
 *  union of adjacent open cells, so walls are respected by construction, the
 *  invariant the echo walk rides. At the player's cell the walk holds (the
 *  flow field has nowhere lower to go); the contact gate below is the game,
 *  not the stride. */
export function updateGlazier(
  g: GlazierState,
  grid: FloorGrid,
  player: { x: number; y: number },
  now: number,
  dtS: number,
): GlazierState {
  if (now >= g.nextTeleportAt) {
    const perch = glazierTarget(grid, player);
    if (perch === null) return { ...g, nextTeleportAt: now + GLAZIER_TELEPORT_S * 1000 };
    const { cx, cy } = grid.cellCenter(perch.x, perch.y);
    return { ...g, x: cx, y: cy, nextTeleportAt: now + GLAZIER_TELEPORT_S * 1000 };
  }
  const field = buildFlowField(grid, [grid.cellAt(player.x, player.y)]);
  const cell = grid.cellAt(g.x, g.y);
  const next = flowStep(field, grid, cell.x, cell.y);
  if (next === null) return { ...g }; // at the player's cell (or walled in): hold
  const { cx, cy } = grid.cellCenter(next.x, next.y);
  const dx = cx - g.x;
  const dy = cy - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 1e-9) return { ...g };
  const step = Math.min(GLAZIER_SPEED * dtS, dist); // never overshoot the cell
  const vx = dx / dist;
  const vy = dy / dist;
  return {
    x: g.x + vx * step,
    y: g.y + vy * step,
    heading: Math.atan2(vx, -vy), // heading 0 = north = −y
    nextTeleportAt: g.nextTeleportAt,
  };
}

/** The contact gate, pure: strictly inside CONTACT_RADIUS the master's touch
 *  fails the floor (the standard caught — no anger, no cooldown: he is the
 *  house). Main feeds this every live fixed step. */
export function glazierCatches(
  g: { x: number; y: number },
  player: { x: number; y: number },
): boolean {
  return Math.hypot(g.x - player.x, g.y - player.y) < CONTACT_RADIUS;
}

/** The approach gate, pure: within GLAZIER_NEAR_M (3 m, inclusive) he is
 *  HERE — once per attempt main speaks it, the discovery line. */
export function glazierNear(
  g: { x: number; y: number },
  player: { x: number; y: number },
): boolean {
  return Math.hypot(g.x - player.x, g.y - player.y) <= GLAZIER_NEAR_M;
}
