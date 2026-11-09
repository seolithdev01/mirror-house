// SPDX-License-Identifier: Apache-2.0
// Raga-mood music theory — pure and deterministic given the rng.
// No browser APIs here; the WebAudio engine (engine.ts) consumes these.
import type { Rng } from '../engine/rng';
import { ANGER_MAX } from '../engine/constants';

/** Tier-one mood: Ahir-Bhairav-inspired heptatonic (both flat and sharp thirds). */
export const TIER_ONE_SCALE: readonly number[] = [0, 1, 4, 5, 7, 8, 11];

/** Tier-two mood: Durga-inspired pentatonic (major-ish, no semitone steps). */
export const TIER_TWO_SCALE: readonly number[] = [0, 2, 4, 7, 9];

/** Standard equal-temperament MIDI-note-number → Hz. */
export function midiToHz(semi: number): number {
  return 440 * Math.pow(2, (semi - 69) / 12);
}

/**
 * Raga-mood melody walk. Steps −2..+2 scale degrees from the nearest scale
 * tone to `prevSemi`; higher intensity widens the chance of two-degree leaps.
 * The result is clamped inside the [octave, octave+12] window (the window
 * bounds are scale roots, so clamping never leaves the scale).
 */
export function nextMelodySemi(
  rng: Rng,
  scale: readonly number[],
  prevSemi: number,
  intensity: number,
  octave: number
): number {
  const iv = Math.min(1, Math.max(0, intensity));
  // Extended degree ladder one octave either side of the window, so the walk
  // can overshoot and be folded back rather than freezing at an edge degree.
  const degrees: number[] = [];
  for (let o = -1; o <= 2; o++) for (const s of scale) degrees.push(octave + o * 12 + s);
  degrees.sort((a, b) => a - b);
  let idx = 0;
  let best = Infinity;
  for (let i = 0; i < degrees.length; i++) {
    const d = Math.abs(degrees[i]! - prevSemi);
    if (d < best) {
      best = d;
      idx = i;
    }
  }
  const dir = rng.chance(0.5) ? 1 : -1;
  const wide = rng.chance(0.15 + 0.45 * iv);
  const next = Math.min(degrees.length - 1, Math.max(0, idx + dir * (wide ? 2 : 1)));
  const semi = degrees[next]!;
  if (semi < octave) return octave;
  if (semi > octave + 12) return octave + 12;
  return semi;
}

/**
 * 8-tick teental-ish accent cycle. Low (`dhin`) lands on ticks 0 and 4, plus
 * tick 2 once intensity passes 0.6. High (`ta`) sits on odd ticks and opens
 * up tick by tick as intensity rises.
 */
export function beatAccents(tickIndex: number, intensity: number): { low: boolean; high: boolean } {
  const t = ((tickIndex % 8) + 8) % 8;
  const low = t === 0 || t === 4 || (t === 2 && intensity > 0.6);
  const highThresholds = [0.15, 0.35, 0.55, 0.75]; // ticks 1, 3, 5, 7
  const odd = [1, 3, 5, 7].indexOf(t);
  const high = odd >= 0 && intensity >= highThresholds[odd]!;
  return { low, high };
}

/**
 * The single threat→music mapping the game feeds the engine.
 * Cleared calms everything; failing is the loudest moment; otherwise anger
 * and pursuit pressure blend under a hard 0.95 ceiling.
 */
export function intensityFrom(input: {
  anger: number;
  chasing: number;
  failing: boolean;
  cleared: boolean;
}): number {
  if (input.cleared) return 0.1;
  if (input.failing) return 1;
  return Math.min(0.95, 0.2 + (input.anger / ANGER_MAX) * 0.4 + input.chasing * 0.2);
}
