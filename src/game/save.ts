// SPDX-License-Identifier: Apache-2.0
import { TIER_ONE_FLOORS } from '../engine/constants';
import type { InputMode } from '../engine/input';
import type { Campaign } from './campaign';
import { DEFAULT_LOOK_NAME } from './look';
import { isValidSeed, randomSeed } from './seedCode';

/** The IDB save, generation 2 (M4/T4). Everything the game persists lives in
 *  this one record — meta v1's fields plus the language tag and the campaign
 *  progress — stored under the single key `main` of the `save` store. */
export interface SaveData {
  v: 2;
  lookName: string;
  mode: InputMode;
  muted: boolean;
  lang: 'en' | 'hi';
  shards: number;
  best: Record<string, number>;
  streak: { count: number; lastDay: string };
  progress: { seedBase: string; floor: number; tierComplete: boolean };
}

const MODES: readonly string[] = ['keyboard', 'mouse', 'hybrid'];
const LANGS: readonly string[] = ['en', 'hi'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHARDS_MAX = 1_000_000_000;
const STREAK_COUNT_MAX = 1_000_000;
const BEST_ENTRIES_MAX = 1000;
const STRING_MAX = 64;

/** A fresh save: indigo-gold, hybrid, unmuted, English, empty purse and
 *  records, standing on floor 1 of a random base. The seedBase parameter keeps
 *  the fn pure enough to test — boot passes nothing and takes the roll. */
export function defaultSave(seedBase: string = randomSeed()): SaveData {
  return {
    v: 2,
    lookName: DEFAULT_LOOK_NAME,
    mode: 'hybrid',
    muted: false,
    lang: 'en',
    shards: 0,
    best: {},
    streak: { count: 0, lastDay: '' },
    progress: { seedBase, floor: 1, tierComplete: false },
  };
}

// ---- validation --------------------------------------------------------------
// Strict by design: an imported or stored save is untrusted bytes until every
// field checks out, and the result is ALWAYS a freshly built plain tree — the
// validated object never shares structure with the input.

/** Plain-object gate: JSON.parse and structuredClone both produce these; a
 *  class instance, Date, or array does not pass, and neither does null. */
function isPlainObject(o: unknown): o is Record<string, unknown> {
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

function boundedString(s: unknown): s is string {
  return typeof s === 'string' && s.length >= 1 && s.length <= STRING_MAX;
}

/** '' (a streak never started) or a local YYYY-MM-DD with plausible month/day. */
function validDay(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  if (s === '') return true;
  if (!DAY_RE.test(s) || s.length !== 10) return false;
  const month = Number(s.slice(5, 7));
  const day = Number(s.slice(8, 10));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** Best times are floats (performance.now deltas) — finite and non-negative,
 *  integer-ness is NOT required; keys are bounded strings (`BASE:floor`). */
function validateBest(raw: unknown): Record<string, number> | null {
  if (!isPlainObject(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length > BEST_ENTRIES_MAX) return null;
  const out: Record<string, number> = {};
  for (const k of keys) {
    if (!boundedString(k)) return null;
    const v: unknown = raw[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
    out[k] = v;
  }
  return out;
}

function validateStreak(raw: unknown): SaveData['streak'] | null {
  if (!isPlainObject(raw)) return null;
  if (Object.keys(raw).length !== 2 || !Object.hasOwn(raw, 'count') || !Object.hasOwn(raw, 'lastDay'))
    return null;
  const { count, lastDay }: Record<string, unknown> = raw;
  if (
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > STREAK_COUNT_MAX
  )
    return null;
  if (!validDay(lastDay)) return null;
  return { count, lastDay };
}

function validateProgress(raw: unknown): SaveData['progress'] | null {
  if (!isPlainObject(raw)) return null;
  if (
    Object.keys(raw).length !== 3 ||
    !Object.hasOwn(raw, 'seedBase') ||
    !Object.hasOwn(raw, 'floor') ||
    !Object.hasOwn(raw, 'tierComplete')
  )
    return null;
  const { seedBase, floor, tierComplete }: Record<string, unknown> = raw;
  if (typeof seedBase !== 'string' || !isValidSeed(seedBase)) return null;
  if (typeof floor !== 'number' || !Number.isInteger(floor) || floor < 1 || floor > TIER_ONE_FLOORS)
    return null;
  if (typeof tierComplete !== 'boolean') return null;
  return { seedBase, floor, tierComplete };
}

/** Strict v2 gate: exact field set (an own `__proto__` key from JSON.parse is
 *  an unknown field and fails), exact types, bounded numbers/strings. Returns
 *  a fresh SaveData, or null for anything else. */
export function validateSave(raw: unknown): SaveData | null {
  if (!isPlainObject(raw)) return null;
  const EXPECTED: readonly string[] = [
    'v',
    'lookName',
    'mode',
    'muted',
    'lang',
    'shards',
    'best',
    'streak',
    'progress',
  ];
  const keys = Object.keys(raw);
  if (keys.length !== EXPECTED.length || EXPECTED.some((k) => !Object.hasOwn(raw, k))) return null;
  if (raw.v !== 2) return null;
  if (!boundedString(raw.lookName)) return null;
  if (typeof raw.mode !== 'string' || !MODES.includes(raw.mode)) return null;
  if (typeof raw.muted !== 'boolean') return null;
  if (typeof raw.lang !== 'string' || !LANGS.includes(raw.lang)) return null;
  if (
    typeof raw.shards !== 'number' ||
    !Number.isInteger(raw.shards) ||
    raw.shards < 0 ||
    raw.shards > SHARDS_MAX
  )
    return null;
  const best = validateBest(raw.best);
  if (best === null) return null;
  const streak = validateStreak(raw.streak);
  if (streak === null) return null;
  const progress = validateProgress(raw.progress);
  if (progress === null) return null;
  return {
    v: 2,
    lookName: raw.lookName,
    mode: raw.mode as InputMode,
    muted: raw.muted,
    lang: raw.lang as 'en' | 'hi',
    shards: raw.shards,
    best,
    streak,
    progress,
  };
}

// ---- migration ----------------------------------------------------------------

/** meta v1 (the localStorage era) → SaveData v2. Campaign progress starts
 *  fresh — the v1 save never knew the campaign — and language is 'en' (i18n
 *  arrives after the save chain). Whole-payload junk → defaultSave(); a partly
 *  corrupt meta salvages its good fields rather than losing a history over one
 *  bad column. */
export function migrateMeta(rawMeta: unknown): SaveData {
  const base = defaultSave();
  if (!isPlainObject(rawMeta) || rawMeta.v !== 1) return base;
  const lookName = boundedString(rawMeta.lookName) ? rawMeta.lookName : base.lookName;
  const mode =
    typeof rawMeta.mode === 'string' && MODES.includes(rawMeta.mode)
      ? (rawMeta.mode as InputMode)
      : base.mode;
  const best = validateBest(rawMeta.best) ?? base.best;
  const streak = validateStreak(rawMeta.streak) ?? base.streak;
  const shards =
    typeof rawMeta.shards === 'number' &&
    Number.isInteger(rawMeta.shards) &&
    rawMeta.shards >= 0 &&
    rawMeta.shards <= SHARDS_MAX
      ? rawMeta.shards
      : base.shards;
  const muted = typeof rawMeta.muted === 'boolean' ? rawMeta.muted : false;
  return { ...base, lookName, mode, muted, best, streak, shards };
}

// ---- campaign write-through ----------------------------------------------------

/** Progress update: the campaign's current spine becomes the save's progress.
 *  Pure — a new SaveData, a new progress box; the input keeps its own. */
export function mergeCampaign(s: SaveData, c: Campaign): SaveData {
  return {
    ...s,
    progress: { seedBase: c.seedBase, floor: c.floor, tierComplete: c.tierComplete },
  };
}

// ---- IDB wrapper ----------------------------------------------------------------
// Hand-rolled on purpose (~40 lines beats a dependency). Node has no
// indexedDB global, so the typeof guard turns both fns inert there — unit
// tests import this module freely. Storage failures never kill the boot: get
// degrades to null (default save), put degrades to a no-op (stateless play).

const DB_NAME = 'mirror-house';
const DB_VERSION = 1;
const STORE = 'save';
const SAVE_KEY = 'main';

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('mirror-house db blocked'));
  });
}

/** The stored save, validated — a corrupt record reads as absent so boot falls
 *  through to migration/defaults instead of trusting junk. */
export async function idbGet(): Promise<SaveData | null> {
  if (!hasIdb()) return null;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(SAVE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    return raw === null ? null : validateSave(raw);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function idbPut(s: SaveData): Promise<void> {
  if (!hasIdb()) return;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(s, SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    /* storage refused — play without persistence */
  } finally {
    db.close();
  }
}

/** Export format: pretty JSON with a trailing newline (a polite text file). */
export function serializeSave(s: SaveData): string {
  return `${JSON.stringify(s, null, 2)}\n`;
}
