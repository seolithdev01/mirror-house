// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SUPPORT_EMAIL } from '../../src/game/feedback';
import {
  HOST_ENQUIRY_BODY,
  HOST_ENQUIRY_SUBJECT,
  HOST_FLOOR_URL,
  hostEnquiryMailto,
  safeSupportUrl,
  SITE_ORIGIN,
} from '../../src/game/support';
import { aboutSupportLinks } from '../../src/ui/about';
import { STRINGS } from '../../src/ui/i18n';

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');

describe('support — the donation-link gate', () => {
  it('passes https links to known donation platforms', () => {
    expect(safeSupportUrl('https://github.com/sponsors/someone')).toBe(
      'https://github.com/sponsors/someone',
    );
    expect(safeSupportUrl('  https://ko-fi.com/someone ')).toBe('https://ko-fi.com/someone');
    expect(safeSupportUrl('https://www.buymeacoffee.com/someone')).toBe(
      'https://www.buymeacoffee.com/someone',
    );
  });

  it('refuses everything else — unset, malformed, wrong scheme, wrong host, lookalikes', () => {
    for (const bad of [
      undefined,
      null,
      42,
      '',
      '   ',
      'not a url',
      'http://ko-fi.com/someone',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'https://evil.example/ko-fi.com/someone',
      'https://ko-fi.com.evil.example/someone',
      'https://evilko-fi.com/someone',
      'https://user:pw@ko-fi.com/someone',
      'https://ko-fi.com:8443/someone',
      'https://ko-fi.com/',
      'https://github.com/someone/repo', // github counts only as /sponsors/<login>
      'https://github.com/sponsors/a/b',
    ])
      expect(safeSupportUrl(bad), String(bad)).toBeNull();
  });
});

describe('support — the About support row', () => {
  it('always offers Host a floor; the donation link only when configured and safe', () => {
    expect(aboutSupportLinks(undefined)).toEqual([{ key: 'about.host', href: HOST_FLOOR_URL }]);
    expect(aboutSupportLinks('javascript:alert(1)')).toHaveLength(1);
    expect(aboutSupportLinks('https://ko-fi.com/someone')).toEqual([
      { key: 'about.host', href: HOST_FLOOR_URL },
      { key: 'about.support', href: 'https://ko-fi.com/someone' },
    ]);
  });

  it('every label exists in both language tables', () => {
    for (const key of ['about.host', 'about.support', 'venue.hostCta']) {
      expect(STRINGS.en[key], key).toBeDefined();
      expect(STRINGS.hi[key], key).toBeDefined();
    }
  });
});

describe('support — the host-a-floor enquiry', () => {
  it('the page URL is absolute https on the site origin', () => {
    expect(HOST_FLOOR_URL).toBe(`${SITE_ORIGIN}/host-a-floor`);
    expect(SITE_ORIGIN.startsWith('https://')).toBe(true);
  });

  it('the mailto round-trips subject and body exactly (spaces as %20, never +)', () => {
    const m = hostEnquiryMailto();
    expect(m.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(m).not.toContain('+');
    const q = m.slice(m.indexOf('?') + 1).split('&');
    const get = (k: string): string =>
      decodeURIComponent(q.find((p) => p.startsWith(`${k}=`))!.slice(k.length + 1));
    expect(get('subject')).toBe(HOST_ENQUIRY_SUBJECT);
    expect(get('body')).toBe(HOST_ENQUIRY_BODY);
  });

  it('the static pitch page carries exactly this mailto, and no inline style attribute', () => {
    const html = read('public/host-a-floor.html');
    expect(html).toContain(`href="${hostEnquiryMailto().replace(/&/g, '&amp;')}"`);
    expect(html).not.toMatch(/<[^>]+\sstyle\s*=/i); // the CSP has no 'unsafe-inline'
    expect(html).toContain('/?venue=demo-glasshouse-cafe');
  });
});

describe('deploy headers — the CSP stays strict', () => {
  const headers = read('public/_headers');
  const csp = headers.split('\n').find((l) => l.includes('Content-Security-Policy')) ?? '';

  it("no 'unsafe-inline' / 'unsafe-eval' anywhere; styles ride build-time hashes", () => {
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("style-src 'self' __MH_STYLE_HASHES__");
  });

  it('the hardening directives and headers are all present', () => {
    for (const d of [
      "default-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "require-trusted-types-for 'script'",
      'trusted-types mh',
    ])
      expect(csp, d).toContain(d);
    for (const h of [
      'Strict-Transport-Security: max-age=31536000',
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy: no-referrer',
      'Cross-Origin-Opener-Policy: same-origin',
    ])
      expect(headers, h).toContain(h);
  });

  it('the service worker keeps its two build placeholders', () => {
    const sw = read('public/sw.js');
    expect(sw).toContain("'__MH_BUILD__'");
    expect(sw).toContain("['__MH_ASSETS__']");
  });
});
