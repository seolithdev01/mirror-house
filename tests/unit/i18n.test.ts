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
      'overlay.shardInterstitial4', // T5/T1 — Dwaar IV joins the cascade
      'overlay.tierTitle5', // T5/T1 — the Dwaar V screen names Tier V
      'overlay.tierTitle6', // T6/T1 — the Dwaar VI screen names Tier VI
      'overlay.tierTitle7', // T7/T1 — the Dwaar VII screen names Tier VII
      'overlay.tierTitle8', // T8/T1 — the Dwaar VIII screen names Tier VIII
      'overlay.shardInterstitial5', // T6/T1 — Dwaar V joins the cascade
      'overlay.shardInterstitial6', // T7/T1 — Dwaar VI joins the cascade
      'overlay.shardInterstitial7', // T8/T1 — Dwaar VII joins the cascade
      'overlay.actBanner', // T5/T1 — the Act II opening banner
      'overlay.actBannerNote', // T5/T1 — its "the house copies you" line
      'chip.tier', // T2/T1 — the `L14 · T2` floor-chip suffix
      'chip.tier5', // T5/T1 — the `L44 · T5` floor-chip suffix
      'chip.tier6', // T6/T1 — the `L54 · T6` floor-chip suffix
      'chip.tier7', // T7/T1 — the `L64 · T7` floor-chip suffix
      'chip.tier8', // T8/T1 — the `L74 · T8` floor-chip suffix
      'hint.step',
      'hint.push',
      'hint.sealed',
      'hint.heatNear', // T6/T2 — the Furnace's hint line, authored in both languages
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

// T5/T1 — Act II opens: the once-per-session banner on the first floor-41
// build, and the tier-five chrome (Truth-Shard V screen, Dwaar IV cascade).
describe('i18n — the T5 Act II banner + tier-five chrome', () => {
  it('the act banner names the act and the deception, verbatim', () => {
    expect(STRINGS.en['overlay.actBanner']).toBe('ACT II — THE DECEPTION');
    expect(STRINGS.en['overlay.actBannerNote']).toBe('The house has begun copying you.');
  });

  it('the act banner carries authored hindi (Devanagari, never a copy of en)', () => {
    for (const k of ['overlay.actBanner', 'overlay.actBannerNote']) {
      const hi = STRINGS.hi[k]!;
      expect(hi, k).toMatch(/[\u0900-\u097F]/);
      expect(hi, k).not.toBe(STRINGS.en[k]);
    }
  });

  it('Truth-Shard V names Tier V complete on the full tier screen', () => {
    expect(STRINGS.en['overlay.tierTitle5']).toBe('✦ Truth-Shard V claimed — Tier V complete');
    expect(STRINGS.hi['overlay.tierTitle5']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.tierTitle5']).not.toBe(STRINGS.en['overlay.tierTitle5']);
  });

  it('Dwaar IV joins the interstitial cascade with its own shard line', () => {
    expect(STRINGS.en['overlay.shardInterstitial4']).toBe(
      '✦ Truth-Shard IV claimed — the house deepens…',
    );
    expect(STRINGS.hi['overlay.shardInterstitial4']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.shardInterstitial4']).not.toBe(
      STRINGS.en['overlay.shardInterstitial4'],
    );
  });

  it('the tier-five chip suffix exists in both languages', () => {
    expect(STRINGS.en['chip.tier5']).toBe('T5');
    expect(STRINGS.hi['chip.tier5']!).toMatch(/[\u0900-\u097F]/);
  });
});

// T6/T1 — the Furnace Wings chrome: the Dwaar VI tier screen, Dwaar V joining
// the interstitial cascade, and the `L54 · T6` floor-chip suffix.
describe('i18n — the T6 tier-six chrome', () => {
  it('Truth-Shard VI names Tier VI complete on the full tier screen', () => {
    expect(STRINGS.en['overlay.tierTitle6']).toBe('✦ Truth-Shard VI claimed — Tier VI complete');
    expect(STRINGS.hi['overlay.tierTitle6']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.tierTitle6']).not.toBe(STRINGS.en['overlay.tierTitle6']);
  });

  it('Dwaar V joins the interstitial cascade with its own shard line', () => {
    expect(STRINGS.en['overlay.shardInterstitial5']).toBe(
      '✦ Truth-Shard V claimed — the house deepens…',
    );
    expect(STRINGS.hi['overlay.shardInterstitial5']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.shardInterstitial5']).not.toBe(
      STRINGS.en['overlay.shardInterstitial5'],
    );
  });

  it('the tier-six chip suffix exists in both languages', () => {
    expect(STRINGS.en['chip.tier6']).toBe('T6');
    expect(STRINGS.hi['chip.tier6']!).toMatch(/[\u0900-\u097F]/);
  });
});

// T7/T1 — the Whisper Library chrome: the Dwaar VII tier screen, Dwaar VI
// joining the interstitial cascade, and the `L64 · T7` floor-chip suffix.
describe('i18n — the T7 tier-seven chrome', () => {
  it('Truth-Shard VII names Tier VII complete on the full tier screen', () => {
    expect(STRINGS.en['overlay.tierTitle7']).toBe('✦ Truth-Shard VII claimed — Tier VII complete');
    expect(STRINGS.hi['overlay.tierTitle7']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.tierTitle7']).not.toBe(STRINGS.en['overlay.tierTitle7']);
  });

  it('Dwaar VI joins the interstitial cascade with its own shard line', () => {
    expect(STRINGS.en['overlay.shardInterstitial6']).toBe(
      '✦ Truth-Shard VI claimed — the house deepens…',
    );
    expect(STRINGS.hi['overlay.shardInterstitial6']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.shardInterstitial6']).not.toBe(
      STRINGS.en['overlay.shardInterstitial6'],
    );
  });

  it('the tier-seven chip suffix exists in both languages', () => {
    expect(STRINGS.en['chip.tier7']).toBe('T7');
    expect(STRINGS.hi['chip.tier7']!).toMatch(/[\u0900-\u097F]/);
  });

  it('chip.tier7 is enumerated as a chip (single-line hi discipline applies)', () => {
    expect(CHIP_KEYS).toContain('chip.tier7');
  });
});

// T8/T1 — the Frozen Atrium chrome: the Dwaar VIII tier screen, Dwaar VII
// cascading to the 1.8s interstitial, and the `L74 · T8` floor-chip suffix.
describe('i18n — the T8 tier-eight chrome', () => {
  it('Truth-Shard VIII names Tier VIII complete on the full tier screen', () => {
    expect(STRINGS.en['overlay.tierTitle8']).toBe(
      '✦ Truth-Shard VIII claimed — Tier VIII complete',
    );
    expect(STRINGS.hi['overlay.tierTitle8']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.tierTitle8']).not.toBe(STRINGS.en['overlay.tierTitle8']);
  });

  it('Dwaar VII joins the interstitial cascade with its own shard line', () => {
    expect(STRINGS.en['overlay.shardInterstitial7']).toBe(
      '✦ Truth-Shard VII claimed — the house deepens…',
    );
    expect(STRINGS.hi['overlay.shardInterstitial7']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.shardInterstitial7']).not.toBe(
      STRINGS.en['overlay.shardInterstitial7'],
    );
  });

  it('the tier-eight chip suffix exists in both languages', () => {
    expect(STRINGS.en['chip.tier8']).toBe('T8');
    expect(STRINGS.hi['chip.tier8']!).toMatch(/[\u0900-\u097F]/);
  });

  it('chip.tier8 is enumerated as a chip (single-line hi discipline applies)', () => {
    expect(CHIP_KEYS).toContain('chip.tier8');
  });
});

// T9/T1 — the Warden's Warrens chrome: the Dwaar IX tier screen, Dwaar VIII
// cascading to the 1.8s interstitial, the `L84 · T9` floor-chip suffix, and
// the ACT III banner that opens the act at floor 81.
describe('i18n — the T9 tier-nine chrome', () => {
  it('Truth-Shard IX names Tier IX complete on the full tier screen', () => {
    expect(STRINGS.en['overlay.tierTitle9']).toBe('✦ Truth-Shard IX claimed — Tier IX complete');
    expect(STRINGS.hi['overlay.tierTitle9']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.tierTitle9']).not.toBe(STRINGS.en['overlay.tierTitle9']);
  });

  it('Dwaar VIII joins the interstitial cascade with its own shard line', () => {
    expect(STRINGS.en['overlay.shardInterstitial8']).toBe(
      '✦ Truth-Shard VIII claimed — the house deepens…',
    );
    expect(STRINGS.hi['overlay.shardInterstitial8']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.shardInterstitial8']).not.toBe(
      STRINGS.en['overlay.shardInterstitial8'],
    );
  });

  it('the tier-nine chip suffix exists in both languages', () => {
    expect(STRINGS.en['chip.tier9']).toBe('T9');
    expect(STRINGS.hi['chip.tier9']!).toMatch(/[\u0900-\u097F]/);
  });

  it('chip.tier9 is enumerated as a chip (single-line hi discipline applies)', () => {
    expect(CHIP_KEYS).toContain('chip.tier9');
  });

  it('the ACT III banner names the act and the ground door, verbatim', () => {
    expect(STRINGS.en['overlay.actBanner3']).toBe('ACT III — THE GROUND DOOR');
    expect(STRINGS.en['overlay.actBanner3Note']).toBe('The door is real. So is what guards it.');
  });

  it('the ACT III banner carries authored hindi (Devanagari, never a copy of en)', () => {
    for (const k of ['overlay.actBanner3', 'overlay.actBanner3Note']) {
      const hi = STRINGS.hi[k]!;
      expect(hi, k).toMatch(/[\u0900-\u097F]/);
      expect(hi, k).not.toBe(STRINGS.en[k]);
    }
  });
});

// T6/T2 — the Furnace's hint line: the tier's standing advice, authored in
// both languages (the table carries it; the Aaina panel itself speaks
// English content by design — see src/ui/aaina.ts).
describe('i18n — the T6 heat hint line', () => {
  it('en pins the furnace line verbatim', () => {
    expect(STRINGS.en['hint.heatNear']).toBe(
      'The furnace breathes — your frost melts fast, and every crack you leave burns wider.',
    );
  });

  it('hi carries its own authored line (Devanagari, never a copy of en)', () => {
    expect(STRINGS.hi['hint.heatNear']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['hint.heatNear']).not.toBe(STRINGS.en['hint.heatNear']);
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

// T4/T1 — the tier-four chrome: the T4 floor-chip suffix, Dwaar III's new
// interstitial (the tier screen now belongs to the ACT close), and the
// Act I completion screen that Dwaar IV raises.
describe('i18n — the T4 tier-four + Act I chrome', () => {
  it('en pins the tier-four chip, the Truth-Shard III interstitial and the act screen verbatim', () => {
    expect(STRINGS.en['chip.tier4']).toBe('T4');
    expect(STRINGS.en['overlay.shardInterstitial3']).toBe(
      '✦ Truth-Shard III claimed — the house deepens…',
    );
    expect(STRINGS.en['overlay.actTitle']).toBe('ACT I COMPLETE — The Trap');
    expect(STRINGS.en['overlay.actNote']).toBe(
      'Act II: The Deception — the house will start copying you…',
    );
  });

  it('hi carries its own authored lines (Devanagari, never copies of en)', () => {
    for (const k of [
      'chip.tier4',
      'overlay.shardInterstitial3',
      'overlay.actTitle',
      'overlay.actNote',
    ]) {
      expect(STRINGS.hi[k], k).toMatch(/[\u0900-\u097F]/);
      expect(STRINGS.hi[k], k).not.toBe(STRINGS.en[k]);
    }
  });

  it('chip.tier4 is enumerated as a chip (single-line hi discipline applies)', () => {
    expect(CHIP_KEYS).toContain('chip.tier4');
  });

  it('the act screen reuses the tier stats line — 40 floors reads naturally in both languages', () => {
    expect(fill(STRINGS.en['overlay.tierStats']!, { floors: 40, shards: 120 })).toBe(
      '40 floors cleared · 120 shards banked',
    );
    expect(fill(STRINGS.hi['overlay.tierStats']!, { floors: 40, shards: 120 })).toContain('40');
  });
});

// T8/T2 — the Frozen Atrium's chrome: the once-per-floor thaw caption and
// Aaina's standing rule, authored in both languages (the Aaina panel itself
// speaks English by design; the hi lines carry the authoring).
describe('i18n — the T8 atrium chrome', () => {
  it('en pins the thaw caption and the frozenNear hint verbatim', () => {
    expect(STRINGS.en['caption.thaw']).toBe('The ice gives way — the glass watches.');
    expect(STRINGS.en['hint.frozenNear']).toBe(
      'The Atrium freezes every pane. Your breath thaws them — and thawed glass draws the wardens. Choose what they watch.',
    );
  });

  it('hi carries its own authored lines (Devanagari, never copies of en)', () => {
    for (const k of ['caption.thaw', 'hint.frozenNear']) {
      expect(STRINGS.hi[k], k).toMatch(/[\u0900-\u097F]/);
      expect(STRINGS.hi[k], k).not.toBe(STRINGS.en[k]);
    }
  });
});

// T10/T1 — the finale's chrome, authored in both languages: the tier-ten
// chip suffix (L94 · T10), the Ground's own chip label (L100 · THE GROUND —
// floor 100 is NOT a Dwaar, so it names the place, never `DWAAR X`), Dwaar
// IX's interstitial line (IX joins the cascade; the full screen moves to
// floor 100) and the Ground's tier-screen title (✦ Truth-Shard X — T3 folds
// this screen into the Ground Door finale; until then it holds).
describe('i18n — the T10 finale chrome', () => {
  it('the tier-ten chip suffix exists in both languages', () => {
    expect(STRINGS.en['chip.tier10']).toBe('T10');
    expect(STRINGS.hi['chip.tier10']!).toMatch(/[\u0900-\u097F]/);
  });

  it('chip.tier10 is enumerated as a chip (single-line hi discipline applies)', () => {
    expect(CHIP_KEYS).toContain('chip.tier10');
  });

  it('the Ground names ITSELF on the chip — never a Dwaar label', () => {
    expect(STRINGS.en['chip.ground']).toBe('THE GROUND');
    expect(STRINGS.hi['chip.ground']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['chip.ground']).not.toBe(STRINGS.en['chip.ground']);
    expect(CHIP_KEYS).toContain('chip.ground');
    // and neither Ground chip string contains the Dwaar word — the ending is
    // not a threshold hall
    expect(STRINGS.en['chip.ground']).not.toMatch(/DWAAR/);
    expect(STRINGS.hi['chip.ground']).not.toMatch(/द्वार/);
  });

  it('Dwaar IX joins the interstitial cascade with its own shard line', () => {
    expect(STRINGS.en['overlay.shardInterstitial9']).toBe(
      '✦ Truth-Shard IX claimed — the house deepens…',
    );
    expect(STRINGS.hi['overlay.shardInterstitial9']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.shardInterstitial9']).not.toBe(
      STRINGS.en['overlay.shardInterstitial9'],
    );
  });

  it('the Ground\u2019s tier screen names Truth-Shard X (the stand-in until the T3 finale folds it)', () => {
    expect(STRINGS.en['overlay.tierTitle10']).toBe('✦ Truth-Shard X claimed — Tier X complete');
    expect(STRINGS.hi['overlay.tierTitle10']!).toMatch(/[\u0900-\u097F]/);
    expect(STRINGS.hi['overlay.tierTitle10']).not.toBe(STRINGS.en['overlay.tierTitle10']);
  });
});
