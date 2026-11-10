// SPDX-License-Identifier: Apache-2.0
//
// The water-mirrors (T3/T3) — the Reflecting Gardens' standing pools. A pool
// is a CELL feature, not a MirrorRef: the frost lantern cannot fog it
// (fogTarget never sees it — it is not in the mirror list), the echoes see
// through it exactly like clear glass (echo.sensesPlayer's eye loop,
// kind-independent: both LOS + SENSE_RANGE), and the ONE thing that blinds
// it is the player's own step — come within WATER_RIPPLE_RADIUS and the pool
// ripples, its eye shut for WATER_RIPPLE_MS. Pure core, no three.js:
// rippleState is the TTL derivation every consumer shares (echo senses, the
// patch dim, the overhead dot); rippleTrigger is pure geometry (which pools
// the player disturbs — freshness is the caller's filter).
import { WATER_RIPPLE_MS, WATER_RIPPLE_RADIUS } from '../engine/constants';

/** One placed pool: the WORLD center of its cell (a pool may span 1 cell;
 *  placement lives in floorObjects.generateFloorObjects — 2–4 per tier-3
 *  floor, never on or beside the entrance/exit). */
export interface WaterPool {
  x: number;
  y: number;
}

/** Runtime pool state: the placed center plus the last ripple (null = still
 *  water). rippledAt is written by the game loop in place (the MirrorRuntime
 *  precedent) and cleared by resetFloor — pools persist with their floor. */
export interface WaterRuntime extends WaterPool {
  rippledAt: number | null;
}

/** Bind a floor's placed pools to fresh runtime entries (all still water). */
export function initWaterRuntime(pools: ReadonlyArray<WaterPool>): WaterRuntime[] {
  return pools.map((p) => ({ x: p.x, y: p.y, rippledAt: null }));
}

/**
 * True while the pool's ripple blinds its eye: the ripple moment itself is
 * blinded, the TTL's last ms is blinded, expiry (`at + WATER_RIPPLE_MS`) is
 * not — the same exclusive-expiry contract the mirror fog timers ride. Still
 * water (null) is never blinded.
 */
export function rippleState(at: number | null, now: number): boolean {
  return at !== null && now < at + WATER_RIPPLE_MS;
}

/**
 * Indices of pools the player just rippled: centers within
 * WATER_RIPPLE_RADIUS (inclusive at the rim, the FOG_RANGE convention).
 * Pure geometry — a pool already rippled blind still reports until its TTL
 * lapses; the caller filters on rippleState for fresh ripples only.
 */
export function rippleTrigger(
  playerX: number,
  playerY: number,
  pools: ReadonlyArray<WaterPool>,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < pools.length; i++) {
    const p = pools[i]!;
    if (Math.hypot(p.x - playerX, p.y - playerY) <= WATER_RIPPLE_RADIUS) out.push(i);
  }
  return out;
}
