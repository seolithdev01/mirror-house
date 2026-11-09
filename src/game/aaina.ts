// SPDX-License-Identifier: Apache-2.0
//
// Aaina (M3/T2) — the lantern's pure hint economy. Which advice she offers,
// what it costs, and which memories she has unlocked: all state-in/state-out,
// no three.js, no DOM. The dialogue overlay (src/ui/aaina.ts) is her face;
// this module is her mind.
import { ANGER_MAX } from '../engine/constants';

export interface HintContext {
  beaconsLeft: number;
  anger: number;
  chhayaNear: boolean;
  chasing: number;
  /** M4/T3 — Taal walks this floor (his cameo floor). */
  taalPresent: boolean;
  exitUnlocked: boolean;
  hintsUsed: number;
}

export type HintKind = 'exit' | 'beacons' | 'chhaya' | 'chase' | 'taal' | 'anger' | 'stuck';

export interface Hint {
  kind: HintKind;
  text: string;
}

/** First hint costs 5 shards; every hint bought this floor adds 5 more. */
export const SHARD_HINT_BASE = 5;
export const HINT_COST_GROWTH = 5;

/** She names the house's temper before it names the exit. */
const ANGER_HINT_AT = 60;

export const HINTS: Record<HintKind, string> = {
  beacons:
    'The 🪞 panes the counter tallies are the beacon mirrors. Walk to one, face it, and breathe frost (F) — a beacon frosts forever, banks five shards, and the stair door stays sealed until every last one is clouded.',
  exit: 'There — the beacons are all frosted and the stair door has turned gold. Walk through and descend. I will come along; stairs are the one thing I never argue with.',
  chase:
    'An Echo sees you through clear glass. Break its stare: fog the pane it watches through (F), or put honest stone between you. Enough frosted eyes in one place will spin it into a standstill.',
  taal: 'Taal is on this floor — the Sentinel who moves on the beat. He cannot kill you; his touch only angers the house. Cross him in the rest between the accents, when the lantern dims, and keep your count.',
  chhaya:
    'She is close — your own footsteps, seconds late, and quicker the deeper you go. Never retrace your path; bend your trail instead. And if you must, step through a True Mirror (Space) to somewhere your past never walked.',
  anger:
    'The house is furious — no sprinting near glass, not one step. Every cracked pane feeds it and at a hundred it comes down. Walk, and it will forget. Slowly. It never truly forgets.',
  stuck:
    'When lost, fog what sees you: any clear mirror between an Echo and you is an open eye — close it (F). Then count your beacons, keep your trail bent, and the door will find you.',
};

/** The hint she would offer right now — highest-priority situation first. */
export function nextHint(ctx: HintContext): Hint {
  let kind: HintKind;
  if (ctx.beaconsLeft > 0 && ctx.anger < ANGER_MAX) kind = 'beacons';
  else if (ctx.exitUnlocked) kind = 'exit';
  else if (ctx.chasing > 0) kind = 'chase';
  else if (ctx.taalPresent)
    kind = 'taal'; // chasing-adjacent: the beat-walker is about
  else if (ctx.chhayaNear) kind = 'chhaya';
  else if (ctx.anger >= ANGER_HINT_AT) kind = 'anger';
  else kind = 'stuck';
  return { kind, text: HINTS[kind] };
}

/** Shards a hint costs after `hintsUsed` purchases this floor: 5, 10, 15, … */
export function hintCost(hintsUsed: number): number {
  return SHARD_HINT_BASE + HINT_COST_GROWTH * Math.max(0, hintsUsed);
}

/** Floors cleared (distinct best seeds) → lore entries she will speak:
 *  0 → none, ≥1 → 2, ≥3 → 4, ≥6 → all 6. */
export function loreUnlockedCount(bestSeeds: number): number {
  if (bestSeeds >= 6) return LORE.length;
  if (bestSeeds >= 3) return 4;
  if (bestSeeds >= 1) return 2;
  return 0;
}

export const LORE: readonly string[] = [
  // 1 — the Glazier
  'The palace hired the Glazier when it ran out of honest walls. He silvered a thousand panes, and at the end asked only to be paid in what they reflected. The palace agreed. It has been reflecting him ever since. You will not meet him. You will meet what he left.',
  // 2 — Aaina's origin
  "I am a shard of the house's first true mirror — the one the Glazier silvered with his own breath. When it learned to speak, the palace broke it and scattered the pieces, which is how the house solves most of its problems. One shard was set in a lantern. That one is me. I guide, I hint, and yes — I occasionally judge.",
  // 3 — the Echoes
  'The Echoes were guests, once. They looked into the glass a little too long and a little too gratefully, and the house kept the reflection and let the rest of you go. They are blind now to everything but clear glass — fog what they watch through, and they are as lost as you feel.',
  // 4 — Chhaya
  'Chhaya was never a guest. She is your own path, walked seconds behind you, and quicker the deeper you go. Doubling back hands you to her; a True Mirror drops you where your past never went. You cannot outrun her — nobody outruns their own footsteps. You can only stop meeting them.',
  // 5 — the Sentinels
  'Four keepers, and you have met the first. Chhaya walks your past. Taal moves on the beat — the music you hear is his footsteps, so mind the rhythm. Gher seals exits. Aavart predicts. When you meet the last of them, I will not pretend to be calm.',
  // 6 — the Ground Door
  'One hundred floors down, past the last mirror, stands the Ground Door. It opens for exactly one thing: a guest who still walks out as themselves. Everything the house does — the glass, the game, even me — is the house trying to make that untrue. Descend carefully. I would like to see how this ends.',
];
