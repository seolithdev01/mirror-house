// SPDX-License-Identifier: Apache-2.0
//
// Mirror-you decoys (T5/T2) — Act II's first form. The house sends glass
// copies of the Surveyor ahead of them: each spawns at an open cell 8–12 BFS
// cells from the player, then walks the flow field toward the EXIT at its own
// steady stride, forever (it cannot reach harm and it cannot drown — copies
// don't drown). An Echo reads the NEARER of the player and the nearest
// unshattered copy as "the player position" (the lure), and a player who
// touches a copy shatters it for shards — once per copy, the flag is the
// gate. Pure state machine: every function returns fresh state and never
// mutates its input, the taal.ts/echo.ts contract.
import { DECOY_MAX_ALIVE, DECOY_SHARD, DECOY_SPEED } from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { buildFlowField, flowStep } from '../engine/flowField';
import type { Rng } from '../engine/rng';

export interface DecoyState {
  id: number;
  x: number; // world meters (a cell center at spawn)
  y: number;
  born: number; // wall-clock ms of the spawn
  shattered: boolean; // the once-per-copy gate: true means gone (and silent)
}

/** The spawn window: an open cell 8..12 BFS cells from the player — far
 *  enough to be "ahead", close enough to matter. */
const SPAWN_DIST_MIN = 8;
const SPAWN_DIST_MAX = 12;

/** Spawn one copy: null when DECOY_MAX_ALIVE unshattered decoys already
 *  stand (shattered tombstones never count — alive means unshattered), or
 *  when no open cell sits in the 8–12 window (too-small/degenerate floors).
 *  The cell is picked with the caller's rng (deterministic per seed) from
 *  the BFS-distance field rooted at the player's own cell. */
export function spawnDecoy(
  decoys: ReadonlyArray<DecoyState>,
  player: { x: number; y: number },
  grid: FloorGrid,
  rng: Rng,
  id: number,
  now: number,
): DecoyState | null {
  if (decoys.filter((d) => !d.shattered).length >= DECOY_MAX_ALIVE) return null;
  const from = grid.cellAt(player.x, player.y);
  const dist = buildFlowField(grid, [from]);
  const candidates: CellIndex[] = [];
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const d = dist[y * grid.width + x]!;
      if (d >= SPAWN_DIST_MIN && d <= SPAWN_DIST_MAX) candidates.push({ x, y });
    }
  if (candidates.length === 0) return null;
  const cell = rng.pick(candidates);
  const { cx, cy } = grid.cellCenter(cell.x, cell.y);
  return { id, x: cx, y: cy, born: now, shattered: false };
}

/** One stride for every unshattered copy: flow-walk toward the exit cell at
 *  DECOY_SPEED, the exact echo/taal descent (next flow cell, then its
 *  center, never overshooting). Shattered copies stand where they broke.
 *  The exit's field is built once per call and shared by every walker. */
export function updateDecoys(
  decoys: ReadonlyArray<DecoyState>,
  grid: FloorGrid,
  exit: CellIndex,
  dtS: number,
): DecoyState[] {
  const field = buildFlowField(grid, [exit]);
  return decoys.map((d) => {
    if (d.shattered) return d;
    const cell = grid.cellAt(d.x, d.y);
    const goal = flowStep(field, grid, cell.x, cell.y) ?? exit;
    const { cx, cy } = grid.cellCenter(goal.x, goal.y);
    const dx = cx - d.x;
    const dy = cy - d.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1e-9) return d;
    const step = Math.min(DECOY_SPEED * dtS, dist); // never overshoot the goal
    return { ...d, x: d.x + (dx / dist) * step, y: d.y + (dy / dist) * step };
  });
}

/** The nearest UNshattered copy to a spot (an Echo's lure read, main's
 *  overhead glyphs); null when no live copy exists. */
export function nearestDecoy(
  decoys: ReadonlyArray<DecoyState>,
  x: number,
  y: number,
): DecoyState | null {
  let best: DecoyState | null = null;
  let bestDist = Infinity;
  for (const d of decoys) {
    if (d.shattered) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

/** The lure read: the position an Echo should treat as "the player" — the
 *  nearest unshattered copy when it stands closer to the hunter than the
 *  player does, the player('s apparent position) otherwise. Decoy-state
 *  coordinates are world meters, same space as the echo's x/y. */
export function lureTarget(
  from: { x: number; y: number },
  apparent: { x: number; y: number },
  decoys: ReadonlyArray<DecoyState>,
): { x: number; y: number } {
  const d = nearestDecoy(decoys, from.x, from.y);
  if (d === null) return apparent;
  const playerDist = Math.hypot(apparent.x - from.x, apparent.y - from.y);
  const decoyDist = Math.hypot(d.x - from.x, d.y - from.y);
  return decoyDist < playerDist ? { x: d.x, y: d.y } : apparent;
}

/** The touch: every unshattered copy within `radius` of the player shatters,
 *  banking DECOY_SHARD shards each — once per copy (the flag is the gate, so
 *  a second pass pays nothing). Returns the new array and the shards earned
 *  this pass (0 when nothing was in reach or everything was already gone). */
export function shatterDecoys(
  decoys: ReadonlyArray<DecoyState>,
  player: { x: number; y: number },
  radius: number,
): { decoys: DecoyState[]; shards: number } {
  let shards = 0;
  const next = decoys.map((d) => {
    if (d.shattered) return d;
    if (Math.hypot(d.x - player.x, d.y - player.y) < radius) {
      shards += DECOY_SHARD;
      return { ...d, shattered: true };
    }
    return d;
  });
  return { decoys: next, shards };
}
