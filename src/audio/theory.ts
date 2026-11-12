// SPDX-License-Identifier: Apache-2.0
// Raga-mood music theory — pure and deterministic given the rng.
// No browser APIs here; the WebAudio engine (engine.ts) consumes these.
import type { Rng } from '../engine/rng';
import { ANGER_MAX } from '../engine/constants';

/** Tier-one mood: Ahir-Bhairav-inspired heptatonic (both flat and sharp thirds). */
export const TIER_ONE_SCALE: readonly number[] = [0, 1, 4, 5, 7, 8, 11];

/** Tier-two mood: Durga-inspired pentatonic (major-ish, no semitone steps). */
export const TIER_TWO_SCALE: readonly number[] = [0, 2, 4, 7, 9];

/** Tier-three mood: the Gardens' pastoral pentatonic (suspended fourth, no
 *  third — the flute's open, meadow-air contour; spec §6.1 row 3). */
export const TIER_THREE_SCALE: readonly number[] = [0, 2, 5, 7, 9];

/** Tier-four mood: the Carnival's mischievous pentatonic — the Durga frame
 *  with the third flattened a semitone, the minor-leaning hiccup that makes
 *  the funhouse grin (spec §6.1 row 4). */
export const TIER_FOUR_SCALE: readonly number[] = [0, 2, 3, 7, 9];

/** Tier-five mood: the Flood Halls' dark pentatonic — the minor frame with
 *  no second and no sixth (flat third, open fourth and fifth, flat seventh):
 *  the submerged scale the drowned halls hum (spec §6.1 row 5). */
export const TIER_FIVE_SCALE: readonly number[] = [0, 3, 5, 7, 10];

/** Tier-six mood: the Furnace Wings' urgent scale — the Phrygian-adjacent
 *  pentatonic (root, flat second's bite, fourth, fifth, flat sixth): the
 *  tense rung the crucible hums while the heat climbs (spec §6.1 row 6). */
export const TIER_SIX_SCALE: readonly number[] = [0, 1, 5, 7, 8];

/** Tier-seven mood: the Whisper Library's whispered pentatonic — root,
 *  second, flat third, fifth, flat sixth — the moonlit set the flute
 *  breathes through the stacks (spec §6.1 row 7). */
export const TIER_SEVEN_SCALE: readonly number[] = [0, 2, 3, 7, 8];

/** Tier-eight mood: the Frozen Atrium's austere suspended pentatonic — root,
 *  second, fourth, fifth, flat seventh, no third at all — the open frozen
 *  air the cold strings stretch (spec §6.1 row 8). */
export const TIER_EIGHT_SCALE: readonly number[] = [0, 2, 5, 7, 10];

/** Tier-nine mood: the Warden's Warrens' iron pentatonic — root, flat
 *  second's iron bite, minor third, fifth, flat sixth — the Phrygian-kin
 *  rung the warren grinds out under the saw through the apex (spec §6.1
 *  row 9). */
export const TIER_NINE_SCALE: readonly number[] = [0, 1, 3, 7, 8];

/** Tier-ten mood: the Foundations' three-note scale — root, fourth, fifth —
 *  the SPARSEST music in the game. Where every elder tier carried five notes
 *  (tier one seven), the Foundations hold three open intervals spread wide:
 *  the house holds its breath down here, and the flute breathes three stones
 *  into the dark (spec §6.1 row 10). */
export const TIER_TEN_SCALE: readonly number[] = [0, 5, 7];

/** T7/T3 — the whisper ceiling: tier 7's melody intensity never rises past
 *  0.55. Main applies it in the per-frame audio feed as a MULTIPLIER on the
 *  raw threat blend (the disclosed method): the blend never exceeds 1, so
 *  ×ceiling caps the drive at 0.55 — and hushes the calm 0.2 floor to 0.11,
 *  so the melody stays sparse, a whisper in the stacks, whatever the echoes
 *  are doing. */
export const TIER_SEVEN_INTENSITY_CEILING = 0.55;

/** T10/T3 — the ground ceiling: tier 10's melody intensity never rises past
 *  0.4 — the quietest ceiling in the game (the whisper's 0.55 hushed one
 *  step further). Main applies it in the per-frame audio feed with the same
 *  ×ceiling MULTIPLY pattern (the disclosed method, the blend never exceeds
 *  1, so ×0.4 caps the drive at 0.4 — and hushes the calm 0.2 floor to 0.08),
 *  so the three stone notes stay a murmur under the Foundations, whatever
 *  the echoes are doing. */
export const TIER_TEN_INTENSITY_CEILING = 0.4;

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
  octave: number,
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
