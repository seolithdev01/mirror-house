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
  it('grows to 44 entries (25 + feedback, beta, the tier-2 trio, the T3 water, the Gardens pair, the T4 carnival glass, the Carnival pair, the T5 decoy, the Flood Halls trio, the T6 furnace + Taal-rest pair, the T7 library + noise pair)', () => {
    expect(FAQ).toHaveLength(44);
  });

  it('the T5 entry explains the mirror-you decoys — the lure and the shatter bounty', () => {
    const e = FAQ.find((f) => /copy of me/i.test(f.q));
    expect(e, 'an entry about the mirror-you decoys exists').toBeDefined();
    expect(e!.a).toContain('Echo'); // the lure is the copy's job
    expect(e!.a).toContain('shatters'); // the touch is the bounty
    expect(e!.a).toContain('41–70'); // copies walk the Flood Halls, Wings AND Library (t7)
    expect(e!.a).toContain('guards the copy'); // the warden wards them now (t6)
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
    expect(aavart!.a.toLowerCase()).not.toContain('crawl'); // the t4 minor: no creep-speed control exists
  });

  it('the Flood Halls trio teaches the tier, the flood and the rotation (T5/T5)', () => {
    const flood = FAQ.find((f) => /below the carnival of faces/i.test(f.q));
    expect(flood, 'the Flood Halls tier entry exists').toBeDefined();
    expect(flood!.a).toContain('L41 · T5'); // the chip readers see
    expect(flood!.a).toContain('ACT II'); // the act opens on floor 41
    expect(flood!.a).toContain('mirror-you decoys'); // Act II's signature, cross-referenced
    expect(flood!.a).toContain('Truth-Shard V'); // Dwaar V's claim
    expect(flood!.a.toLowerCase()).toContain('all four'); // the apex duel at 50
    const water = FAQ.find((f) => /halls are flooding/i.test(f.q));
    expect(water, 'the flooding-halls entry exists').toBeDefined();
    expect(water!.a).toContain('1.2 m'); // the full depth
    expect(water!.a).toContain('three minutes'); // the rise clock (two in Dwaar V)
    expect(water!.a).toContain('0.6 m'); // the wade threshold
    expect(water!.a).toContain('0.9 m'); // the eye-blind threshold
    expect(water!.a).toContain('85'); // the wade factor
    const rotation = FAQ.find((f) => /gher and aavart vanished/i.test(f.q));
    expect(rotation, 'the wardens-rotation entry exists').toBeDefined();
    expect(rotation!.a).toContain('rotates its wardens'); // the house's word for it
    expect(rotation!.a).toContain('41–49'); // the rested ramp
    expect(rotation!.a.toLowerCase()).toContain('never rests'); // Taal's exception (qualified — he rests in the Wings now)
    expect(rotation!.a).toContain('Dwaar V'); // the all-four return
  });

  it('the Furnace pair teaches the tier and the rotation\u2019s turn (T6/T5)', () => {
    const furnace = FAQ.find((f) => /below the flood halls/i.test(f.q));
    expect(furnace, 'the Furnace Wings tier entry exists').toBeDefined();
    expect(furnace!.a).toContain('L51 · T6'); // the chip readers see
    expect(furnace!.a).toContain('12.5 seconds'); // the heat-fog evaporation
    expect(furnace!.a).toContain('25 anger'); // the widened crack
    expect(furnace!.a).toContain('Truth-Shard VI'); // Dwaar VI's claim
    expect(furnace!.a).toContain('Chhaya + Gher + Aavart'); // the crucible's t7 replay — Taal's extended rest
    const taal = FAQ.find((f) => /taal vanished below floor 50/i.test(f.q));
    expect(taal, 'the Taal-rest entry exists').toBeDefined();
    expect(taal!.a).toContain('first rest'); // the rotation's second turn
    expect(taal!.a).toContain('51–60'); // the Wings are where he sits out
    expect(taal!.a).toContain('Dwaar VI'); // the crucible — which t7 now replays without him
    expect(taal!.a).toContain('floor 66'); // the Library brings the beat back (t7)
  });

  it('the Library pair teaches the tier and the noise economy (T7/T4)', () => {
    const library = FAQ.find((f) => /below the furnace wings/i.test(f.q));
    expect(library, 'the Whisper Library tier entry exists').toBeDefined();
    expect(library!.a).toContain('L61 · T7'); // the chip readers see
    expect(library!.a).toContain('Truth-Shard VII'); // Dwaar VII's claim
    expect(library!.a.toLowerCase()).toContain('duet'); // Taal + Gher — NOT an all-four apex
    expect(library!.a).toContain('floor 66'); // Taal's mid-tier return
    const noise = FAQ.find((f) => /how does the noise work/i.test(f.q));
    expect(noise, 'the noise-economy entry exists').toBeDefined();
    expect(noise!.a).toContain('7 meters'); // the sprint ring
    expect(noise!.a).toContain('4 meters'); // the walk ring
    expect(noise!.a).toContain('2.5 meters'); // the verbs' single ping
    expect(noise!.a.toLowerCase()).toContain('noise-immune'); // glass echoes hear nothing
  });
});
