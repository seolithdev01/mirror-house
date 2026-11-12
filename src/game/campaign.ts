// SPDX-License-Identifier: Apache-2.0
import {
  AVART_SENTINEL_FLOOR,
  DWAAR_FLOOR,
  GHER_SENTINEL_FLOOR,
  TAAL_RETURN_FLOOR,
  TAAL_SENTINEL_FLOOR,
  TIER_EIGHT_FLOORS,
  TIER_FIVE_FLOORS,
  TIER_FOUR_FLOORS,
  TIER_NINE_FLOORS,
  TIER_ONE_FLOORS,
  TIER_SEVEN_FLOORS,
  TIER_SIX_FLOORS,
  TIER_THREE_FLOORS,
  TIER_TWO_FLOORS,
} from '../engine/constants';

/** The Tier-1 campaign: a base seed plus how deep the player stands in the house.
 *  Pure data — every transition returns a fresh object; nothing mutates in place. */
export interface Campaign {
  seedBase: string;
  floor: number;
  tierComplete: boolean;
}

/** Per-floor difficulty ramp consumed by the floor builder (T2) and Taal (T3). */
export interface FloorRamp {
  echoes: number;
  beacons: number;
  braid: number;
  chhayaDelayMs: number;
}

/** Beacon ramp for floors 1..10 (indexed floor-1). */
const BEACON_RAMP: readonly number[] = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4];

/** Echo ramp for floors 11..20 (indexed floor-11) — Dwaar II fixed at 5. */
const T2_ECHO_RAMP: readonly number[] = [5, 5, 5, 6, 6, 6, 6, 6, 6, 6];

/** Start a fresh run of the tier at floor 1. */
export function newCampaign(seedBase: string): Campaign {
  return { seedBase, floor: 1, tierComplete: false };
}

/** Full seed for the current floor — the per-floor best-time bucket. */
export function floorSeed(c: Campaign): string {
  return `${c.seedBase}:${c.floor}`;
}

/** Stair Door transition: one floor deeper. Tier completion never happens
 *  here — but LEAVING a Dwaar floor re-arms the tier flag for the tier
 *  below (Act I continues past Dwaar I), so the single `tierComplete` flag
 *  always reads "the CURRENT tier's threshold has been claimed".
 *  T9: the campaign is TERMINAL at floor 90 (Dwaar IX closes the house's
 *  fifth act of floors) — descend there is a NO-OP that returns the same
 *  object, so the tier screen is the end of the house until tier 10 exists.
 *  (The T8-era terminus at 80 is retired: 80 → 81 is a real descent now —
 *  Act III opens, the Warden's Warrens begin, and Dwaar VIII's claim joins
 *  the interstitial cascade like II/III/IV/V/VI/VII.) */
export function descend(c: Campaign): Campaign {
  if (c.floor >= TIER_NINE_FLOORS) return c; // the house ends at 90 — tier 10 is the next act
  const next: Campaign = { ...c, floor: c.floor + 1 };
  return isDwaar(c.floor) ? { ...next, tierComplete: false } : next;
}

/** Truth-Shard claim: only takes effect standing on a Dwaar floor —
 *  Dwaar I (10), Dwaar II (20), Dwaar III (30), Dwaar IV (40), Dwaar V
 *  (50), Dwaar VI (60), Dwaar VII (70), Dwaar VIII (80) or Dwaar IX (90).
 *  The flag stays single: each tier's completion sets it again after the
 *  descent from the tier above re-armed it. */
export function completeTier(c: Campaign): Campaign {
  return isDwaar(c.floor) ? { ...c, tierComplete: true } : c;
}

/** Which tier a floor belongs to: 1–10 → 1, 11–20 → 2, 21–30 → 3,
 *  31–40 → 4, 41–50 → 5, 51–60 → 6, 61–70 → 7, 71–80 → 8, 81–90 → 9. */
export function tierOf(floor: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  return floor > TIER_EIGHT_FLOORS
    ? 9
    : floor > TIER_SEVEN_FLOORS
      ? 8
      : floor > TIER_SIX_FLOORS
        ? 7
        : floor > TIER_FIVE_FLOORS
          ? 6
          : floor > TIER_FOUR_FLOORS
            ? 5
            : floor > TIER_THREE_FLOORS
              ? 4
              : floor > TIER_TWO_FLOORS
                ? 3
                : floor > TIER_ONE_FLOORS
                  ? 2
                  : 1;
}

/** The Dwaar threshold halls occupy the last floor of each tier. */
export function isDwaar(floor: number): boolean {
  return (
    floor === DWAAR_FLOOR ||
    floor === TIER_TWO_FLOORS ||
    floor === TIER_THREE_FLOORS ||
    floor === TIER_FOUR_FLOORS ||
    floor === TIER_FIVE_FLOORS ||
    floor === TIER_SIX_FLOORS ||
    floor === TIER_SEVEN_FLOORS ||
    floor === TIER_EIGHT_FLOORS ||
    floor === TIER_NINE_FLOORS
  );
}

// ---- the sentinel rotation (T5, extended T6/T7/T8/T9, spec §4.6) ------------
// The ladder STOPS GROWING: tiers 2–4 each added a Sentinel and the bare
// `>=` gates expressed that. Act II rotates instead — floors 41–49 hunt with
// Taal alone (Gher and Aavart rest — the ratified change), Dwaar V (50) was
// the first ALL-FOUR duel, T6's Furnace Wings turned the wheel again (TAAL
// RESTS 51–59, his first rest ever; Gher and Aavart RETURN to walk the
// Wings), T7's Whisper Library turned it once more (TAAL'S REST EXTENDED
// through 65, he RETURNED at TAAL_RETURN_FLOOR (66); GHER rested 61–69 and
// joined ONLY at the Dwaar VII duet (70); AAVART rested all of tier 7), T8's
// Frozen Atrium turned it again (TAAL AND GHER REST 71–79, called down ONLY
// for the Dwaar VIII duel; AAVART walked the whole Atrium beside Chhaya) —
// and T9's Warden's Warrens are the APEX: every rest ENDS at 81. The Dwaar
// VIII duel-call equality (=== 80) widens to open-ended ≥80 in Taal's and
// Gher's gates — from the duel floor on, neither rests again — and Aavart's
// `> 70` already walked the apex untouched. Floors 81–90 are ALL-FOUR floors
// (spec §4.6 row 9), Dwaar IX included; Chhaya has no gate, she walks every
// floor as always. Floors 1–80 read EXACTLY as the shipped t8 rotation did —
// the rotation only ever changes behavior where the plan ratifies it.

/** The beat-walker: his cameo floor (5) is a separate gate — from the
 *  Sentinel floor (11) through the Flood's close (50) he walked EVERY floor;
 *  the Furnace gave him his first rest (51–59), the Library EXTENDED it
 *  through 65 before TAAL_RETURN_FLOOR (66) brought him back for the duet's
 *  approach (66–70), the Atrium rested him again (71–79) — and from the
 *  Dwaar VIII duel call (80) onward he NEVER rests again: the apex keeps
 *  his beat walking every Warrens floor, Dwaar IX included. */
export function taalPresent(floor: number): boolean {
  return (
    (floor >= TAAL_SENTINEL_FLOOR && floor <= TIER_FIVE_FLOORS) ||
    (floor >= TAAL_RETURN_FLOOR && floor <= TIER_SEVEN_FLOORS) ||
    floor >= TIER_EIGHT_FLOORS
  );
}

/** The Encircler: from the Gardens (21) through the Carnival (40) — exactly
 *  the accumulated ladder he has always walked, floors 1–40 frozen — he
 *  rested on the Flood Halls (41–49, the ratified T5 rotation) until the
 *  Dwaar V duel called him down (50); the Furnace is HIS home tier (50–60,
 *  untouched by T7/T8), the Library gave him the whole tier off EXCEPT the
 *  Dwaar VII duet (70), the Atrium rested him again (71–79) — and from the
 *  Dwaar VIII duel call (80) onward he NEVER rests again: the circle closes
 *  on every Warrens floor, Dwaar IX included. */
export function gherPresent(floor: number): boolean {
  return (
    (floor >= GHER_SENTINEL_FLOOR && floor <= TIER_FOUR_FLOORS) ||
    (floor >= TIER_FIVE_FLOORS && floor <= TIER_SIX_FLOORS) ||
    floor === TIER_SEVEN_FLOORS ||
    floor >= TIER_EIGHT_FLOORS
  );
}

/** The Ambusher: the Carnival (31–40), the T5 rest (41–49), the Dwaar V
 *  duel (50) — and like the Encircler he returned for the whole Furnace
 *  (50–60). The Library rested him entirely (61–70): tier 7 belonged to the
 *  hearing Echoes and the duet. T8 brings him BACK — his gate walks the
 *  whole Atrium (71–80) and, open-ended past it, the whole Warrens: the
 *  frozen floors were his ambush, the warren is his apex, and the all-four
 *  duel closes the campaign's fifth act of floors. */
export function aavartPresent(floor: number): boolean {
  return (
    (floor >= AVART_SENTINEL_FLOOR && floor <= TIER_FOUR_FLOORS) ||
    (floor >= TIER_FIVE_FLOORS && floor <= TIER_SIX_FLOORS) ||
    floor > TIER_SEVEN_FLOORS
  );
}

/** Best-time save key for the current floor (per-floor bucket, not per-run). */
export function bestKey(c: Campaign): string {
  return floorSeed(c);
}

/** Difficulty ramp, pinned for floors 1..TIER_ONE_FLOORS:
 *  echoes = min(5, 2 + floor - 1) on procedural floors (Dwaar fixed 4);
 *  beacons = 2,2,3,3,3,4,4,4,4,4;
 *  braid = 0.12 + 0.01*(floor-1);
 *  chhayaDelayMs = max(4500, 7000 - 300*(floor-1)) (Dwaar 4000).
 *
 *  T2 — floors 11..TIER_TWO_FLOORS (the Hall of Ancestors):
 *  echoes = 5,5,5,6,6,6,6,6,6,6 (Dwaar II fixed 5);
 *  beacons = 4 on every floor;
 *  braid = 0.22 + 0.005*(floor-11);
 *  chhayaDelayMs = max(4000, 4500 - 50*(floor-11)) (Dwaar II 3800).
 *
 *  T3 — floors 21..TIER_THREE_FLOORS (the Reflecting Gardens):
 *  echoes = 6 on every floor (Dwaar III 6 too — the water-mirrors are the
 *  tier's teeth, not the echo count);
 *  beacons = 4 on every floor;
 *  braid = 0.24 + 0.004*(floor-21);
 *  chhayaDelayMs = max(3600, 4200 - 60*(floor-21)) (Dwaar III 3400).
 *
 *  T4 — floors 31..TIER_FOUR_FLOORS (the Carnival of Faces):
 *  echoes = 5 on every floor, Dwaar IV included — a DELIBERATE step DOWN
 *  from tier three's 6 (the ratified playability call: three lethal
 *  Sentinels walk tier 4, so the echoes yield the stage);
 *  beacons = 4 on every floor;
 *  braid = 0.28 + 0.004*(floor-31);
 *  chhayaDelayMs = max(3200, 3800 - 60*(floor-31)) (Dwaar IV 3000).
 *
 *  T5 — floors 41..TIER_FIVE_FLOORS (the Flood Halls):
 *  echoes = 4 on every procedural floor, Dwaar V ALONE carrying 5 (the
 *  row-9 apex duel — the tier's teeth are the rising water, the mirror-you
 *  decoys and the first all-four-Sentinel duel, not the echo count);
 *  beacons = 4 on every floor;
 *  braid = 0.30 + 0.004*(floor-41);
 *  chhayaDelayMs = max(3000, 3600 - 60*(floor-41)) (Dwaar V 2900 — the
 *  sunken arena floods, Chhaya does not wait).
 *
 *  T6 — floors 51..TIER_SIX_FLOORS (the Furnace Wings):
 *  echoes = 4 on every procedural floor, Dwaar VI ALONE carrying 5 (the
 *  four-Sentinel crucible duel is the tier's apex — the tier's teeth are
 *  the heat and the warden-guarded decoys, not the echo count);
 *  beacons = 4 on every floor;
 *  braid = 0.32 + 0.004*(floor-51);
 *  chhayaDelayMs = max(2900, 3500 - 60*(floor-51)) (Dwaar VI 2800 — the
 *  crucible burns, Chhaya does not wait).
 *
 *  T7 — floors 61..TIER_SEVEN_FLOORS (the Whisper Library):
 *  echoes = 4 on every procedural floor, Dwaar VII ALONE carrying 5 (the
 *  Taal+Gher duet is the tier's apex — the tier's teeth are the hearing
 *  Echoes and the noise economy, not the echo count);
 *  beacons = 4 on every floor;
 *  braid = 0.36 + 0.004*(floor-61);
 *  chhayaDelayMs = max(2700, 3300 - 60*(floor-61)) (Dwaar VII 2600 — the
 *  stacks hush, Chhaya does not wait).
 *
 *  T8 — floors 71..TIER_EIGHT_FLOORS (the Frozen Atrium):
 *  echoes = 4 on every procedural floor, Dwaar VIII ALONE carrying 5 (the
 *  all-four duel is the tier's apex — the tier's teeth are the frozen
 *  mirrors and the Ambusher's return, not the echo count);
 *  beacons = 4 on every floor;
 *  braid = 0.38 + 0.004*(floor-71);
 *  chhayaDelayMs = max(2600, 3200 - 60*(floor-71)) (Dwaar VIII 2500 — the
 *  atrium freezes, Chhaya does not wait).
 *
 *  T9 — floors 81..TIER_NINE_FLOORS (the Warden's Warrens):
 *  echoes = 5 on every procedural floor, Dwaar IX ALONE carrying 6 — one
 *  MORE than every elder duel hall: the warren is the tightest room in the
 *  house, all four Sentinels walk it, and the swarm is its breath;
 *  beacons = 4 on every floor;
 *  braid = 0.40 + 0.004*(floor-81);
 *  chhayaDelayMs = max(2400, 3000 - 60*(floor-81)) (Dwaar IX 2300 — the
 *  Warden's own halls, Chhaya does not wait). */
export function floorParams(floor: number): FloorRamp {
  const f = Math.min(Math.max(floor, 1), TIER_NINE_FLOORS);
  const dwaar = isDwaar(f);
  if (f > TIER_EIGHT_FLOORS) {
    return {
      echoes: dwaar ? 6 : 5,
      beacons: 4,
      braid: 0.4 + 0.004 * (f - TIER_EIGHT_FLOORS - 1),
      chhayaDelayMs: dwaar ? 2300 : Math.max(2400, 3000 - 60 * (f - TIER_EIGHT_FLOORS - 1)),
    };
  }
  if (f > TIER_SEVEN_FLOORS) {
    return {
      echoes: dwaar ? 5 : 4,
      beacons: 4,
      braid: 0.38 + 0.004 * (f - TIER_SEVEN_FLOORS - 1),
      chhayaDelayMs: dwaar ? 2500 : Math.max(2600, 3200 - 60 * (f - TIER_SEVEN_FLOORS - 1)),
    };
  }
  if (f > TIER_SIX_FLOORS) {
    return {
      echoes: dwaar ? 5 : 4,
      beacons: 4,
      braid: 0.36 + 0.004 * (f - TIER_SIX_FLOORS - 1),
      chhayaDelayMs: dwaar ? 2600 : Math.max(2700, 3300 - 60 * (f - TIER_SIX_FLOORS - 1)),
    };
  }
  if (f > TIER_FIVE_FLOORS) {
    return {
      echoes: dwaar ? 5 : 4,
      beacons: 4,
      braid: 0.32 + 0.004 * (f - TIER_FIVE_FLOORS - 1),
      chhayaDelayMs: dwaar ? 2800 : Math.max(2900, 3500 - 60 * (f - TIER_FIVE_FLOORS - 1)),
    };
  }
  if (f > TIER_FOUR_FLOORS) {
    return {
      echoes: dwaar ? 5 : 4,
      beacons: 4,
      braid: 0.3 + 0.004 * (f - TIER_FOUR_FLOORS - 1),
      chhayaDelayMs: dwaar ? 2900 : Math.max(3000, 3600 - 60 * (f - TIER_FOUR_FLOORS - 1)),
    };
  }
  if (f > TIER_THREE_FLOORS) {
    return {
      echoes: 5,
      beacons: 4,
      braid: 0.28 + 0.004 * (f - TIER_THREE_FLOORS - 1),
      chhayaDelayMs: dwaar ? 3000 : Math.max(3200, 3800 - 60 * (f - TIER_THREE_FLOORS - 1)),
    };
  }
  if (f > TIER_TWO_FLOORS) {
    return {
      echoes: 6,
      beacons: 4,
      braid: 0.24 + 0.004 * (f - TIER_TWO_FLOORS - 1),
      chhayaDelayMs: dwaar ? 3400 : Math.max(3600, 4200 - 60 * (f - TIER_TWO_FLOORS - 1)),
    };
  }
  if (f > TIER_ONE_FLOORS) {
    return {
      echoes: dwaar ? 5 : T2_ECHO_RAMP[f - TIER_ONE_FLOORS - 1]!,
      beacons: 4,
      braid: 0.22 + 0.005 * (f - TIER_ONE_FLOORS - 1),
      chhayaDelayMs: dwaar ? 3800 : Math.max(4000, 4500 - 50 * (f - TIER_ONE_FLOORS - 1)),
    };
  }
  return {
    echoes: dwaar ? 4 : Math.min(5, 2 + f - 1),
    beacons: BEACON_RAMP[f - 1]!,
    braid: 0.12 + 0.01 * (f - 1),
    chhayaDelayMs: dwaar ? 4000 : Math.max(4500, 7000 - 300 * (f - 1)),
  };
}

/** Hand-authored Dwaar I — Chhaya's threshold hall. 13×13, '#' = wall cell,
 *  '.' = open. Outer ring corridor, central sanctum with four approaches,
 *  inner mirrored shrine; invariant under 180° rotation so the exit mirrors
 *  the entrance. All 83 open cells form one connected component. */
export const DWAAR_LAYOUT: readonly string[] = [
  '#############',
  '#...........#',
  '#.##.#.#.##.#',
  '#.#.......#.#',
  '#.#.##.##.#.#',
  '#....#.#....#',
  '#.##.#.#.##.#',
  '#....#.#....#',
  '#.#.##.##.#.#',
  '#.#.......#.#',
  '#.##.#.#.##.#',
  '#...........#',
  '#############',
];

/** Hand-authored Dwaar II — Taal's threshold hall, floor 20. 13×13 like
 *  Dwaar I but MORE OPEN (96 open cells vs 83): a broad two-cell outer ring
 *  corridor, four doorways, and a large central chamber whose five pillar
 *  columns stand free of the walls. Invariant under 180° rotation so the
 *  exit mirrors the entrance. All 96 open cells form one connected
 *  component — the Sentinel needs the room to walk his beat. */
export const DWAAR_II_LAYOUT: readonly string[] = [
  '#############',
  '#...........#',
  '#...........#',
  '#..###.###..#',
  '#..#.....#..#',
  '#..#.#.#.#..#',
  '#.....#.....#',
  '#..#.#.#.#..#',
  '#..#.....#..#',
  '#..###.###..#',
  '#...........#',
  '#...........#',
  '#############',
];

/** Hand-authored Dwaar III — the garden hall, floor 30. 13×13 like its elders
 *  but the MOST OPEN of the three (107 open cells vs Dwaar II's 96, Dwaar I's
 *  83): a Reflecting Gardens parterre whose walls are DOTTED hedge runs —
 *  short L-shaped hedgerows tucked toward the corners (never a solid wall:
 *  no run longer than two cells) and four freestanding hedge bushes around
 *  the center. The central row and central column stand fully open: two
 *  11-cell sightlines clear across the hall (the water-mirrors need the long
 *  view). Invariant under 180° rotation so the exit mirrors the entrance;
 *  all 107 open cells form one connected component. */
export const DWAAR_III_LAYOUT: readonly string[] = [
  '#############',
  '#...........#',
  '#........#..#',
  '#.##.....##.#',
  '#...........#',
  '#...#...#...#',
  '#...........#',
  '#...#...#...#',
  '#...........#',
  '#.##.....##.#',
  '#..#........#',
  '#...........#',
  '#############',
];

/** Hand-authored Dwaar IV — the funhouse hall, floor 40, where Act I closes.
 *  13×13 like its elders, 101 open cells: a carnival funhouse whose walls
 *  are OFFSET ALCOVES — four single-pocket recesses tucked against the
 *  outer walls, one per wall, each rotated one position on from the last
 *  (never aligned with the compass axes, the stagger that makes the hall
 *  dizzy) — around a central RING/CAROUSEL: a Chebyshev-radius-2 ring of 12
 *  wall cells with EXACTLY 4 gaps at the compass midpoints, its 3×3 center
 *  chamber standing open (the carousel you circle while the Sentinels
 *  circle you). Invariant under 180° rotation so the exit mirrors the
 *  entrance; all 101 open cells form one connected component. */
export const DWAAR_IV_LAYOUT: readonly string[] = [
  '#############',
  '#..#.#......#',
  '#...........#',
  '#..........##',
  '#...##.##...#',
  '#...#...#..##',
  '#...........#',
  '##..#...#...#',
  '#...##.##...#',
  '##..........#',
  '#...........#',
  '#......#.#..#',
  '#############',
];

/** Hand-authored Dwaar V — the sunken arena, floor 50, where Act II closes
 *  on the row-9 apex duel (all four Sentinels). 13×13 like its elders, 101
 *  open cells: CONCENTRIC RINGS — a broad outer ring corridor two cells
 *  thick (the promenade, like Dwaar II's), a mid ring WALL (20 cells) with
 *  EXACTLY 4 gaps at the compass midpoints (the arena's four gates), an
 *  inner corridor circling the 3×3 inner sanctum at the center. No pillars:
 *  the sunken arena floor stands clean where Dwaar II hung its columns.
 *  Invariant under 180° rotation so the exit mirrors the entrance; all 101
 *  open cells form one connected component — four Sentinels need the room
 *  to walk their beats. */
export const DWAAR_V_LAYOUT: readonly string[] = [
  '#############',
  '#...........#',
  '#...........#',
  '#..###.###..#',
  '#..#.....#..#',
  '#..#.....#..#',
  '#...........#',
  '#..#.....#..#',
  '#..#.....#..#',
  '#..###.###..#',
  '#...........#',
  '#...........#',
  '#############',
];

/** Hand-authored Dwaar VI — the crucible forge, floor 60, where the
 *  campaign's second act of floors closes on the four-Sentinel duel (Taal
 *  back from rest). 13×13 like its elders, 101 open cells: TWIN PARALLEL
 *  FORGE CORRIDORS — two long 3-wide halls (cols 1–3 and 9–11, rows 1–11,
 *  33 cells each — the campaign's longest corridors) run the forge's length,
 *  joined at the ends by the open cross runs and joined in the MIDDLE by a
 *  central 3×3 CRUCIBLE CHAMBER through EXACTLY 4 connecting gaps (the W/E
 *  pairs (4,5)/(8,7) and (4,7)/(8,5) — the only openings on the crucible's
 *  perimeter; its N/S faces and the W/E middles stay wall, the forge mass).
 *  The forge's chimneys stand as three-wide wall blocks on the cross runs
 *  (rows 2 and 10) and single studs on rows 1 and 11. Invariant under 180°
 *  rotation so the exit mirrors the entrance; all 101 open cells form one
 *  connected component — four Sentinels need the room to walk their beats. */
export const DWAAR_VI_LAYOUT: readonly string[] = [
  '#############',
  '#.....#.....#',
  '#....###....#',
  '#...........#',
  '#...#####...#',
  '#...........#',
  '#...#...#...#',
  '#...........#',
  '#...#####...#',
  '#...........#',
  '#....###....#',
  '#.....#.....#',
  '#############',
];

/** Hand-authored Dwaar VII — the reading room, floor 70, where the
 *  campaign's third act of floors closes on the Taal+Gher duet (the
 *  beat-walker's return). 13×13 like its elders, 95 open cells: LONG
 *  PARALLEL SHELF-WALLS — four long wall runs (the stacks) laid across the
 *  hall on rows 3/5/7/9, each row a run (or a run pair) with single-cell
 *  gaps, separated by fully-open single-cell AISLES (rows 2/4/6/8/10) — and
 *  four READING ALCOVES at the shelf ends, one per shelf, each an open nook
 *  sandwiched between the shelf's end and a stub wall, 180°-mirrored in
 *  pairs ((3,3)↔(9,9) and (9,5)↔(3,7)). Invariant under 180° rotation so
 *  the exit mirrors the entrance; all 95 open cells form one connected
 *  component — the duet needs the room to walk its beats, and the blind
 *  Echoes need stacks to listen past. */
export const DWAAR_VII_LAYOUT: readonly string[] = [
  '#############',
  '#...........#',
  '#...........#',
  '#.#.######..#',
  '#...........#',
  '#...#####.#.#',
  '#...........#',
  '#.#.#####...#',
  '#...........#',
  '#..######.#.#',
  '#...........#',
  '#...........#',
  '#############',
];

/** Hand-authored Dwaar VIII — the frozen atrium, floor 80, where the
 *  campaign's fourth act of floors closes on the all-four duel (Taal and
 *  Gher called down from rest; Aavart back from his tier-7 sabbatical).
 *  13×13 like its elders, 97 open cells: a GRAND CENTRAL RING — the
 *  chebyshev-radius-3 wall ring (24 cells) around a fully-open 5×5 inner
 *  court, broken by EXACTLY 4 gaps at the compass midpoints (the atrium's
 *  four gates) — plus 4 RADIAL GALLERIES: one gallery wall on each
 *  ring-corner→hall-corner diagonal, 180°-mirrored in pairs ((2,2)↔(10,10)
 *  and (10,2)↔(2,10)), whose flanks form the narrow corner galleries a
 *  walker takes toward the entrance/exit corners. Nothing else is wall: the
 *  atrium floor stands grand where the Library crowded its stacks (the
 *  frozen panes need the long sightlines their thaw will close). Invariant
 *  under 180° rotation so the exit mirrors the entrance; all 97 open cells
 *  form one connected component — four Sentinels need the room to walk
 *  their beats. */
export const DWAAR_VIII_LAYOUT: readonly string[] = [
  '#############',
  '#...........#',
  '#.#.......#.#',
  '#..###.###..#',
  '#..#.....#..#',
  '#..#.....#..#',
  '#...........#',
  '#..#.....#..#',
  '#..#.....#..#',
  '#..###.###..#',
  '#.#.......#.#',
  '#...........#',
  '#############',
];

/** Hand-authored Dwaar IX — the Warden's Warrens, floor 90, where the
 *  campaign's fifth act of floors closes on the all-four apex duel (spec
 *  §4.6 row 9). 13×13 like its elders — but the INVERSION: where the elder
 *  halls opened rooms, the warren closes them. 85 open cells (fewer than
 *  every hall but Dwaar I's 83), staggered stud walls breaking every lane
 *  every 2–5 cells (no lane wider than five), and NOT ONE 2×2 widening —
 *  the aisles never widen, every corridor stays one cell thin. Twelve dead
 *  ends (six 180°-mirrored cache pairs) turn every hunt into a reading
 *  exercise, and a NEAR-SOLID WALL BAND across the middle row — the
 *  warren's waist — is pierced by EXACTLY three doors ((5,6)/(6,6)/(7,6)),
 *  the center sanctum cell seated between its two flanks: the Warden's own
 *  seat, the only wide breath in the room. Personal and claustrophobic by
 *  design: four Sentinels in a maze of narrow aisles, no grand court to
 *  kite in. Invariant under 180° rotation so the exit mirrors the
 *  entrance; all 85 open cells form one connected component — and the
 *  farthest cell from the entrance is the exit itself (11,11), UNIQUELY at
 *  20 steps, the elder derivation untouched. */
export const DWAAR_IX_LAYOUT: readonly string[] = [
  '#############',
  '#...#.#.....#',
  '#.#.....#.#.#',
  '#..#.#.#....#',
  '#.#.#....#.##',
  '#.....#.#...#',
  '#####...#####',
  '#...#.#.....#',
  '##.#....#.#.#',
  '#....#.#.#..#',
  '#.#.#.....#.#',
  '#.....#.#...#',
  '#############',
];

/** The hand-authored layout of a Dwaar floor: Dwaar I at 10, Dwaar II at 20,
 *  Dwaar III at 30, Dwaar IV at 40, Dwaar V at 50, Dwaar VI at 60, Dwaar
 *  VII at 70, Dwaar VIII at 80, Dwaar IX at 90. */
function dwaarLayout(floor: number): readonly string[] {
  if (floor === TIER_NINE_FLOORS) return DWAAR_IX_LAYOUT;
  if (floor === TIER_EIGHT_FLOORS) return DWAAR_VIII_LAYOUT;
  if (floor === TIER_SEVEN_FLOORS) return DWAAR_VII_LAYOUT;
  if (floor === TIER_SIX_FLOORS) return DWAAR_VI_LAYOUT;
  if (floor === TIER_FIVE_FLOORS) return DWAAR_V_LAYOUT;
  if (floor === TIER_FOUR_FLOORS) return DWAAR_IV_LAYOUT;
  if (floor === TIER_THREE_FLOORS) return DWAAR_III_LAYOUT;
  return floor === TIER_TWO_FLOORS ? DWAAR_II_LAYOUT : DWAAR_LAYOUT;
}

/** Open-cell derivation from a Dwaar layout, row-major (first open cell is
 *  the entrance; a FloorGrid built from this opens edges between adjacent
 *  open cells only — see maze.floorFromGrid). Defaults to Dwaar I; floor 20
 *  reads DWAAR_II_LAYOUT, floor 30 DWAAR_III_LAYOUT, floor 40
 *  DWAAR_IV_LAYOUT, floor 50 DWAAR_V_LAYOUT, floor 60 DWAAR_VI_LAYOUT,
 *  floor 70 DWAAR_VII_LAYOUT, floor 80 DWAAR_VIII_LAYOUT, floor 90
 *  DWAAR_IX_LAYOUT. */
export function dwaarGrid(floor: number = DWAAR_FLOOR): {
  width: number;
  height: number;
  open: ReadonlyArray<{ x: number; y: number }>;
} {
  const layout = dwaarLayout(floor);
  const open: { x: number; y: number }[] = [];
  layout.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '.') open.push({ x, y });
  });
  return { width: layout[0]!.length, height: layout.length, open };
}
