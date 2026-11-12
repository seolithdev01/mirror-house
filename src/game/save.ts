// SPDX-License-Identifier: Apache-2.0
import { TIER_EIGHT_FLOORS } from '../engine/constants';
import type { InputMode } from '../engine/input';
import type { Campaign } from './campaign';
import { DEFAULT_LOOK_NAME } from './look';
import { isValidSeed, randomSeed } from './seedCode';
import { PERF_CHOICES, type PerfChoice } from './quality';

/** The IDB save, generation 2 (M4/T4). Everything the game persists lives in
 *  this one record — meta v1's fields plus the language tag and the campaign
 *  progress — stored under the single key `main` of the `save` store.
 *  M5/T1: `a11y` is ADDITIVE — optional in validation (pre-M5 saves carry no
 *  such key and must keep validating), defaulted post-load by normalizeSave.
 *  M5/T4: `perf` arrives the same way — optional, healed to 'auto'. */
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
  /** Absent in pre-M5 saves; present in every save this build exports. */
  a11y?: A11ySettings;
  /** M5/T4 — the quality choice ('auto' follows the frame rate). Absent in
   *  pre-T4 saves; present in every save this build exports. */
  perf?: PerfChoice;
}

/** action name → KeyboardEvent.code. Readonly on purpose: rebinding (T2)
 *  copies; nothing mutates the default in place. */
export type KeyMap = Readonly<Record<string, string>>;

/** The 15 actions and their default codes (M5/T1, authoritative from the plan).
 *  Aaina moved from KeyQ to KeyI — her own key, Q/E stay pure turning. The one
 *  sanctioned dual: turnR and push share KeyE (push is contextual — the door
 *  claims E only while the push hint shows, via withoutKey). */
export const DEFAULT_KEYMAP: KeyMap = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  turnL: 'KeyQ',
  turnR: 'KeyE',
  frost: 'KeyF',
  view: 'KeyV',
  aaina: 'KeyI',
  push: 'KeyE',
  stepThrough: 'Space',
  faq: 'KeyH',
  mute: 'KeyM',
  tactical: 'KeyT',
};

/** The default accessibility block — nothing on unless asked for, 1× text. */
export const DEFAULT_A11Y: A11ySettings = {
  reducedFlash: false,
  captions: false,
  textScale: 1,
  keyMap: DEFAULT_KEYMAP,
};

/** M5/T1 — the accessibility settings. reducedFlash steadies every pulsing
 *  light; captions feeds the caption bar (T3); textScale drives the
 *  `--mh-text-scale` CSS var; keyMap is the code→action binding table (T2). */
export interface A11ySettings {
  reducedFlash: boolean;
  captions: boolean;
  textScale: 1 | 1.25 | 1.5;
  keyMap: KeyMap;
}

const MODES: readonly string[] = ['keyboard', 'mouse', 'hybrid'];
const LANGS: readonly string[] = ['en', 'hi'];
const TEXT_SCALES: readonly number[] = [1, 1.25, 1.5];
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
    a11y: { ...DEFAULT_A11Y, keyMap: { ...DEFAULT_KEYMAP } },
    perf: 'auto',
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
  if (
    Object.keys(raw).length !== 2 ||
    !Object.hasOwn(raw, 'count') ||
    !Object.hasOwn(raw, 'lastDay')
  )
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
  // T3/T1 — THE T2 LESSON: the bound widens in the same commit the campaign
  // range extends (T4/T1: 31–40 legal; T5/T1: 41–50 legal; T6/T1: floors
  // 51–60 legal; T7/T1: floors 61–70 legal; T8/T1: floors 71–80 legal, 81
  // the first rejection) or every tier-8 save wipes on reload.
  if (
    typeof floor !== 'number' ||
    !Number.isInteger(floor) ||
    floor < 1 ||
    floor > TIER_EIGHT_FLOORS
  )
    return null;
  if (typeof tierComplete !== 'boolean') return null;
  return { seedBase, floor, tierComplete };
}

/** Every KeyboardEvent.code value is PascalCase alphanumerics (`KeyW`,
 *  `ArrowUp`, `NumpadMultiply`, `F12`, `IntlYen`) starting with a capital
 *  letter. This is the SHAPE check — it rejects junk ('wasd', 'P', 'Key W')
 *  while accepting every code the capture UI can produce from a real event.
 *  M5/T5 exports it: the settings capture runs the SAME test on `e.code` at
 *  capture time, so a non-code-shaped value is refused before it can ever
 *  enter the save (the save's own gate stays the backstop for imports). */
export const CODE_RE = /^[A-Z][A-Za-z0-9]{1,23}$/;

/** The one sanctioned duplicate pair (M5/T2): turnR and push may share a code
 *  — the default KeyE — because push is contextual (the door claims the key
 *  only while its hint shows). No other pair, and never a triple. */
const DUAL_OK: readonly string[] = ['push', 'turnR'];

/** M5 final review — codes NO binding may be imported on, mirroring the
 *  capture UI's refusals (input.ts capturableCode + the capture's own
 *  Escape-cancel): `Arrow*`/`Shift*` are the hardwired move/sprint alternates
 *  that fire under every remap (a binding there would fire two verbs on one
 *  press), and Escape/Tab are the everywhere-dialog keys (close, focus
 *  cycle). One grandfather: the default map's own `sprint: 'ShiftLeft'` —
 *  the untouched default must keep validating, exactly as the capture
 *  refuses every NEW shift binding while the default ships one. */
const RESERVED_CODE_RE = /^(Arrow|Shift)/;
const RESERVED_CODES: readonly string[] = ['Escape', 'Tab'];

/** M5/T2 — the remap layer's keymap gate, stricter than T1's opaque box: the
 *  action set must be EXACTLY the 15 known actions (unknown actions rejected,
 *  missing ones too — a valid map binds every action), every code must be
 *  KeyboardEvent.code-shaped, no code may sit on the reserved families above
 *  (the default's ShiftLeft sprint excepted), and duplicated codes are legal
 *  only for the turnR+push pair. The result is a fresh map in
 *  DEFAULT_KEYMAP's canonical order; the validated object never shares
 *  structure with the input. */
function validateKeyMap(raw: unknown): KeyMap | null {
  if (!isPlainObject(raw)) return null;
  const actions = Object.keys(raw);
  const known = Object.keys(DEFAULT_KEYMAP);
  if (actions.length !== known.length) return null; // extra (unknown) or missing actions
  const byCode = new Map<string, string[]>();
  const out: Record<string, string> = {};
  for (const action of known) {
    // hasOwn, not truthiness: an own property is required, inherited or junk keys fail
    if (!Object.hasOwn(raw, action)) return null;
    const code: unknown = raw[action];
    if (typeof code !== 'string' || !CODE_RE.test(code)) return null;
    // M5 final review — a hand-edited file cannot smuggle in what the capture
    // UI would refuse; the default's own ShiftLeft sprint is the one survivor.
    if (
      !(action === 'sprint' && code === DEFAULT_KEYMAP.sprint) &&
      (RESERVED_CODE_RE.test(code) || RESERVED_CODES.includes(code))
    )
      return null;
    out[action] = code;
    byCode.set(code, [...(byCode.get(code) ?? []), action]);
  }
  for (const actions_ of byCode.values()) {
    if (actions_.length < 2) continue;
    if (actions_.length > 2 || actions_.some((a) => !DUAL_OK.includes(a))) return null;
  }
  return out;
}

/** M5/T1 — exact field set, exact types, scale on the 1/1.25/1.5 ladder. */
function validateA11y(raw: unknown): A11ySettings | null {
  if (!isPlainObject(raw)) return null;
  if (
    Object.keys(raw).length !== 4 ||
    !Object.hasOwn(raw, 'reducedFlash') ||
    !Object.hasOwn(raw, 'captions') ||
    !Object.hasOwn(raw, 'textScale') ||
    !Object.hasOwn(raw, 'keyMap')
  )
    return null;
  const { reducedFlash, captions, textScale, keyMap }: Record<string, unknown> = raw;
  if (typeof reducedFlash !== 'boolean') return null;
  if (typeof captions !== 'boolean') return null;
  if (typeof textScale !== 'number' || !TEXT_SCALES.includes(textScale)) return null;
  const map = validateKeyMap(keyMap);
  if (map === null) return null;
  return { reducedFlash, captions, textScale: textScale as A11ySettings['textScale'], keyMap: map };
}

/** M5/T4 — the perf choice gate: exactly one of the four codes ('auto' or a
 *  pinned preset). Quality.ts owns the list; the save only polices shape. */
function validatePerf(raw: unknown): raw is PerfChoice {
  return typeof raw === 'string' && (PERF_CHOICES as readonly string[]).includes(raw);
}

/** Strict v2 gate: exact field set (an own `__proto__` key from JSON.parse is
 *  an unknown field and fails), exact types, bounded numbers/strings. M5/T1:
 *  the `a11y` field is OPTIONAL — absent (every pre-M5 save) or fully valid;
 *  anything else fails. M5/T4: `perf` takes the same stance. Returns a fresh
 *  SaveData, or null for anything else. */
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
  const hasA11y = Object.hasOwn(raw, 'a11y');
  const hasPerf = Object.hasOwn(raw, 'perf');
  const keys = Object.keys(raw);
  if (keys.length !== EXPECTED.length + (hasA11y ? 1 : 0) + (hasPerf ? 1 : 0)) return null;
  if (EXPECTED.some((k) => !Object.hasOwn(raw, k))) return null;
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
  const a11y = hasA11y ? validateA11y(raw.a11y) : undefined;
  if (a11y === null) return null; // present but junk — reject, never half-trust
  let perf: PerfChoice | undefined;
  if (hasPerf) {
    if (!validatePerf(raw.perf)) return null; // same stance as a11y
    perf = raw.perf;
  }
  const out: SaveData = {
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
  return {
    ...out,
    ...(a11y === undefined ? {} : { a11y }),
    ...(perf === undefined ? {} : { perf }),
  };
}

// ---- normalization (M5/T1) ------------------------------------------------------

/** Post-load defaults for the additive a11y block and the M5/T4 perf choice:
 *  a pre-M5 save (no a11y — stored, exported, imported before this milestone)
 *  gains the default block, a pre-T4 save (no perf) gains 'auto', and junk
 *  heals to the same defaults rather than crashing boot. Valid fields pass
 *  through untouched — the same object, no churn. Runs after validateSave at
 *  boot; export keeps emitting the full shape either way. */
export function normalizeSave(s: SaveData): SaveData {
  const a11yOk = validateA11y(s.a11y) !== null;
  const perfOk = validatePerf(s.perf);
  if (a11yOk && perfOk) return s;
  return {
    ...s,
    ...(a11yOk ? {} : { a11y: { ...DEFAULT_A11Y, keyMap: { ...DEFAULT_KEYMAP } } }),
    ...(perfOk ? {} : { perf: 'auto' as PerfChoice }),
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
