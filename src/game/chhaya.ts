// SPDX-License-Identifier: Apache-2.0
//
// Chhaya: the six-second shadow. A pure replay of the player's own path —
// no sensing, no steering; she stands where the player stood delayMs ago.
// recordPath/sampleDelayed never mutate their inputs.
import {
  CHHAYA_DELAY_MS,
  CHHAYA_PATH_MAX_SAMPLES,
  CHHAYA_PATH_WINDOW_MS,
} from '../engine/constants';

export interface PathSample {
  x: number;
  y: number;
  t: number;
}

export interface PathBracket {
  a: PathSample;
  b: PathSample;
}

/** Append a sample and age the path out. Drop the head while the *next*
 *  sample already predates the window — samples[0] stays as the last sample
 *  at/behind the cutoff, the anchor that brackets old targets — then hard-cap
 *  the length (the memory bound that binds at the 120Hz fixed step). */
export function recordPath(samples: PathSample[], x: number, y: number, t: number): PathSample[] {
  const next = [...samples, { x, y, t }];
  let start = 0;
  while (start + 1 < next.length && next[start + 1]!.t <= t - CHHAYA_PATH_WINDOW_MS) start++;
  if (next.length - start > CHHAYA_PATH_MAX_SAMPLES) start = next.length - CHHAYA_PATH_MAX_SAMPLES;
  return next.slice(start);
}

/** The sample pair straddling `target` (a.t <= target < b.t; samples are
 *  time-sorted). Past the end of the path the last pair is returned, so a
 *  heading derived from b − a keeps the direction of the last movement.
 *  Null when the path is empty or the target predates it (the grace window). */
export function bracketSamples(samples: PathSample[], target: number): PathBracket | null {
  const n = samples.length;
  if (n === 0 || target < samples[0]!.t) return null;
  if (n === 1) return { a: samples[0]!, b: samples[0]! };
  // largest i in [0, n-2] with samples[i].t <= target — binary search
  let lo = 0;
  let hi = n - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (samples[mid]!.t <= target) lo = mid;
    else hi = mid - 1;
  }
  return { a: samples[lo]!, b: samples[lo + 1]! };
}

/** Where Chhaya stands at `now`: the path position from `delayMs` ago,
 *  linearly interpolated between the bracketing samples and clamped to the
 *  last sample once the target runs past the path's end. Null until the
 *  first sample has expired — six seconds of grace at floor start. */
export function sampleDelayed(
  samples: PathSample[],
  now: number,
  delayMs = CHHAYA_DELAY_MS,
): { x: number; y: number } | null {
  const br = bracketSamples(samples, now - delayMs);
  if (br === null) return null;
  const span = br.b.t - br.a.t;
  if (span <= 0) return { x: br.a.x, y: br.a.y };
  const alpha = Math.min(Math.max((now - delayMs - br.a.t) / span, 0), 1);
  return { x: br.a.x + (br.b.x - br.a.x) * alpha, y: br.a.y + (br.b.y - br.a.y) * alpha };
}
