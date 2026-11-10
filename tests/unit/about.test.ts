// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../src/appVersion';
import { ABOUT_LINKS } from '../../src/ui/about';
import { FAQ } from '../../src/ui/faq';
import { STRINGS, t } from '../../src/ui/i18n';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
) as { version: string };

describe('appVersion', () => {
  it('vitest node has no vite define — the fallback literal is served', () => {
    // vitest.config.ts carries no `define`, so `__APP_VERSION__` is an
    // undeclared global here; the guard must serve 'dev', never throw.
    expect(APP_VERSION).toBe('dev');
  });

  it("package.json's version is a semver-shaped string (what vite injects)", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
  });
});

describe('about — the four launch links', () => {
  it('Source · Privacy · Provenance · License, in that order, all absolute https', () => {
    expect(ABOUT_LINKS.map((l) => l.key)).toEqual([
      'about.source',
      'about.privacy',
      'about.provenance',
      'about.license',
    ]);
    for (const l of ABOUT_LINKS) expect(l.href.startsWith('https://'), l.href).toBe(true);
  });

  it('every link label exists in both language tables', () => {
    for (const l of ABOUT_LINKS) {
      expect(STRINGS.en[l.key], l.key).toBeDefined();
      expect(STRINGS.hi[l.key], l.key).toBeDefined();
    }
  });

  it('the version template carries the {v} token in both langs', () => {
    expect(STRINGS.en['about.version']).toContain('{v}');
    expect(STRINGS.hi['about.version']).toContain('{v}');
    // and fill() lands the injected version into it
    expect(t('en', 'about.version').replace('{v}', APP_VERSION)).not.toContain('{');
  });
});

describe('faq — the beta launch pair', () => {
  it('grows to 36 entries (25 + feedback, beta, the tier-2 trio, the T3 water, the Gardens pair, the T4 carnival glass, the Carnival pair)', () => {
    expect(FAQ).toHaveLength(36);
  });

  it('the report-bugs answer names the Feedback button in the top-right', () => {
    const e = FAQ.find((f) => /report a bug/i.test(f.q));
    expect(e, 'an entry about reporting bugs exists').toBeDefined();
    expect(e!.a).toContain('Feedback button in the top-right');
  });

  it('the T4 entry explains the distorting mirrors and their frost counter', () => {
    const e = FAQ.find((f) => /distorting mirrors/i.test(f.q));
    expect(e, 'an entry about the carnival glass exists').toBeDefined();
    expect(e!.a).toContain('lies about WHERE you are');
    expect(e!.a).toContain('fog'); // the counter-play is the Frost Lantern
  });

  it('the beta answer says what the beta is and teases the roadmap', () => {
    const e = FAQ.find((f) => /beta/i.test(f.q));
    expect(e, 'an entry about the beta exists').toBeDefined();
    expect(e!.a.toLowerCase()).toContain('roadmap');
  });

  it('the tier-2 trio answers how to survive the ancestors (T2/T5)', () => {
    const hall = FAQ.find((f) => /hall of ancestors/i.test(f.q));
    expect(hall, 'the Hall of Ancestors entry exists').toBeDefined();
    expect(hall!.a).toContain('L11 · T2'); // the chip readers see
    expect(hall!.a).toContain('Truth-Shard II');
    const taal = FAQ.find((f) => /taal keeps catching/i.test(f.q));
    expect(taal, 'the lethal-Taal entry exists').toBeDefined();
    expect(taal!.a.toLowerCase()).toContain('dim beat'); // cross on the dim beat
    const portraits = FAQ.find((f) => /portrait mirrors/i.test(f.q));
    expect(portraits, 'the ancestor-portraits entry exists').toBeDefined();
    expect(portraits!.a).toContain('fog'); // fog them like any glass
  });

  it('the water-mirrors answer teaches the ripple, not the fog (T3/T3)', () => {
    const e = FAQ.find((f) => /water-mirrors/i.test(f.q));
    expect(e, 'the water-mirrors entry exists').toBeDefined();
    expect(e!.a).toContain('cannot fog'); // the lantern has no verb here
    expect(e!.a).toContain('ripple'); // …the player's step is the verb
    expect(e!.a).toContain('ten seconds'); // the blindness window
  });

  it('the Gardens pair teaches the tier and the feint, both Sentinels walking (T3/T5)', () => {
    const gardens = FAQ.find((f) => /reflecting gardens/i.test(f.q));
    expect(gardens, 'the Gardens entry exists').toBeDefined();
    expect(gardens!.a).toContain('L21 · T3'); // the chip readers see
    expect(gardens!.a).toContain('Sentinels accumulate'); // the §4.4 ladder
    expect(gardens!.a).toContain('Truth-Shard III'); // Dwaar III's claim
    expect(gardens!.a.toLowerCase()).toContain('flute'); // the tier's mood
    const gher = FAQ.find((f) => /gher keeps cutting me off/i.test(f.q));
    expect(gher, 'the Gher-feint entry exists').toBeDefined();
    expect(gher!.a.toLowerCase()).toContain('feint'); // the only counter
    expect(gher!.a.toLowerCase()).toContain('dim beat'); // Taal still walks
  });

  it('the Carnival pair teaches the tier and the pace trick, the act closing (T4/T5)', () => {
    const carnival = FAQ.find((f) => /carnival of faces/i.test(f.q));
    expect(carnival, 'the Carnival entry exists').toBeDefined();
    expect(carnival!.a).toContain('L31 · T4'); // the chip readers see
    expect(carnival!.a).toContain('Truth-Shard IV'); // Dwaar IV's claim
    expect(carnival!.a).toContain('ACT I'); // the act close on floor 40's clear
    expect(carnival!.a).toContain('distorting mirrors'); // the tier's mechanic, cross-referenced
    const aavart = FAQ.find((f) => /aavart keeps intercepting/i.test(f.q));
    expect(aavart, 'the Aavart-pace entry exists').toBeDefined();
    expect(aavart!.a.toLowerCase()).toContain('change your pace'); // the only counter
    expect(aavart!.a).toContain('1.2 seconds'); // the retarget window the trick rides
    expect(aavart!.a.toLowerCase()).toContain('dim beat'); // Taal still walks
    expect(aavart!.a.toLowerCase()).toContain('feint'); // Gher still reads the heading
  });
});
