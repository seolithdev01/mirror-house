// SPDX-License-Identifier: Apache-2.0
//
// Taal (M4/T3) — the beat-walker, second of the four Sentinels. A TEASER,
// not a killer: he patrols the anchor loop in time with the 8-tick beat
// (wall-clock phase — the rhythm works muted), lantern flaring on the
// accent, and his touch only angers the house. No death, no shards; the FAQ
// copy says so in T8. Pure state machine, same shape as echo.ts's patrol
// leg: updateTaal returns a new state and never mutates its input.
import { BEAT_TICK_MS } from '../engine/constants';
import type { CellIndex, FloorGrid } from '../engine/grid';
import { buildFlowField, flowStep } from '../engine/flowField';

export const TAAL_BASE_SPEED = 1.6; // m/s — the stride the beat scales
export const TAAL_TOUCH_ANGER = 20; // anger his touch adds (never kills directly)
export const TAAL_TOUCH_COOLDOWN_MS = 1500; // ms between touches

/** The lurch on even ticks, the crawl between them. */
export const BEAT_ACCENT = 2.2;
export const BEAT_REST = 0.3;

export interface TaalState {
  x: number;
  y: number;
  heading: number;
  anchorIdx: number;
  active: boolean;
  target: CellIndex | null;
  field: Int32Array | null;
  touchCooldownUntil: number;
}

/** Spawn him on the first anchor of the floor's patrol loop. No anchors →
 *  no cameo (null): that floor never heard the beat. */
export function initTaal(anchors: ReadonlyArray<{ x: number; y: number }>): TaalState | null {
  if (anchors.length === 0) return null;
  const a = anchors[0]!;
  return {
    x: a.x,
    y: a.y,
    heading: 0,
    anchorIdx: 0,
    active: true,
    target: null,
    field: null,
    touchCooldownUntil: 0,
  };
}

/** The beat: an 8-tick cycle on BEAT_TICK_MS, pulsing 2.2 on even ticks and
 *  0.3 on odd — parity-matched to theory.beatAccents, whose low (dhin)
 *  accents land on ticks 0 and 4. Pure function of wall-clock now: the
 *  lurch keeps time with the audio engine muted, paused, or unborn. */
export function beatPulse(nowMs: number): number {
  const tick = Math.floor(nowMs / BEAT_TICK_MS) % 8;
  return tick % 2 === 0 ? BEAT_ACCENT : BEAT_REST;
}

/** May his touch land now? One anger spike per TAAL_TOUCH_COOLDOWN_MS,
 *  boundary-inclusive — the caller banks the cooldown and the anger. */
export function taalTouch(cooldownUntil: number, now: number): boolean {
  return now >= cooldownUntil;
}

/** One step of the beat-walk — echo's patrol leg with a metronome for a
 *  heart. Walks the flow field toward the current anchor (the same
 *  buildFlowField/flowStep echo.ts imports — never a copy), rotates the
 *  loop on arrival, and strides at TAAL_BASE_SPEED × beatPulse(nowMs):
 *  a lurch, a sway, a lurch. Retired (active false) or anchorless, he
 *  holds still. */
export function updateTaal(
  t: TaalState,
  anchors: ReadonlyArray<{ x: number; y: number }>,
  grid: FloorGrid,
  nowMs: number,
  dtS: number,
): TaalState {
  if (!t.active || anchors.length === 0) return t;
  // Arrival rotates the patrol — same 0.15 m snap as echo.
  let { anchorIdx } = t;
  const current = anchors[anchorIdx % anchors.length]!;
  if (Math.hypot(current.x - t.x, current.y - t.y) <= 0.15) {
    anchorIdx = (anchorIdx + 1) % anchors.length;
  }
  const next = anchors[anchorIdx]!;
  const target = grid.cellAt(next.x, next.y);

  // Rebuild the field only when the target cell moves.
  let field = t.field;
  if (field === null || t.target === null || target.x !== t.target.x || target.y !== t.target.y) {
    field = buildFlowField(grid, [target]);
  }

  // Descend toward the target cell; inside it, walk to its center. Every
  // step's endpoints lie in the union of adjacent open cells, so walls are
  // respected by construction — the same invariant echo patrol relies on.
  let { x, y, heading } = t;
  const cell = grid.cellAt(x, y);
  const goal = flowStep(field, grid, cell.x, cell.y) ?? target;
  const { cx, cy } = grid.cellCenter(goal.x, goal.y);
  const dx = cx - x;
  const dy = cy - y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1e-9) {
    const step = Math.min(TAAL_BASE_SPEED * beatPulse(nowMs) * dtS, dist); // never overshoot
    const vx = dx / dist;
    const vy = dy / dist;
    x += vx * step;
    y += vy * step;
    heading = Math.atan2(vx, -vy); // heading 0 = north = −y
  }
  return { ...t, x, y, heading, anchorIdx, target, field };
}
