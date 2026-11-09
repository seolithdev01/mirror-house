// SPDX-License-Identifier: Apache-2.0
//
// Venue packs (M6/T1) — optional, versioned, strictly-validated side-floors.
// A pack is a JSON document under `public/venues/` naming a FICTIONAL (or
// permission-carrying — see PROVENANCE.md) venue: display strings, two accent
// colors, and bounded floor overrides. `validateVenuePack` is the single gate
// every pack passes through — exact keys, bounded sizes, sane counts — so a
// malformed or hostile document never reaches the floor builder. A venue
// floor is a SIDE-FLOOR: it runs the same machines as the campaign with the
// pack's parameters and its own daily seed, and never touches campaign,
// bests, or shard-banking state (main.ts owns that isolation).
import { xmur3 } from '../engine/rng';
import { SEED_ALPHABET } from './seedCode';

/** The pack document (v1). `locale` carries per-language display strings
 *  (e.g. `tagline`); the top-level `tagline` is the fallback. */
export interface VenuePack {
  v: 1;
  id: string;
  name: string;
  tagline: string;
  locale: { en: Record<string, string>; hi: Record<string, string> };
  accent: { primary: number; secondary: number };
  floor: {
    width: number;
    height: number;
    braid: number;
    beacons: number;
    echoes: number;
    standing: number;
  };
}

/** The shipped DEMO pack — fictional, clearly labeled, the pilot template. */
export const DEMO_VENUE_ID = 'demo-glasshouse-cafe';

/** Chhaya's delay on a venue floor: fixed mid-ramp — the side-floor's
 *  difficulty is the pack's own, never the campaign depth underneath it. */
export const VENUE_CHHAYA_DELAY_MS = 6500;

// ---- Validation bounds (the strict gate's numbers, one place) ---------------
export const VENUE_SIZE_MIN = 11;
export const VENUE_SIZE_MAX = 25;
export const VENUE_BRAID_MAX = 0.5;
export const VENUE_BEACONS_MIN = 1;
export const VENUE_BEACONS_MAX = 6;
export const VENUE_ECHOES_MIN = 1;
export const VENUE_ECHOES_MAX = 6;
export const VENUE_STANDING_MIN = 0;
export const VENUE_STANDING_MAX = 10;
const NAME_MAX = 48;
const STRING_MAX = 160;
const LOCALE_KEYS_MAX = 8;
const ID_RE = /^[a-z0-9-]{3,24}$/;
const LOCALE_KEY_RE = /^[a-z][a-z0-9_-]{0,31}$/;

const TOP_KEYS = ['v', 'id', 'name', 'tagline', 'locale', 'accent', 'floor'] as const;
const ACCENT_KEYS = ['primary', 'secondary'] as const;
const FLOOR_KEYS = ['width', 'height', 'braid', 'beacons', 'echoes', 'standing'] as const;

function isPlainObject(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null && !Array.isArray(o);
}

/** Exact key set — no extras, none missing. */
function hasExactKeys(o: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(o).sort();
  const want = [...keys].sort();
  return own.length === want.length && own.every((k, i) => k === want[i]);
}

function isBoundedString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

/** One locale table: 1..8 well-named keys, every value a non-empty string. */
function isLocaleTable(v: unknown): v is Record<string, string> {
  if (!isPlainObject(v)) return false;
  const keys = Object.keys(v);
  if (keys.length === 0 || keys.length > LOCALE_KEYS_MAX) return false;
  return keys.every((k) => LOCALE_KEY_RE.test(k) && isBoundedString(v[k], STRING_MAX));
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/** Strict validation → the typed pack, or null for ANY deviation. Exact keys
 *  at every level; ids slugged; sizes bounded 11..25; counts in sane ranges;
 *  accent colors true 24-bit integers. Strictness is the point: a pack is
 *  third-party-shaped data, and the floor builder trusts a validated pack
 *  completely. */
export function validateVenuePack(raw: unknown): VenuePack | null {
  if (!isPlainObject(raw) || !hasExactKeys(raw, TOP_KEYS)) return null;
  if (raw.v !== 1) return null;
  if (typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return null;
  if (!isBoundedString(raw.name, NAME_MAX) || !isBoundedString(raw.tagline, STRING_MAX))
    return null;
  if (!isPlainObject(raw.locale) || !hasExactKeys(raw.locale, ['en', 'hi'])) return null;
  if (!isLocaleTable(raw.locale.en) || !isLocaleTable(raw.locale.hi)) return null;
  // the two tables speak with one voice: identical key sets
  const en = Object.keys(raw.locale.en).sort();
  const hi = Object.keys(raw.locale.hi).sort();
  if (en.length !== hi.length || en.some((k, i) => k !== hi[i])) return null;
  if (!isPlainObject(raw.accent) || !hasExactKeys(raw.accent, ACCENT_KEYS)) return null;
  if (!isIntInRange(raw.accent.primary, 0, 0xffffff)) return null;
  if (!isIntInRange(raw.accent.secondary, 0, 0xffffff)) return null;
  if (!isPlainObject(raw.floor) || !hasExactKeys(raw.floor, FLOOR_KEYS)) return null;
  if (!isIntInRange(raw.floor.width, VENUE_SIZE_MIN, VENUE_SIZE_MAX)) return null;
  if (!isIntInRange(raw.floor.height, VENUE_SIZE_MIN, VENUE_SIZE_MAX)) return null;
  const braid = raw.floor.braid;
  if (typeof braid !== 'number' || !Number.isFinite(braid) || braid < 0 || braid > VENUE_BRAID_MAX)
    return null;
  if (!isIntInRange(raw.floor.beacons, VENUE_BEACONS_MIN, VENUE_BEACONS_MAX)) return null;
  if (!isIntInRange(raw.floor.echoes, VENUE_ECHOES_MIN, VENUE_ECHOES_MAX)) return null;
  if (!isIntInRange(raw.floor.standing, VENUE_STANDING_MIN, VENUE_STANDING_MAX)) return null;
  return raw as unknown as VenuePack;
}

/** The pack as floor-builder parameters: maze shape + object counts, clamped
 *  into the generator-safe ranges (belt-and-braces for hand-built packs that
 *  never passed the gate — a validated pack passes through unchanged). */
export function venueFloorParams(p: VenuePack): {
  mazeOverrides: { width: number; height: number; braid: number };
  objectOverrides: { beacons: number; echoes: number; standing: number };
} {
  const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
  return {
    mazeOverrides: {
      width: clamp(Math.round(p.floor.width), VENUE_SIZE_MIN, VENUE_SIZE_MAX),
      height: clamp(Math.round(p.floor.height), VENUE_SIZE_MIN, VENUE_SIZE_MAX),
      braid: clamp(p.floor.braid, 0, VENUE_BRAID_MAX),
    },
    objectOverrides: {
      beacons: clamp(Math.round(p.floor.beacons), VENUE_BEACONS_MIN, VENUE_BEACONS_MAX),
      echoes: clamp(Math.round(p.floor.echoes), VENUE_ECHOES_MIN, VENUE_ECHOES_MAX),
      standing: clamp(Math.round(p.floor.standing), VENUE_STANDING_MIN, VENUE_STANDING_MAX),
    },
  };
}

/** The pack's daily floor seed: 8 share-alphabet chars hashed from
 *  `${id}:${YYYY-MM-DD}` — deterministic per venue per day (the whole house
 *  plays one café today), a fresh floor tomorrow, never a campaign bucket. */
export function venueSeed(p: VenuePack, dayStamp: string): string {
  const h = xmur3(`venue:${p.id}:${dayStamp}`);
  let n = h() >>> 0;
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += SEED_ALPHABET[n % SEED_ALPHABET.length];
    n = Math.floor(n / SEED_ALPHABET.length) + h();
  }
  return out;
}

/** The pack's display string for a language: its locale table first, the
 *  top-level fallback second. Key lookups stay pack-scoped ('tagline', …). */
export function venueString(p: VenuePack, lang: 'en' | 'hi', key: string): string {
  return p.locale[lang][key] ?? p.locale.en[key] ?? p.tagline;
}
