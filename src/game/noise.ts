// SPDX-License-Identifier: Apache-2.0
//
// T7/T2 — the noise ring: the pure event list the Whisper Library's Echoes
// hear. A NoiseEvent is one ping (position, radius, wall-clock `at`); emit
// appends and prunes (pings older than NOISE_TTL_MS drop, and the ring never
// holds more than NOISE_MAX_EVENTS — drop-oldest), hears is the ears-echo
// sense check (any audible ping), and loudestAt is the chase target — the
// NEAREST audible ping's position. Pure data-in/data-out: no three.js, no
// DOM, no Math.random. The caller keeps the ring fresh — prune covers the
// stand-still case where no new ping lands to carry the eviction.
import { NOISE_MAX_EVENTS, NOISE_TTL_MS } from '../engine/constants';

export interface NoiseEvent {
  x: number;
  y: number;
  r: number;
  at: number;
}

/** Drop pings older than NOISE_TTL_MS (an `at` exactly TTL behind `now` has
 *  lapsed) and return the fresh list — pure, the input is never mutated. */
export function prune(list: readonly NoiseEvent[], now: number): NoiseEvent[] {
  return list.filter((e) => now - e.at < NOISE_TTL_MS);
}

/** Append one ping at `now`, then evict: stale pings first (the TTL above),
 *  then drop-oldest past NOISE_MAX_EVENTS. Returns the new ring. */
export function emit(
  list: NoiseEvent[],
  x: number,
  y: number,
  r: number,
  now: number,
): NoiseEvent[] {
  const next = prune(list, now);
  next.push({ x, y, r, at: now });
  while (next.length > NOISE_MAX_EVENTS) next.shift();
  return next;
}

/** Does an ear at (ex, ey) hear this ring? Any ping whose radius reaches it
 *  (dist ≤ r, the boundary inclusive) is enough. The ring is assumed fresh —
 *  emit/prune own the eviction, so no clock is needed here. */
export function hears(list: readonly NoiseEvent[], ex: number, ey: number): boolean {
  for (const e of list) {
    if (Math.hypot(e.x - ex, e.y - ey) <= e.r) return true;
  }
  return false;
}

/** The chase target: the position of the CLOSEST ping the ear can hear —
 *  the loudest thing in its earshot. Null when quiet, the patrol signal. */
export function loudestAt(
  list: readonly NoiseEvent[],
  ex: number,
  ey: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const e of list) {
    const d = Math.hypot(e.x - ex, e.y - ey);
    if (d <= e.r && d < bestD) {
      bestD = d;
      best = { x: e.x, y: e.y };
    }
  }
  return best;
}
