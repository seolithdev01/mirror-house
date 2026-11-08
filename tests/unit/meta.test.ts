// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  dailySeed,
  defaultMeta,
  nextStreak,
  recordRun,
  todayStamp,
  SEED_ALPHABET,
} from '../../src/game/meta';

describe('meta', () => {
  it('nextStreak: same day keeps, yesterday increments, gap resets to 1', () => {
    expect(nextStreak(3, '2026-11-08', '2026-11-08')).toBe(3);
    expect(nextStreak(3, '2026-11-07', '2026-11-08')).toBe(4);
    expect(nextStreak(3, '2026-11-01', '2026-11-08')).toBe(1);
    expect(nextStreak(0, '', '2026-11-08')).toBe(1);
  });
  it('dailySeed is deterministic, 6 chars of the alphabet, differs across days', () => {
    const a = dailySeed('2026-11-08');
    expect(a).toHaveLength(6);
    for (const ch of a) expect(SEED_ALPHABET.includes(ch)).toBe(true);
    expect(dailySeed('2026-11-08')).toBe(a);
    expect(dailySeed('2026-11-09')).not.toBe(a);
  });
  it('recordRun keeps min best and ticks streak', () => {
    const m0 = defaultMeta();
    const m1 = recordRun(m0, 'AAAA', 9000, '2026-11-08');
    expect(m1.best['AAAA']).toBe(9000);
    expect(m1.streak).toEqual({ count: 1, lastDay: '2026-11-08' });
    const m2 = recordRun(m1, 'AAAA', 7000, '2026-11-09');
    expect(m2.best['AAAA']).toBe(7000);
    expect(m2.streak.count).toBe(2);
    const m3 = recordRun(m2, 'AAAA', 8000, '2026-11-09');
    expect(m3.best['AAAA']).toBe(7000); // slower run does not overwrite best
  });
  it('todayStamp formats local YYYY-MM-DD', () => {
    expect(todayStamp(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
  });
});
