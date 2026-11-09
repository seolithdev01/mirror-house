// SPDX-License-Identifier: Apache-2.0
import type { InputMode } from '../engine/input';
import { xmur3 } from '../engine/rng';
import { SEED_ALPHABET } from './seedCode';

export interface MetaSave {
  v: 1;
  lookName: string;
  mode: InputMode;
  best: Record<string, number>;
  streak: { count: number; lastDay: string };
  /** Additive (M2/T6): shards banked from cleared floors. Absent on older saves. */
  shards?: number;
}

export const META_KEY = 'mirrorhouse.meta.v1';
export { SEED_ALPHABET };

export function defaultMeta(mode: InputMode = 'hybrid'): MetaSave {
  return { v: 1, lookName: 'indigo-gold', mode, best: {}, streak: { count: 0, lastDay: '' } };
}

export function loadMeta(): MetaSave {
  try {
    const raw = globalThis.localStorage?.getItem(META_KEY);
    if (!raw) return defaultMeta();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && (parsed as { v?: number }).v === 1) {
      return parsed as MetaSave;
    }
  } catch {
    /* corrupted or unavailable storage — fall back to defaults */
  }
  return defaultMeta();
}

export function saveMeta(m: MetaSave): void {
  try {
    globalThis.localStorage?.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable (private mode) — play without persistence */
  }
}

export function todayStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nextStreak(count: number, lastDay: string, today: string): number {
  if (lastDay === today) return count;
  const dayMs = 86400000;
  const gap = new Date(today).getTime() - new Date(lastDay).getTime();
  return gap === dayMs ? count + 1 : 1;
}

export function dailySeed(stamp: string): string {
  const h = xmur3(`mirrorhouse-daily:${stamp}`);
  let n = h() >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += SEED_ALPHABET[n % SEED_ALPHABET.length];
    n = Math.floor(n / SEED_ALPHABET.length) + h();
  }
  return out;
}

export function recordRun(m: MetaSave, seed: string, ms: number, today: string): MetaSave {
  const prev = m.best[seed];
  return {
    ...m,
    best: prev === undefined || ms < prev ? { ...m.best, [seed]: ms } : m.best,
    streak: { count: nextStreak(m.streak.count, m.streak.lastDay, today), lastDay: today },
  };
}

/** Bank cleared-floor shards into the save (additive from an absent count). */
export function awardShards(m: MetaSave, gained: number): MetaSave {
  return { ...m, shards: (m.shards ?? 0) + gained };
}

/** Spend banked shards (M3/T2: Aaina's hints). Null when the balance cannot
 *  cover it — the caller keeps the old save; balances never go negative, and
 *  an absent count (older save) spends as an empty purse. */
export function spendShards(m: MetaSave, n: number): MetaSave | null {
  const banked = m.shards ?? 0;
  if (n < 0 || banked < n) return null;
  return { ...m, shards: banked - n };
}
