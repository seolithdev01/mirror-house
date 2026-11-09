// SPDX-License-Identifier: Apache-2.0
import { DWAAR_FLOOR, TIER_ONE_FLOORS } from '../engine/constants';

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

/** Start a fresh run of the tier at floor 1. */
export function newCampaign(seedBase: string): Campaign {
  return { seedBase, floor: 1, tierComplete: false };
}

/** Full seed for the current floor — the per-floor best-time bucket. */
export function floorSeed(c: Campaign): string {
  return `${c.seedBase}:${c.floor}`;
}

/** Stair Door transition: one floor deeper. Tier completion never happens here. */
export function descend(c: Campaign): Campaign {
  return { ...c, floor: c.floor + 1 };
}

/** Truth-Shard claim: only takes effect standing on the Dwaar floor. */
export function completeTier(c: Campaign): Campaign {
  return c.floor === DWAAR_FLOOR ? { ...c, tierComplete: true } : c;
}

/** The Dwaar threshold hall occupies the last floor of the tier. */
export function isDwaar(floor: number): boolean {
  return floor === DWAAR_FLOOR;
}

/** Best-time save key for the current floor (per-floor bucket, not per-run). */
export function bestKey(c: Campaign): string {
  return floorSeed(c);
}

/** Difficulty ramp, pinned for floors 1..TIER_ONE_FLOORS:
 *  echoes = min(5, 2 + floor - 1) on procedural floors (Dwaar fixed 4);
 *  beacons = 2,2,3,3,3,4,4,4,4,4;
 *  braid = 0.12 + 0.01*(floor-1);
 *  chhayaDelayMs = max(4500, 7000 - 300*(floor-1)) (Dwaar 4000). */
export function floorParams(floor: number): FloorRamp {
  const f = Math.min(Math.max(floor, 1), TIER_ONE_FLOORS);
  const dwaar = isDwaar(f);
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

/** Open-cell derivation from DWAAR_LAYOUT, row-major (first open cell is the
 *  entrance; a FloorGrid built from this opens edges between adjacent open
 *  cells only — see maze.floorFromGrid in T2). */
export function dwaarGrid(): {
  width: number;
  height: number;
  open: ReadonlyArray<{ x: number; y: number }>;
} {
  const open: { x: number; y: number }[] = [];
  DWAAR_LAYOUT.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '.') open.push({ x, y });
  });
  return { width: DWAAR_LAYOUT[0]!.length, height: DWAAR_LAYOUT.length, open };
}
