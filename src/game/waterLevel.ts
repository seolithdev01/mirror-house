// SPDX-License-Identifier: Apache-2.0
//
// The rising water (T5/T3) — the Flood Halls' second deception. The flood is
// a DERIVED function of the run clock, not a state machine: there is nothing
// to reset, nothing to persist, nothing that can drift out of sync. The
// caller feeds the same elapsed the HUD timer reads (floorRun.runElapsedMs —
// 0 before the first input, pinned once the run fails or clears), and every
// consumer derives its share: main.ts the plane + the slowed stride, echo.ts
// the eye-blindness (mirrorEyeBlind in frost.ts is the shared re-export),
// the mirror visuals their sunk height. Pure core, no three.js, no Math.random.
import {
  DWAAR_V_WATER_S,
  WATER_EYE_OFF_M,
  WATER_FULL_S,
  WATER_MAX_M,
  WATER_SLOW,
} from '../engine/constants';

/** The water depth in meters at `elapsedMs` since the run's first input.
 *  Linear to WATER_MAX_M at WATER_FULL_S (Dwaar V: DWAAR_V_WATER_S — the
 *  sunken arena floods 1.5× faster), clamped at both ends (a negative clock
 *  is still dry; the halls never deepen past 1.2 m). */
export function waterLevel(elapsedMs: number, dwaarFast = false): number {
  const fullS = dwaarFast ? DWAAR_V_WATER_S : WATER_FULL_S;
  return Math.max(0, Math.min(WATER_MAX_M, (elapsedMs / (fullS * 1000)) * WATER_MAX_M));
}

/** The wading multiplier: 1 while the water is shallow (≤ 0.6 m — inclusive,
 *  the boundary still walks free), ×WATER_SLOW past it. The caller multiplies
 *  the FIXED_STEP dt it feeds the player's stride and every Sentinel's and
 *  Echo's own — the decoys are exempt (copies don't drown). */
export function speedFactor(level: number): number {
  return level > 0.6 ? WATER_SLOW : 1;
}

/** True while the standing glass is submerged past its eyes: level above
 *  WATER_EYE_OFF_M (strict). Consumed by echo.sensesPlayer via frost.ts's
 *  `mirrorEyeBlind` re-export — a drowned pane is no eye, though the frost
 *  lantern still fogs whatever tops stay dry above it. */
export function eyeBlind(level: number): boolean {
  return level > WATER_EYE_OFF_M;
}

/** The visual sink: a mirror's scale.y while the halls flood — 1 − level/2,
 *  floored at 0.4 (drowned, never vanished; at the full 1.2 m the panes hold
 *  40% of their height). Visual only — the eye test above is the gameplay. */
export function mirrorWaterScale(level: number): number {
  return Math.max(0.4, 1 - level / 2);
}
