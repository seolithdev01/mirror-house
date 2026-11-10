// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  ANGER_MAX,
  CRACK_ANGER,
  CRACK_RANGE,
  SHARD_PERFECT,
  SHARD_STUCK,
} from '../../src/engine/constants';
import { awardShards, defaultMeta } from '../../src/game/meta';
import type { MirrorRef } from '../../src/game/floorObjects';
import { initMirrorRuntime, type MirrorRuntime } from '../../src/game/frost';
import {
  applyCrack,
  bankOnClear,
  beaconsCaptured,
  crackTarget,
  exitUnlocked,
  initHouseState,
  isCollapse,
  shardsForClear,
} from '../../src/game/houseState';

const m = (id: number, kind: MirrorRef['kind'], x: number, z: number): MirrorRef => ({
  id,
  kind,
  x,
  z,
  rotY: 0,
  cellX: 0,
  cellY: 0,
  pairId: null,
  wallDir: null,
});

/** Runtime list matching the fixture ids — houseState matches by id, not index. */
const rt = (mirrors: MirrorRef[], cracked: number[] = []): MirrorRuntime[] =>
  initMirrorRuntime(mirrors).map((r) => (cracked.includes(r.id) ? { ...r, cracked: true } : r));

describe('houseState', () => {
  it('initHouseState starts calm, first attempt, nothing pending', () => {
    expect(initHouseState()).toEqual({ anger: 0, attempts: 0, shards: 0, crackedAny: false });
  });

  it('applyCrack adds CRACK_ANGER once per mirror and flags the runtime', () => {
    const mirrors = [m(0, 'standing', 0, 0), m(1, 'beacon', 1, 1)];
    const runtime = rt(mirrors);
    const h0 = initHouseState();
    const h1 = applyCrack(h0, runtime, 0);
    expect(h1.anger).toBe(CRACK_ANGER);
    expect(h1.crackedAny).toBe(true);
    expect(runtime[0]!.cracked).toBe(true);
    // second crack on the same mirror: no further anger, state identical
    const h2 = applyCrack(h1, runtime, 0);
    expect(h2).toEqual(h1);
    expect(h2.anger).toBe(CRACK_ANGER);
    // a different mirror still counts
    const h3 = applyCrack(h2, runtime, 1);
    expect(h3.anger).toBe(2 * CRACK_ANGER);
    // the input state is never mutated
    expect(h0.anger).toBe(0);
    expect(h0.crackedAny).toBe(false);
  });

  it('isCollapse at ANGER_MAX: 6 cracks hold, the 7th collapses', () => {
    const mirrors = Array.from({ length: 7 }, (_, i) => m(i, 'standing', i, 0));
    const runtime = rt(mirrors);
    let h = initHouseState();
    for (let i = 0; i < 6; i++) h = applyCrack(h, runtime, i);
    expect(h.anger).toBe(90);
    expect(isCollapse(h)).toBe(false);
    h = applyCrack(h, runtime, 6);
    expect(h.anger).toBeGreaterThanOrEqual(ANGER_MAX);
    expect(isCollapse(h)).toBe(true);
    expect(isCollapse({ ...h, anger: ANGER_MAX - 1 })).toBe(false);
    expect(isCollapse({ ...h, anger: ANGER_MAX })).toBe(true);
  });

  it('crackTarget: standing|beacon within CRACK_RANGE in the heading cone, only while sprinting', () => {
    const player = { x: 0, y: 0, heading: 0 }; // facing north (-y)
    const mirrors = [m(0, 'standing', 0, -0.8), m(1, 'true', 0, -0.5), m(2, 'silvered', 0.2, -0.5)];
    expect(crackTarget(mirrors, rt(mirrors), player, true)?.id).toBe(0);
    expect(crackTarget(mirrors, rt(mirrors), player, false)).toBeNull(); // walking never cracks
  });

  it('crackTarget rejects out-of-range, behind, and already-cracked mirrors; picks the nearest', () => {
    const player = { x: 0, y: 0, heading: 0 };
    const far = [m(0, 'standing', 0, -(CRACK_RANGE + 0.2))];
    expect(crackTarget(far, rt(far), player, true)).toBeNull(); // beyond CRACK_RANGE
    expect(
      crackTarget([m(0, 'standing', 0, 0.6)], rt([m(0, 'standing', 0, 0.6)]), player, true),
    ).toBeNull(); // behind
    const near = [m(0, 'standing', 0, -0.6), m(1, 'standing', 0, -0.9)];
    expect(crackTarget(near, rt(near, [1]), player, true)?.id).toBe(0); // id 1 already cracked
    const pair = [m(0, 'standing', 0, -0.9), m(1, 'standing', 0, -0.6)];
    expect(crackTarget(pair, rt(pair), player, true)?.id).toBe(1); // nearest wins
  });

  it('crackTarget: portraits crack exactly like standing glass (T2)', () => {
    const player = { x: 0, y: 0, heading: 0 };
    const mirrors = [m(0, 'portrait', 0, -0.8), m(1, 'true', 0, -0.5)];
    expect(crackTarget(mirrors, rt(mirrors), player, true)?.id).toBe(0);
    expect(crackTarget(mirrors, rt(mirrors, [0]), player, true)).toBeNull(); // already cracked
  });

  it('beaconsCaptured counts captured/total; exitUnlocked only when every beacon is captured', () => {
    const mirrors = [m(0, 'beacon', 0, 0), m(1, 'beacon', 1, 0), m(2, 'standing', 2, 0)];
    const runtime = rt(mirrors);
    expect(beaconsCaptured(mirrors, runtime)).toEqual({ captured: 0, total: 2 });
    expect(exitUnlocked(mirrors, runtime)).toBe(false);
    runtime[1]!.captured = true;
    expect(beaconsCaptured(mirrors, runtime)).toEqual({ captured: 1, total: 2 });
    expect(exitUnlocked(mirrors, runtime)).toBe(false);
    runtime[0]!.captured = true;
    expect(exitUnlocked(mirrors, runtime)).toBe(true);
  });

  it('exitUnlocked is vacuously true with no beacons', () => {
    const mirrors = [m(0, 'standing', 0, 0)];
    expect(exitUnlocked(mirrors, rt(mirrors))).toBe(true);
  });

  it('shardsForClear: perfect bonus without cracks, stuck bonus per confused echo, cracks forfeit the bonus', () => {
    const clean = { ...initHouseState(), crackedAny: false };
    const cracked = { ...initHouseState(), crackedAny: true };
    expect(shardsForClear(clean, 0)).toBe(SHARD_PERFECT);
    expect(shardsForClear(clean, 2)).toBe(SHARD_PERFECT + 2 * SHARD_STUCK);
    expect(shardsForClear(cracked, 0)).toBe(0);
    expect(shardsForClear(cracked, 3)).toBe(3 * SHARD_STUCK);
  });

  // M5/T5 — the Dwaar re-clear banking gate: a resumed floor-10 (tier already
  // complete in the save) must never bank a second clear bonus, while beacons
  // re-frosted on that visit were re-earned and still pay.
  it('bankOnClear: tier complete at entry forfeits the bonus, pending beacons still bank', () => {
    const staked = { ...initHouseState(), shards: 15 }; // 3 beacons captured this attempt
    // first clear — the tier was open at entry: beacons + perfect + stuck all bank
    expect(bankOnClear(staked, 2, false)).toBe(15 + SHARD_PERFECT + 2 * SHARD_STUCK);
    // re-clear — the tier was ALREADY complete at entry: beacons bank, the bonus never does
    expect(bankOnClear(staked, 2, true)).toBe(15);
    // a cracked re-clear is refused nothing extra (no bonus anyway) — beacons still pay
    expect(bankOnClear({ ...staked, crackedAny: true }, 3, true)).toBe(15);
    // the same cracked run on an open tier keeps its stuck bounties
    expect(bankOnClear({ ...staked, crackedAny: true }, 3, false)).toBe(15 + 3 * SHARD_STUCK);
    // an unstaked open-tier clear banks just the perfect bonus
    expect(bankOnClear(initHouseState(), 0, false)).toBe(SHARD_PERFECT);
  });

  it('awardShards is additive from undefined and never mutates the input save', () => {
    const m0 = defaultMeta();
    const m1 = awardShards(m0, 30);
    expect(m1.shards).toBe(30);
    expect(m0.shards).toBeUndefined();
    expect(m1.best).toBe(m0.best); // untouched fields pass through
    const m2 = awardShards(m1, 5);
    expect(m2.shards).toBe(35);
    expect(m1.shards).toBe(30);
    expect(awardShards({ ...m0, shards: 0 }, 0).shards).toBe(0);
  });
});
