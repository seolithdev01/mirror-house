// SPDX-License-Identifier: Apache-2.0
import { Dir, FloorGrid, type WallSegment } from '../engine/grid';
import { MAX_STEP_DT, PLAYER_RADIUS, SPRINT_SPEED, WALK_SPEED } from '../engine/constants';
import type { Floor } from './maze';

export interface PlayerState {
  x: number;
  y: number;
  heading: number;
}
export interface MoveInput {
  forward: number;
  strafe: number;
  sprint: boolean;
  turn: number;
}

export function spawnPlayer(floor: Floor): PlayerState {
  const { cx, cy } = floor.grid.cellCenter(floor.entrance.x, floor.entrance.y);
  const openOrder: Array<[Dir, number]> = [
    [Dir.North, 0],
    [Dir.East, Math.PI / 2],
    [Dir.South, Math.PI],
    [Dir.West, (3 * Math.PI) / 2],
  ];
  let heading = 0;
  for (const [dir, h] of openOrder)
    if (floor.grid.canWalk(floor.entrance.x, floor.entrance.y, dir)) {
      heading = h;
      break;
    }
  return { x: cx, y: cy, heading };
}

/** Clamp movement along one axis against blocking wall planes. */
function clampAxis(
  value: number,
  delta: number,
  other: number,
  segs: readonly WallSegment[],
  axisIsX: boolean,
): number {
  let best = value + delta;
  if (delta === 0) return value;
  const r = PLAYER_RADIUS;
  for (const s of segs) {
    const isVertical = s.x1 === s.x2; // vertical walls block X, horizontal block Y
    if (axisIsX !== isVertical) continue;
    const wallPos = axisIsX ? s.x1 : s.y1;
    const lo = axisIsX ? Math.min(s.y1, s.y2) : Math.min(s.x1, s.x2);
    const hi = axisIsX ? Math.max(s.y1, s.y2) : Math.max(s.x1, s.x2);
    if (other + r <= lo || other - r >= hi) continue; // runs parallel, no overlap
    if (delta > 0 && value + r <= wallPos && best + r > wallPos) best = wallPos - r;
    if (delta < 0 && value - r >= wallPos && best - r < wallPos) best = wallPos + r;
  }
  return best;
}

export function movePlayer(
  p: PlayerState,
  input: MoveInput,
  grid: FloorGrid,
  dtRaw: number,
): PlayerState {
  const dt = Math.min(dtRaw, MAX_STEP_DT);
  const heading = p.heading + input.turn;
  const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
  const fx = Math.sin(heading),
    fy = -Math.cos(heading); // heading 0 = north (-y)
  const rx = Math.cos(heading),
    ry = Math.sin(heading); // right vector
  const dx = (fx * input.forward + rx * input.strafe) * speed * dt;
  const dy = (fy * input.forward + ry * input.strafe) * speed * dt;
  const cell = grid.cellAt(p.x, p.y);
  const segs = grid.wallSegmentsNearCells(cell.x, cell.y);
  return {
    heading,
    x: clampAxis(p.x, dx, p.y, segs, true),
    y: clampAxis(p.y, dy, p.x, segs, false),
  };
}
