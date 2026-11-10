// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { CHIP_KEYS, fill, resolveLang, STRINGS, t } from '../../src/ui/i18n';

/** Keys whose strings carry {tokens} — parity must keep the token set equal. */
const PARAM_KEYS = [
  'overlay.cleared',
  'overlay.clearedBest',
  'overlay.tierStats',
  'hint.sealed',
  'hint.step',
  'hint.push',
  'hint.tactical',
  'settings.keyConflict',
  'misc.close',
  'caption.chhaya',
  'caption.cleared',
  'venue.banner',
  'about.version', // step007/T1 — {v} is the injected APP_VERSION in both langs
] as const;

const tokens = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('i18n — key parity', () => {
  it('en and hi carry exactly the same key set', () => {
    const en = Object.keys(STRINGS.en).sort();
    const hi = Object.keys(STRINGS.hi).sort();
    expect(hi).toEqual(en);
    expect(en.length).toBeGreaterThan(30); // the plan's ~34-key chrome table
  });

  it('every value in both tables is a non-empty string', () => {
    for (const lang of ['en', 'hi'] as const)
      for (const [k, v] of Object.entries(STRINGS[lang])) {
        expect(typeof v, `${lang}.${k}`).toBe('string');
        expect(v.length, `${lang}.${k}`).toBeGreaterThan(0);
      }
  });

  it('the table is really bilingual — hi differs from en almost everywhere', () => {
    const diffs = Object.keys(STRINGS.en).filter((k) => STRINGS.en[k] !== STRINGS.hi[k]);
    expect(diffs.length).toBeGreaterThan(20);
  });

  it('hi chip-class values stay single-line: ≤ 40 chars', () => {
    for (const k of CHIP_KEYS) {
      const v = STRINGS.hi[k]!;
      expect(v.length, `hi.${k} (${v})`).toBeLessThanOrEqual(40);
    }
  });

  it('hi chip-class values are proper Devanagari (except the EN switch label)', () => {
    for (const k of CHIP_KEYS) {
      if (k === 'btn.langEn') continue; // '🌐 EN' names English, in Latin
      expect(STRINGS.hi[k]!, `hi.${k}`).toMatch(/[\u0900-\u097F]/);
    }
  });

  it('CHIP_KEYS names only keys both tables actually have', () => {
    expect(CHIP_KEYS.length).toBeGreaterThan(10);
    for (const k of CHIP_KEYS) {
      expect(STRINGS.en[k], k).toBeDefined();
      expect(STRINGS.hi[k], k).toBeDefined();
    }
  });

  it('parameterized keys keep the identical {token} set in both langs', () => {
    for (const k of PARAM_KEYS) expect(tokens(STRINGS.hi[k]!), k).toEqual(tokens(STRINGS.en[k]!));
  });

  it('spot-checks: the enumerated surface exists (modes, views, chips, overlays, hints, tabs)', () => {
    for (const k of [
      'mode.keyboard',
      'view.focus',
      'btn.frost',
      'chip.streak',
      'overlay.failCaught',
      'overlay.descend',
      'overlay.tierTitle',
      'overlay.tierTitle2', // T2/T1 — the Dwaar II screen names Tier II
      'overlay.shardInterstitial', // T2/T5 — Dwaar I's 1.8s claim banner
      'chip.tier', // T2/T1 — the `L14 · T2` floor-chip suffix
      'hint.step',
      'hint.push',
      'hint.sealed',
      'tab.ask',
      'tab.hint',
      'tab.lore',
      'misc.close',
      'misc.playAgain',
      'misc.stay',
    ])
      expect(STRINGS.en[k], k).toBeDefined();
  });
});

describe('i18n — the T2/T5 Truth-Shard I interstitial', () => {
  it('en is the brief claim line the adjudication pinned, verbatim', () => {
    expect(STRINGS.en['overlay.shardInterstitial']).toBe(
      '✦ Truth-Shard I claimed — the house deepens…',
    );
  });

  it('hi carries its own authored line (Devanagari, never a copy of en)', () => {
    const hi = STRINGS.hi['overlay.shardInterstitial']!;
    expect(hi).toMatch(/[\u0900-\u097F]/);
    expect(hi).not.toBe(STRINGS.en['overlay.shardInterstitial']);
  });
});

describe('i18n — resolveLang priority: url > saved > navigator > en', () => {
  it('the url ?lang= wins over saved and navigator', () => {
    expect(resolveLang('en', 'hi', 'en-US')).toBe('hi');
    expect(resolveLang('hi', 'en', 'hi-IN')).toBe('en');
  });

  it('saved wins when the url carries no usable lang', () => {
    expect(resolveLang('hi', null, 'en-US')).toBe('hi');
    expect(resolveLang('en', null, 'hi-IN')).toBe('en');
    expect(resolveLang('hi', '', 'en-US')).toBe('hi'); // '' is absent, not a choice
  });

  it('navigator hi-* picks hindi when nothing is saved', () => {
    expect(resolveLang(undefined, null, 'hi-IN')).toBe('hi');
    expect(resolveLang(undefined, null, 'hi')).toBe('hi');
  });

  it('english otherwise — en navigator, no navigator at all', () => {
    expect(resolveLang(undefined, null, 'en-US')).toBe('en');
    expect(resolveLang(undefined, null, undefined)).toBe('en');
  });

  it('junk falls through the chain, never throws', () => {
    expect(resolveLang(undefined, 'fr', 'hi-IN')).toBe('hi'); // invalid url → navigator
    expect(resolveLang(undefined, 'fr', 'en-US')).toBe('en'); // …then the en floor
    expect(resolveLang(undefined, 'HINDI', undefined)).toBe('en'); // exact codes only
  });
});

describe('i18n — t() lookup + fallback', () => {
  it('returns each table value for each lang', () => {
    expect(t('en', 'mode.hybrid')).toBe(STRINGS.en['mode.hybrid']);
    expect(t('hi', 'mode.hybrid')).toBe(STRINGS.hi['mode.hybrid']);
  });

  it('falls back to en when a hi key goes missing (a parity hole never blanks the HUD)', () => {
    const key = 'chip.streak';
    const stolen = STRINGS.hi[key]!;
    delete STRINGS.hi[key];
    try {
      expect(t('hi', key)).toBe(STRINGS.en[key]);
    } finally {
      STRINGS.hi[key] = stolen; // restore — the rest of the suite sees the full table
    }
    expect(t('hi', key)).toBe(stolen);
  });

  it('an unknown key returns the key itself (visible, greppable, never empty)', () => {
    expect(t('en', 'nope.does-not-exist')).toBe('nope.does-not-exist');
    expect(t('hi', 'nope.does-not-exist')).toBe('nope.does-not-exist');
  });
});

describe('i18n — fill()', () => {
  it('substitutes every token once', () => {
    expect(fill('Floor cleared in {s} (best {best})', { s: '4.2s', best: '5.0s' })).toBe(
      'Floor cleared in 4.2s (best 5.0s)',
    );
    expect(fill('{floors} floors · {shards} shards', { floors: 10, shards: 65 })).toBe(
      '10 floors · 65 shards',
    );
  });

  it('leaves token-free text alone; numbers string themselves', () => {
    expect(fill('descending…', {})).toBe('descending…');
    expect(fill('beacons ({n}/{total})', { n: 2, total: 5 })).toBe('beacons (2/5)');
  });
});

// T3/T1 — the tier-three chrome: the T3 floor-chip suffix, the Dwaar III
// tier screen, and the Dwaar II interstitial that now descends into the
// Reflecting Gardens (the full screen belongs to Dwaar III alone).
describe('i18n — the T3 tier-three chrome', () => {
  it('en pins the tier-three chip suffix and the Truth-Shard III screen verbatim', () => {
    expect(STRINGS.en['chip.tier3']).toBe('T3');
    expect(STRINGS.en['overlay.tierTitle3']).toBe('✦ Truth-Shard III claimed — Tier III complete');
    expect(STRINGS.en['overlay.shardInterstitial2']).toBe(
      '✦ Truth-Shard II claimed — the house deepens…',
    );
  });

  it('hi carries its own authored lines (Devanagari, never copies of en)', () => {
    for (const k of ['chip.tier3', 'overlay.tierTitle3', 'overlay.shardInterstitial2']) {
      expect(STRINGS.hi[k], k).toMatch(/[\u0900-\u097F]/);
      expect(STRINGS.hi[k], k).not.toBe(STRINGS.en[k]);
    }
  });

  it('chip.tier3 is enumerated as a chip (single-line hi discipline applies)', () => {
    expect(CHIP_KEYS).toContain('chip.tier3');
  });
});
