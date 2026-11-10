// SPDX-License-Identifier: Apache-2.0
import { DWAAR_FLOOR, TIER_ONE_FLOORS, TIER_TWO_FLOORS } from '../engine/constants';

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
 *  always reads "the CURRENT tier's threshold has been claimed". */
export function descend(c: Campaign): Campaign {
  const next: Campaign = { ...c, floor: c.floor + 1 };
  return isDwaar(c.floor) ? { ...next, tierComplete: false } : next;
}

/** Truth-Shard claim: only takes effect standing on a Dwaar floor —
 *  Dwaar I (10) or Dwaar II (20). The flag stays single: tier two's
 *  completion sets it again after the descent from 10 re-armed it. */
export function completeTier(c: Campaign): Campaign {
  return isDwaar(c.floor) ? { ...c, tierComplete: true } : c;
}

/** Which tier a floor belongs to: 1–10 → 1, 11–20 → 2. */
export function tierOf(floor: number): 1 | 2 {
  return floor > TIER_ONE_FLOORS ? 2 : 1;
}

/** The Dwaar threshold halls occupy the last floor of each tier. */
export function isDwaar(floor: number): boolean {
  return floor === DWAAR_FLOOR || floor === TIER_TWO_FLOORS;
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
 *  chhayaDelayMs = max(4000, 4500 - 50*(floor-11)) (Dwaar II 3800). */
export function floorParams(floor: number): FloorRamp {
  const f = Math.min(Math.max(floor, 1), TIER_TWO_FLOORS);
  const dwaar = isDwaar(f);
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

/** The hand-authored layout of a Dwaar floor: Dwaar I at 10, Dwaar II at 20. */
function dwaarLayout(floor: number): readonly string[] {
  return floor === TIER_TWO_FLOORS ? DWAAR_II_LAYOUT : DWAAR_LAYOUT;
}

/** Open-cell derivation from a Dwaar layout, row-major (first open cell is
 *  the entrance; a FloorGrid built from this opens edges between adjacent
 *  open cells only — see maze.floorFromGrid). Defaults to Dwaar I; floor 20
 *  reads DWAAR_II_LAYOUT. */
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
