// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  NOISE_ACTION_R,
  NOISE_MAX_EVENTS,
  NOISE_SPRINT_R,
  NOISE_TTL_MS,
  NOISE_WALK_EVERY_MS,
  NOISE_WALK_R,
} from '../../src/engine/constants';
import { emit, hears, loudestAt, prune, type NoiseEvent } from '../../src/game/noise';

// T7/T2 — the noise economy: the Whisper Library's Echoes are blind and track
// these pings instead of glass. emit/hears/loudestAt are the pinned pure core
// (plan Task 2); the ring is the only memory the stacks' wardens have.
describe('noise — the pinned economy constants', () => {
  it('sprint rings loud, walk rings soft, actions ping, walk pings per 500ms, TTL 1200ms, cap 24', () => {
    expect(NOISE_SPRINT_R).toBe(7);
    expect(NOISE_WALK_R).toBe(4);
    expect(NOISE_ACTION_R).toBe(2.5);
    expect(NOISE_WALK_EVERY_MS).toBe(500);
    expect(NOISE_TTL_MS).toBe(1200);
    expect(NOISE_MAX_EVENTS).toBe(24);
  });
});

describe('noise — emit (append + prune + cap)', () => {
  it('appends the ping and never mutates its input', () => {
    const before: NoiseEvent[] = [{ x: 0, y: 0, r: 5, at: 0 }];
    const after = emit(before, 10, 0, NOISE_SPRINT_R, 100);
    expect(before).toHaveLength(1); // pure — the input list is untouched
    expect(after).toHaveLength(2);
    expect(after[1]).toEqual({ x: 10, y: 0, r: NOISE_SPRINT_R, at: 100 });
  });

  it('drops events older than NOISE_TTL_MS — 1199ms stays, exactly 1200ms goes', () => {
    const kept = emit([{ x: 0, y: 0, r: 5, at: 0 }], 1, 1, 1, NOISE_TTL_MS - 1);
    expect(kept).toHaveLength(2); // the old ping survives its 1199th ms
    expect(kept[0]).toEqual({ x: 0, y: 0, r: 5, at: 0 });
    const gone = emit([{ x: 0, y: 0, r: 5, at: 0 }], 1, 1, 1, NOISE_TTL_MS);
    expect(gone).toHaveLength(1); // 1200ms old is stale — dropped
    expect(gone[0]).toEqual({ x: 1, y: 1, r: 1, at: NOISE_TTL_MS });
  });

  it('keeps at most NOISE_MAX_EVENTS — drop-oldest beyond the cap', () => {
    let list: NoiseEvent[] = [];
    for (let i = 0; i < NOISE_MAX_EVENTS + 6; i++) list = emit(list, i, 0, 3, i);
    expect(list).toHaveLength(NOISE_MAX_EVENTS);
    expect(list[0]!.x).toBe(6); // the six oldest pings fell off the far end
    expect(list[NOISE_MAX_EVENTS - 1]!.x).toBe(NOISE_MAX_EVENTS + 5); // the newest stays
  });

  it('prune drops stale pings and appends nothing — stand-still silence decays too', () => {
    expect(prune([{ x: 0, y: 0, r: 5, at: 0 }], NOISE_TTL_MS)).toHaveLength(0);
    const kept = prune([{ x: 0, y: 0, r: 5, at: 1 }], NOISE_TTL_MS);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toEqual({ x: 0, y: 0, r: 5, at: 1 });
  });
});

describe('noise — hears (the ears-echo sense check)', () => {
  it('an event at exactly its radius is heard — the boundary is dist ≤ r', () => {
    // the 3-4-5 triangle: dist(echo, event) is exactly 5
    expect(hears([{ x: 3, y: 4, r: 5, at: 0 }], 0, 0)).toBe(true);
    expect(hears([{ x: 3, y: 4, r: 4.99, at: 0 }], 0, 0)).toBe(false); // just outside
  });

  it('any single audible event in the ring is enough', () => {
    const list: NoiseEvent[] = [
      { x: 100, y: 0, r: NOISE_WALK_R, at: 0 }, // far beyond its own radius
      { x: 0, y: NOISE_ACTION_R, r: NOISE_ACTION_R, at: 0 }, // exact-radius hit
    ];
    expect(hears(list, 0, 0)).toBe(true);
  });

  it('an empty ring — or only inaudible pings — hears nothing', () => {
    expect(hears([], 0, 0)).toBe(false);
    expect(hears([{ x: 100, y: 0, r: NOISE_SPRINT_R, at: 0 }], 0, 0)).toBe(false);
  });
});

describe('noise — loudestAt (the chase target)', () => {
  it('returns the NEAREST audible event position, not merely the first', () => {
    const list: NoiseEvent[] = [
      { x: 8, y: 0, r: 10, at: 0 }, // audible but 8m out
      { x: 2, y: 0, r: 10, at: 0 }, // audible at 2m — the loudest
    ];
    expect(loudestAt(list, 0, 0)).toEqual({ x: 2, y: 0 });
  });

  it('events beyond their own radius are never the target', () => {
    expect(loudestAt([{ x: 5, y: 0, r: NOISE_WALK_R, at: 0 }], 0, 0)).toBeNull();
  });

  it('quiet is null — the patrol signal', () => {
    expect(loudestAt([], 0, 0)).toBeNull();
    expect(loudestAt([{ x: 100, y: 100, r: 3, at: 0 }], 0, 0)).toBeNull();
  });

  it('an exact-radius ping is a target too (same ≤ r boundary as hears)', () => {
    expect(loudestAt([{ x: 0, y: -NOISE_SPRINT_R, r: NOISE_SPRINT_R, at: 0 }], 0, 0)).toEqual({
      x: 0,
      y: -NOISE_SPRINT_R,
    });
  });
});
