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
  it('grows to 27 entries (25 + the feedback and beta answers)', () => {
    expect(FAQ).toHaveLength(27);
  });

  it('the report-bugs answer names the Feedback button in the top-right', () => {
    const e = FAQ.find((f) => /report a bug/i.test(f.q));
    expect(e, 'an entry about reporting bugs exists').toBeDefined();
    expect(e!.a).toContain('Feedback button in the top-right');
  });

  it('the beta answer says what the beta is and teases the roadmap', () => {
    const e = FAQ.find((f) => /beta/i.test(f.q));
    expect(e, 'an entry about the beta exists').toBeDefined();
    expect(e!.a.toLowerCase()).toContain('roadmap');
  });
});
