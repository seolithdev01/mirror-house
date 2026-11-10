// SPDX-License-Identifier: Apache-2.0
//
// Echoes: hollow reflections that see only through mirrors. Pure state
// machine — updateEcho returns a new state and never mutates its input.
// Sense model: ∃ mirror (standing|beacon|true, unfogged) with clear LOS from
// BOTH the echo and the player to the mirror center, both within SENSE_RANGE.
import {
  CHASE_MEMORY_MS,
  CONFUSE_FOGGED_R,
  CONFUSE_UNFOGGED_R,
  ECHO_SPEED,
  SENSE_INTERVAL_MS,
  SENSE_RANGE,
} from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { losClear } from '../engine/los';
import { buildFlowField, flowStep } from '../engine/flowField';
import { isFogged, type MirrorRuntime } from './frost';
import type { MirrorRef } from './floorObjects';
import type { PlayerState } from './player';

export interface EchoState {
  id: number;
  x: number;
  y: number;
  heading: number;
  mode: 'patrol' | 'chase' | 'confused';
  anchorIdx: number;
  target: CellIndex | null;
  field: Int32Array | null;
  lastSensedCell: CellIndex | null;
  loseMemoryAt: number | null;
  nextSenseAt: number;
  stuckAwarded: boolean; // T6 awards SHARD_STUCK once per echo lured into a trap
}

/** The runtime entry for a mirror ref (runtime arrays are id-keyed copies of
 *  the ref list — match by id so test fixtures with arbitrary ids work). */
function runtimeFor(rt: MirrorRuntime[], m: MirrorRef): MirrorRuntime | null {
  return rt.find((r) => r.id === m.id) ?? null;
}

/** Mirrors an Echo can see through — silvered glass scatters, true glass
 *  reflects. T2: the ancestor portraits are eyes exactly like standing glass. */
function sensesThrough(m: MirrorRef): boolean {
  return m.kind === 'standing' || m.kind === 'beacon' || m.kind === 'true' || m.kind === 'portrait';
}

export function initEchoes(
  spawns: Array<{ x: number; y: number }>,
  grid: FloorGrid,
  anchors: Array<{ x: number; y: number }>,
  now: number,
): EchoState[] {
  return spawns.map((s, i) => ({
    id: i,
    x: s.x,
    y: s.y,
    heading: 0,
    mode: 'patrol',
    anchorIdx: anchors.length > 0 ? i % anchors.length : 0,
    target: null,
    field: null,
    lastSensedCell: null,
    loseMemoryAt: null,
    nextSenseAt: now,
    stuckAwarded: false,
  }));
}

export function sensesPlayer(
  echo: EchoState,
  player: PlayerState,
  mirrors: MirrorRef[],
  rt: MirrorRuntime[],
  grid: FloorGrid,
  now: number,
): boolean {
  for (const m of mirrors) {
    if (!sensesThrough(m)) continue;
    const r = runtimeFor(rt, m);
    if (!r || isFogged(r, now)) continue;
    const echoDist = Math.hypot(m.x - echo.x, m.z - echo.y);
    const playerDist = Math.hypot(m.x - player.x, m.z - player.y);
    if (echoDist > SENSE_RANGE || playerDist > SENSE_RANGE) continue;
    if (!losClear(grid, echo.x, echo.y, m.x, m.z)) continue;
    if (!losClear(grid, player.x, player.y, m.x, m.z)) continue;
    return true; // both stand in this mirror's reflection
  }
  return false;
}

export function updateEcho(
  echo: EchoState,
  player: PlayerState,
  mirrors: MirrorRef[],
  rt: MirrorRuntime[],
  grid: FloorGrid,
  anchors: Array<{ x: number; y: number }>,
  now: number,
  dtS: number,
): EchoState {
  // Confused override: ≥2 frosted eyes within CONFUSE_FOGGED_R and no clear
  // eye within CONFUSE_UNFOGGED_R — the echo stalls and slowly spins.
  let foggedNear = 0;
  let unfoggedNear = 0;
  for (const m of mirrors) {
    if (!sensesThrough(m)) continue;
    const r = runtimeFor(rt, m);
    if (!r) continue;
    const d = Math.hypot(m.x - echo.x, m.z - echo.y);
    if (isFogged(r, now)) {
      if (d <= CONFUSE_FOGGED_R) foggedNear++;
    } else if (d <= CONFUSE_UNFOGGED_R) {
      unfoggedNear++;
    }
  }
  if (foggedNear >= 2 && unfoggedNear === 0) {
    return {
      ...echo,
      mode: 'confused',
      target: null,
      field: null,
      heading: echo.heading + 2 * dtS,
    };
  }

  // Sense check, at most once per SENSE_INTERVAL_MS per echo.
  let { lastSensedCell, loseMemoryAt, nextSenseAt } = echo;
  if (now >= nextSenseAt) {
    nextSenseAt = now + SENSE_INTERVAL_MS;
    if (sensesPlayer(echo, player, mirrors, rt, grid, now)) {
      lastSensedCell = grid.cellAt(player.x, player.y);
      loseMemoryAt = now + CHASE_MEMORY_MS;
    }
  }

  // Mode select: fresh memory chases, otherwise patrol.
  const mode: EchoState['mode'] = loseMemoryAt !== null && now < loseMemoryAt ? 'chase' : 'patrol';

  // Targeting.
  let { anchorIdx } = echo;
  let target: CellIndex | null = null;
  if (mode === 'patrol' && anchors.length > 0) {
    const anchor = anchors[anchorIdx]!;
    if (Math.hypot(anchor.x - echo.x, anchor.y - echo.y) <= 0.15) {
      anchorIdx = (anchorIdx + 1) % anchors.length; // arrival rotates the patrol
    }
    const next = anchors[anchorIdx]!;
    target = grid.cellAt(next.x, next.y);
  } else if (mode === 'chase') {
    target = lastSensedCell;
  }

  // Pathing: follow the flow field toward the target cell; inside the target
  // cell (flowStep null) walk straight at its center — or, in chase mode, at
  // the player themself (see the lunge below). Both endpoints of every step
  // lie in the union of two adjacent open cells, so no wall collision is
  // needed — the field already respects walls.
  let { x, y, heading, field } = echo;
  if (target !== null) {
    if (
      field === null ||
      echo.target === null ||
      target.x !== echo.target.x ||
      target.y !== echo.target.y
    ) {
      field = buildFlowField(grid, [target]);
    }
    const cell = grid.cellAt(x, y);
    const goal = flowStep(field, grid, cell.x, cell.y) ?? target;
    // In-cell pursuit: once the echo stands in the sensed cell it lunges at
    // the player's exact position instead of parking on the cell center — but
    // only while the player is still IN that cell. The echo sees only through
    // mirrors: a player who slipped out is chased at the remembered spot, and
    // the same-cell endpoints keep every step inside one cell, preserving the
    // no-wall-collision invariant above.
    const playerCell = grid.cellAt(player.x, player.y);
    const lungeAtPlayer =
      mode === 'chase' &&
      cell.x === target.x &&
      cell.y === target.y &&
      playerCell.x === target.x &&
      playerCell.y === target.y;
    const { cx, cy } = lungeAtPlayer
      ? { cx: player.x, cy: player.y }
      : grid.cellCenter(goal.x, goal.y);
    const dx = cx - x;
    const dy = cy - y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1e-9) {
      const step = Math.min(ECHO_SPEED * dtS, dist); // never overshoot the goal
      const vx = dx / dist;
      const vy = dy / dist;
      x += vx * step;
      y += vy * step;
      heading = Math.atan2(vx, -vy); // heading 0 = north = −y
    }
  }

  return {
    ...echo,
    x,
    y,
    heading,
    mode,
    anchorIdx,
    target,
    field,
    lastSensedCell,
    loseMemoryAt,
    nextSenseAt,
  };
}
