// SPDX-License-Identifier: Apache-2.0
//
// Quality presets (M5/T4) — the three-point ladder every renderer knob reads.
// Pure data + one pure decision function; no three.js, no DOM — node unit
// tests import this module freely. main.ts owns the wiring: the effective
// preset (manual choice or the auto detector) picks the profile, pixelRatio
// applies live, and the mirror-side knobs (hero RT, RT size, Chhaya's bob)
// are read at the next floor build.

/** The three rungs of the quality ladder. */
export type PerfPreset = 'low' | 'mid' | 'high';

/** The player-facing choice: a pinned rung, or 'auto' to follow the frame
 *  rate. This is what persists in the save (`save.perf`). */
export type PerfChoice = PerfPreset | 'auto';

export const PERF_CHOICES: readonly PerfChoice[] = ['auto', 'low', 'mid', 'high'];

/** What one preset buys, per the plan's table:
 *  - `pixelRatioCap` — the renderer's devicePixelRatio cap (applies live).
 *  - `heroRt` — the entrance/exit hero mirrors run their render-target
 *    passes (false renders the reflective fake material instead — the
 *    no-RT path; TRUE mirrors always keep their RT, gameplay-critical).
 *  - `heroRtSize` — the hero RT resolution per side (applies on the next
 *    floor build).
 *  - `chhayaBob` — Chhaya's walking bob (a pure visual; off on low). */
export interface QualityProfile {
  pixelRatioCap: number;
  heroRt: boolean;
  heroRtSize: 256 | 512;
  chhayaBob: boolean;
}

export const PROFILES: Record<PerfPreset, QualityProfile> = {
  low: { pixelRatioCap: 1, heroRt: false, heroRtSize: 256, chhayaBob: false },
  mid: { pixelRatioCap: 1.5, heroRt: true, heroRtSize: 256, chhayaBob: true },
  high: { pixelRatioCap: 2, heroRt: true, heroRtSize: 512, chhayaBob: true },
};

/**
 * The auto detector. `fps` is main's rolling 5-second average of the
 * diagnostics FPS counter (a sustained read, not a single spike), `dpr` the
 * live devicePixelRatio. Hysteresis lives in the separated thresholds: a
 * sustained average under 45 drops to low; only 55+ frame rate ON a 2×+
 * screen climbs to high (sub-2× screens cap at mid — the extra pixels are
 * not there to spend); the 45..55 band is a stable mid either way.
 */
export function autoPreset(fps: number, dpr: number): PerfPreset {
  if (fps < 45) return 'low';
  if (fps >= 55 && dpr >= 2) return 'high';
  return 'mid';
}
