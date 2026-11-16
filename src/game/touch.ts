// SPDX-License-Identifier: Apache-2.0
//
// T12/T1 — the touch core, pure. The engine's pointer tracker (input.ts) owns
// the hardware: it classifies touches into zones (classifyZone), normalizes
// the stick drag by TOUCH_STICK_RADIUS_PX and clamps it to magnitude 1, and
// banks raw look pixels. THIS module owns the meaning: a stick vector becomes
// analog movement (stickToMove), a screen half becomes a control zone. No DOM
// here — everything below runs identically in vitest's node environment.

import { TOUCH_DEADZONE } from '../engine/constants';

/** The virtual stick's live state: `active` while the stick pointer is down,
 *  `dx`/`dy` the drag from the down-point origin normalized by
 *  TOUCH_STICK_RADIUS_PX and clamped to magnitude ≤ 1 (raw — the deadzone is
 *  a movement-policy decision, applied by stickToMove, not baked into the
 *  snapshot, so Task 2's nub can still follow the thumb through the
 *  deadzone). */
export interface TouchStick {
  active: boolean;
  dx: number;
  dy: number;
}

/** The look pointer's accumulated drag in raw pixels since the last
 *  touchSnapshot drain (the touch twin of KeyboardSnapshot's mouseDx). */
export interface TouchLook {
  dx: number;
}

/**
 * Stick vector → analog movement. forward = −dy (screen up walks forward),
 * strafe = dx (right is positive). The DEADZONE gates on MAGNITUDE, not
 * per-axis: one live axis survives a quiet partner, and sub-deadzone thumb
 * jitter is idle. Between the deadzone and 1 the magnitude passes through
 * unscaled — the analog walk→sprint continuum (WALK_SPEED × magnitude;
 * the ratified plan decision keeps MoveInput's shape unchanged, so touch
 * players walk the analog 3.5 m/s until magnitude passes 0.85's sprint
 * threshold at the consumer). Beyond 1 the DIRECTION holds and the magnitude
 * clamps to exactly 1. An inactive (lifted) stick is idle.
 */
export function stickToMove(s: TouchStick): { forward: number; strafe: number } {
  if (!s.active) return { forward: 0, strafe: 0 };
  const mag = Math.hypot(s.dx, s.dy);
  if (mag < TOUCH_DEADZONE) return { forward: 0, strafe: 0 };
  const scale = Math.min(1, mag) / mag; // mag > 1 → normalized back to exactly 1
  // `+ 0` folds the sign flip's −0 (dy = 0 → forward −0) into plain 0 — deep
  // equality everywhere downstream sees ordinary zeros.
  return { forward: -s.dy * scale + 0, strafe: s.dx * scale + 0 };
}

/**
 * Which half of the viewport a pointer landed in: the LEFT 45% is the move
 * stick, the RIGHT 55% is drag-look. Strict `<` — the boundary pixel itself
 * is look, so the stick never claims a touch the math cannot defend.
 */
export function classifyZone(xPx: number, viewW: number): 'stick' | 'look' {
  return xPx < viewW * 0.45 ? 'stick' : 'look';
}
