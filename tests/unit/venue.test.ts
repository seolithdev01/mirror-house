// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEMO_VENUE_ID,
  validateVenuePack,
  venueFloorParams,
  venueSeed,
  type VenuePack,
} from '../../src/game/venue';
import { SEED_ALPHABET } from '../../src/game/seedCode';

/** The canonical valid pack — every rejection case is one field off from this. */
const BASE: Record<string, unknown> = {
  v: 1,
  id: 'demo-glasshouse-cafe',
  name: 'Glasshouse Café — DEMO',
  tagline: 'A quiet café of sugar-glass — the demo of sponsored floors.',
  locale: {
    en: { tagline: 'A quiet café of sugar-glass — the demo of sponsored floors.' },
    hi: { tagline: 'चीनी-काँच का एक शांत कैफ़े — प्रायोजित मंज़िलों का डेमो।' },
  },
  accent: { primary: 0xc2548a, secondary: 0xd9a441 },
  floor: { width: 15, height: 15, braid: 0.18, beacons: 2, echoes: 3, standing: 5 },
};

/** BASE with one subtree swapped — the rejection-case builder. */
const with_ = (key: string, value: unknown): unknown => ({ ...BASE, [key]: value });
const floor_ = (patch: Record<string, unknown>): unknown => ({
  ...BASE,
  floor: { ...(BASE.floor as Record<string, unknown>), ...patch },
});

describe('validateVenuePack — strict shape', () => {
  it('accepts the baseline pack and returns it typed', () => {
    const p = validateVenuePack(structuredClone(BASE));
    expect(p).not.toBeNull();
    expect(p!.id).toBe('demo-glasshouse-cafe');
    expect(p!.accent.primary).toBe(0xc2548a);
  });

  it('rejects non-objects', () => {
    for (const raw of [null, undefined, 42, 'pack', true, [], () => {}])
      expect(validateVenuePack(raw), String(raw)).toBeNull();
  });

  it('rejects extra and missing top-level keys (exact keys)', () => {
    expect(validateVenuePack({ ...BASE, sponsor: 'acme' })).toBeNull();
    const missing = structuredClone(BASE);
    delete missing.tagline;
    expect(validateVenuePack(missing)).toBeNull();
  });

  it('rejects any version but 1', () => {
    expect(validateVenuePack(with_('v', 2))).toBeNull();
    expect(validateVenuePack(with_('v', '1'))).toBeNull();
  });

  it('rejects malformed ids', () => {
    for (const id of ['', 'de', 'Demo', 'demo_glass', 'demo café', 'a'.repeat(25), 'a/b'])
      expect(validateVenuePack(with_('id', id)), `id "${id}"`).toBeNull();
  });

  it('rejects empty or over-long name/tagline', () => {
    expect(validateVenuePack(with_('name', ''))).toBeNull();
    expect(validateVenuePack(with_('name', 'x'.repeat(49)))).toBeNull();
    expect(validateVenuePack(with_('tagline', ''))).toBeNull();
    expect(validateVenuePack(with_('tagline', 'x'.repeat(161)))).toBeNull();
  });

  it('rejects locale tables that are missing a language, asymmetric, or non-string', () => {
    const noHi = structuredClone(BASE);
    delete (noHi.locale as Record<string, unknown>).hi;
    expect(validateVenuePack(noHi)).toBeNull();
    expect(validateVenuePack(with_('locale', { en: {}, hi: {} }))).toBeNull(); // empty table
    const asym = {
      en: { tagline: 'a', note: 'b' },
      hi: { tagline: 'अ' },
    };
    expect(validateVenuePack(with_('locale', asym))).toBeNull();
    expect(
      validateVenuePack(with_('locale', { en: { tagline: 7 }, hi: { tagline: 'अ' } })),
    ).toBeNull();
    expect(
      validateVenuePack(with_('locale', { en: { tagline: '' }, hi: { tagline: 'अ' } })),
    ).toBeNull();
    // > 8 keys per table: not a pack, a wiki
    const big: Record<string, string> = {};
    for (let i = 0; i < 9; i++) big[`k${i}`] = `v${i}`;
    expect(validateVenuePack(with_('locale', { en: big, hi: big }))).toBeNull();
  });

  it('rejects accent colors outside 0x000000..0xffffff or non-integer', () => {
    expect(validateVenuePack(with_('accent', { primary: 0xc2548a }))).toBeNull(); // missing key
    expect(
      validateVenuePack(with_('accent', { primary: 0xc2548a, secondary: 0, extra: 1 })),
    ).toBeNull();
    expect(validateVenuePack(with_('accent', { primary: -1, secondary: 0 }))).toBeNull();
    expect(validateVenuePack(with_('accent', { primary: 0x1000000, secondary: 0 }))).toBeNull();
    expect(validateVenuePack(with_('accent', { primary: 0.5, secondary: 0 }))).toBeNull();
    expect(validateVenuePack(with_('accent', { primary: NaN, secondary: 0 }))).toBeNull();
  });

  it('rejects floor values outside the bounded/count ranges', () => {
    expect(validateVenuePack(floor_({ width: 10 }))).toBeNull();
    expect(validateVenuePack(floor_({ width: 26 }))).toBeNull();
    expect(validateVenuePack(floor_({ width: 15.5 }))).toBeNull();
    expect(validateVenuePack(floor_({ height: 10 }))).toBeNull();
    expect(validateVenuePack(floor_({ height: 26 }))).toBeNull();
    expect(validateVenuePack(floor_({ braid: -0.01 }))).toBeNull();
    expect(validateVenuePack(floor_({ braid: 0.51 }))).toBeNull();
    expect(validateVenuePack(floor_({ beacons: 0 }))).toBeNull();
    expect(validateVenuePack(floor_({ beacons: 7 }))).toBeNull();
    expect(validateVenuePack(floor_({ echoes: 0 }))).toBeNull();
    expect(validateVenuePack(floor_({ echoes: 7 }))).toBeNull();
    expect(validateVenuePack(floor_({ standing: -1 }))).toBeNull();
    expect(validateVenuePack(floor_({ standing: 11 }))).toBeNull();
    const extra = structuredClone(BASE);
    (extra.floor as Record<string, unknown>).rooms = 3;
    expect(validateVenuePack(extra)).toBeNull();
  });

  it('accepts every boundary value (the ranges are inclusive)', () => {
    const edge = validateVenuePack(
      floor_({ width: 11, height: 25, braid: 0.5, beacons: 6, echoes: 6, standing: 0 }),
    );
    expect(edge).not.toBeNull();
    expect(
      validateVenuePack(floor_({ width: 25, height: 11, braid: 0, standing: 10 })),
    ).not.toBeNull();
    expect(validateVenuePack(with_('accent', { primary: 0, secondary: 0xffffff }))).not.toBeNull();
  });
});

describe('validateVenuePack — the shipped DEMO pack', () => {
  const raw = JSON.parse(
    readFileSync(new URL('../../public/venues/demo-glasshouse-cafe.json', import.meta.url), 'utf8'),
  ) as unknown;

  it('the public file validates', () => {
    const p = validateVenuePack(raw);
    expect(p).not.toBeNull();
    expect(p!.id).toBe(DEMO_VENUE_ID);
  });

  it('carries the documented demo shape (rose/gold accents, 15×15/0.18/2/3/5)', () => {
    const p = validateVenuePack(raw)!;
    expect(p.name).toBe('Glasshouse Café — DEMO');
    expect(p.accent).toEqual({ primary: 0xc2548a, secondary: 0xd9a441 });
    expect(p.floor).toEqual({
      width: 15,
      height: 15,
      braid: 0.18,
      beacons: 2,
      echoes: 3,
      standing: 5,
    });
    // both locale tables carry a non-empty tagline
    expect(p.locale.en.tagline!.length).toBeGreaterThan(0);
    expect(p.locale.hi.tagline!.length).toBeGreaterThan(0);
  });
});

describe('venueFloorParams', () => {
  it('passes a validated pack straight through', () => {
    const p = validateVenuePack(structuredClone(BASE))!;
    expect(venueFloorParams(p)).toEqual({
      mazeOverrides: { width: 15, height: 15, braid: 0.18 },
      objectOverrides: { beacons: 2, echoes: 3, standing: 5 },
    });
  });

  it('clamps a hand-built (typed but unsanitized) pack into generator-safe ranges', () => {
    const wild = {
      ...BASE,
      floor: { width: 40, height: 3, braid: 2, beacons: 99, echoes: -4, standing: 50 },
    } as VenuePack;
    expect(venueFloorParams(wild)).toEqual({
      mazeOverrides: { width: 25, height: 11, braid: 0.5 },
      objectOverrides: { beacons: 6, echoes: 1, standing: 10 },
    });
  });

  it('rounds fractional sizes before clamping', () => {
    const frac = {
      ...BASE,
      floor: { width: 14.6, height: 11.2, braid: 0.2, beacons: 2, echoes: 3, standing: 5 },
    } as VenuePack;
    expect(venueFloorParams(frac).mazeOverrides).toEqual({ width: 15, height: 11, braid: 0.2 });
  });
});

describe('venueSeed', () => {
  const p = validateVenuePack(structuredClone(BASE))!;

  it('is deterministic — same pack + day, same seed', () => {
    expect(venueSeed(p, '2026-11-09')).toBe(venueSeed(p, '2026-11-09'));
  });

  it('is an 8-char code from the share alphabet (charset-valid)', () => {
    for (const day of ['2026-11-09', '2025-01-01', '1999-12-31']) {
      const s = venueSeed(p, day);
      expect(s).toHaveLength(8);
      for (const ch of s) expect(SEED_ALPHABET.includes(ch), `${s} char ${ch}`).toBe(true);
    }
  });

  it('changes with the day and with the pack id (a fresh floor tomorrow, per venue)', () => {
    expect(venueSeed(p, '2026-11-09')).not.toBe(venueSeed(p, '2026-11-10'));
    const other = validateVenuePack({ ...BASE, id: 'other-venue' })!;
    expect(venueSeed(other, '2026-11-09')).not.toBe(venueSeed(p, '2026-11-09'));
  });
});
