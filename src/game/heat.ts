// SPDX-License-Identifier: Apache-2.0
//
// Heat (T6/T2): the Furnace Wings' derived modifier. Floors 51–60 (the
// tier-six ramp) are HOT: the air halves the frost lantern's usefulness (a
// fogged pane evaporates in half the time) and every sprint-crack angers the
// house far more (25 per crack, not 15). T9/T1 — the heat RETURNS on the
// apex: the Warden's Warrens (81–90) burn the same way, the first mastered
// mechanic back as thin texture. Pure derivation — floor in, numbers out —
// no three.js, no DOM, no clock: main.ts reads these once per verb and per
// floor build, and frost/houseState stay floor-agnostic (the caller owns
// the duration and the anger amount; the helpers below own the floor math).
import {
  CRACK_ANGER,
  FOG_DURATION_MS,
  TIER_NINE_FLOORS,
  TIER_SIX_FLOORS,
} from '../engine/constants';

/** The Furnace's first ramp floor — the tier-six ramp's low end (51), the
 *  heat's floor too. Nothing below it is hot, no matter what burns. */
export const HEAT_FLOOR_START = 51;

/** T9/T1 — the heat's RETURN floor: the tier-nine ramp's low end (81), the
 *  Warrens' first burning floor. 61–80 stay cool — the Library and the
 *  Atrium never burned. */
export const HEAT_FLOOR_RETURN = 81;

/** The fog-evaporation multiplier in the Furnace: FOG_DURATION_MS × 0.5 —
 *  the lantern's breath still fogs, the heat just burns it off twice as fast. */
export const HEAT_FOG_FACTOR = 0.5;

/** Anger per sprint-cracked mirror in the Furnace: 25, against the house's
 *  usual CRACK_ANGER (15) — every crack you leave burns wider. */
export const HEAT_CRACK_ANGER = 25;

/** Is this floor one of the burning floors? 51–60 inclusive — the tier-six
 *  ramp, Dwaar VI included (the crucible burns hottest of all) — and, since
 *  T9, 81–90 inclusive — the Warden's Warrens, Dwaar IX included (the
 *  Warden's own forge); 50 and below stay cool, 61–80 stay cool, 91+ is not
 *  a floor at all. */
export function heatOn(floor: number): boolean {
  return (
    (floor >= HEAT_FLOOR_START && floor <= TIER_SIX_FLOORS) ||
    (floor >= HEAT_FLOOR_RETURN && floor <= TIER_NINE_FLOORS)
  );
}

/** How long a fogged pane STAYS fogged on this floor, in ms: FOG_DURATION_MS
 *  (25 s) on the cool floors, half of it (12.5 s) in the Furnace and the
 *  Warrens. */
export function fogDurationMs(floor: number): number {
  return FOG_DURATION_MS * (heatOn(floor) ? HEAT_FOG_FACTOR : 1);
}

/** Anger one sprint-crack costs on this floor: HEAT_CRACK_ANGER (25) in the
 *  Furnace and the Warrens, CRACK_ANGER (15) everywhere else. Taal's
 *  anger-touch (+20, his cameo floors' gimmick, floor ≤ 10 only) is NOT a
 *  crack and does not route through here — it stays TAAL_TOUCH_ANGER on
 *  every floor he walks it. */
export function crackAngerFor(floor: number): number {
  return heatOn(floor) ? HEAT_CRACK_ANGER : CRACK_ANGER;
}
