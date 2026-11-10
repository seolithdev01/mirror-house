// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYMAP, type KeyMap } from '../../src/game/save';
import {
  buildIssueUrl,
  buildMailto,
  diagnosticsSnapshot,
  ERROR_RING_CAP,
  ERROR_TEXT_MAX,
  ISSUE_URL,
  keymapDiffCount,
  recordError,
  SUPPORT_EMAIL,
  type DiagnosticsState,
  type RingError,
} from '../../src/game/feedback';
import { STRINGS } from '../../src/ui/i18n';

const baseState = (): DiagnosticsState => ({
  appVersion: '0.2.0-beta.1',
  userAgent: 'Mozilla/5.0 (test) MirrorHouse/1',
  lang: 'en',
  preset: 'mid',
  seed: 'PLAYTEST:1',
  floor: 1,
  campaignBase: 'PLAYTEST',
  phaseKind: 'running',
  venueId: null,
  reducedFlash: false,
  captions: true,
  textScale: 1.25,
  remappedKeys: 2,
  errors: [],
});

describe('feedback — error ring buffer', () => {
  it('records with timestamps and caps at 10, dropping the oldest', () => {
    let ring: RingError[] = [];
    for (let i = 0; i < ERROR_RING_CAP + 5; i++) ring = recordError(ring, i * 100, `boom ${i}`);
    expect(ring).toHaveLength(ERROR_RING_CAP);
    expect(ring[0]!.text).toBe('boom 5'); // the five oldest fell off the front
    expect(ring[ring.length - 1]!.text).toBe(`boom ${ERROR_RING_CAP + 4}`);
    expect(ring.map((e) => e.at)).toEqual([500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400]);
  });

  it('stringifies non-strings and truncates long text to 200 code points (multibyte-safe)', () => {
    const long = 'दर्पण'.repeat(80); // 400 Devanagari code points
    const ring = recordError([], 42, long);
    expect(ring[0]!.at).toBe(42);
    expect(Array.from(ring[0]!.text)).toHaveLength(ERROR_TEXT_MAX);
    expect(ring[0]!.text).toBe(Array.from(long).slice(0, ERROR_TEXT_MAX).join(''));
    expect(recordError([], 0, new Error('nope'))[0]!.text).toBe('Error: nope');
    expect(recordError([], 0, { odd: true })[0]!.text).toBe('[object Object]');
  });

  it('keeps the input ring untouched (pure) and folds multi-line text to one line', () => {
    const seedRing: RingError[] = [{ at: 1, text: 'old' }];
    const next = recordError(seedRing, 2, 'line one\nline two');
    expect(seedRing).toHaveLength(1); // the caller's array is never mutated
    expect(next).toHaveLength(2);
    expect(next[1]!.text).toBe('line one line two'); // one line per entry in the report
  });
});

describe('feedback — diagnosticsSnapshot', () => {
  it('carries every field the triage card needs, one key: value per line', () => {
    const text = diagnosticsSnapshot(baseState());
    for (const line of [
      'game: Mirror House v0.2.0-beta.1',
      'lang: en',
      'preset: mid',
      'seed: PLAYTEST:1',
      'floor: 1',
      'campaign: PLAYTEST',
      'phase: running',
      'venue: none',
      'reducedFlash: off',
      'captions: on',
      'textScale: 1.25',
      'remappedKeys: 2',
      'userAgent: Mozilla/5.0 (test) MirrorHouse/1',
      'errors: none',
    ])
      expect(text).toContain(line);
  });

  it('venue: the pack id on a venue floor, none on the campaign floor', () => {
    const venue = diagnosticsSnapshot({ ...baseState(), venueId: 'demo-glasshouse-cafe' });
    expect(venue).toContain('venue: demo-glasshouse-cafe');
    expect(venue).not.toContain('venue: none');
  });

  it('renders the error ring (latest last) or errors: none when empty', () => {
    const withErrors = diagnosticsSnapshot({
      ...baseState(),
      errors: [
        { at: 1500, text: 'TypeError: cannot read properties of undefined' },
        { at: 9800, text: 'Unhandled rejection: SyntaxError: JSON.parse' },
      ],
    });
    expect(withErrors).toContain('errors: 2');
    expect(withErrors).toContain('[1.5s] TypeError: cannot read properties of undefined');
    expect(withErrors).toContain('[9.8s] Unhandled rejection: SyntaxError: JSON.parse');
    expect(
      withErrors.indexOf('TypeError'),
      'the ring keeps arrival order — oldest first',
    ).toBeLessThan(withErrors.indexOf('Unhandled rejection'));
  });
});

describe('feedback — keymapDiffCount', () => {
  it('0 for the default map; counts only rebound actions', () => {
    expect(keymapDiffCount(DEFAULT_KEYMAP, DEFAULT_KEYMAP)).toBe(0);
    const remapped: KeyMap = { ...DEFAULT_KEYMAP, forward: 'KeyP', frost: 'KeyZ' };
    expect(keymapDiffCount(remapped, DEFAULT_KEYMAP)).toBe(2);
    // the sanctioned dual (turnR and push share KeyE) is not a diff
    expect(keymapDiffCount({ ...DEFAULT_KEYMAP, push: 'KeyE' }, DEFAULT_KEYMAP)).toBe(0);
  });
});

describe('feedback — buildIssueUrl', () => {
  it('targets the repo new-issue URL with template + labels per kind', () => {
    const url = buildIssueUrl('bug', 'Stair door sealed', 'body');
    expect(url.startsWith(`${ISSUE_URL}?`)).toBe(true);
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('template')).toBe('bug_report.md');
    expect(params.get('labels')).toBe('from-game,feedback');
    expect(params.get('title')).toBe('Stair door sealed');

    expect(
      new URLSearchParams(
        buildIssueUrl('suggestion', 't', 'b').slice(
          buildIssueUrl('suggestion', 't', 'b').indexOf('?') + 1,
        ),
      ).get('template'),
    ).toBe('feature_request.md');
    const loveUrl = buildIssueUrl('love', 't', 'b');
    const loveParams = new URLSearchParams(loveUrl.slice(loveUrl.indexOf('?') + 1));
    expect(loveParams.get('template')).toBe('playtest.md');
    expect(loveParams.get('labels')).toBe('from-game,playtest');
  });

  it('round-trips newlines and multibyte through the body param (raw %0A present)', () => {
    const body = 'What happened?\n\nline two — हिंदी 🪞\nline three';
    const url = buildIssueUrl('bug', 'title', body);
    expect(url).toContain('%0A'); // the newlines are truly URL-encoded in the href
    const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(params.get('body')).toBe(body); // decoded round-trip is exact
  });
});

describe('feedback — buildMailto', () => {
  it('mailto:address with encoded subject and body', () => {
    const href = buildMailto(SUPPORT_EMAIL, '[Mirror House] Bug', 'the stair door\nstayed sealed');
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(params.get('subject')).toBe('[Mirror House] Bug');
    expect(params.get('body')).toBe('the stair door\nstayed sealed');
  });

  it('newlines are encoded in the raw href (no bare control characters)', () => {
    const href = buildMailto(SUPPORT_EMAIL, 's', 'a\nb');
    expect(href).toContain('%0A');
    expect(href).not.toMatch(/[\r\n]/);
  });

  it('the support address is a constant the UI never invents', () => {
    expect(SUPPORT_EMAIL).toBe('itsupport01@seolith.com');
  });
});

describe('feedback — the composer chrome is bilingual, day one', () => {
  const FEEDBACK_KEYS = [
    'btn.feedback',
    'feedback.title',
    'feedback.kind',
    'feedback.bug',
    'feedback.suggestion',
    'feedback.love',
    'feedback.summary',
    'feedback.body',
    'feedback.github',
    'feedback.email',
    'feedback.privacyNote',
    'feedback.prompt.bug',
    'feedback.prompt.suggestion',
    'feedback.prompt.love',
    'feedback.diagHeader',
  ];
  it('every key exists in both language tables', () => {
    for (const k of FEEDBACK_KEYS) {
      expect(STRINGS.en[k], `en.${k}`).toBeDefined();
      expect(STRINGS.hi[k], `hi.${k}`).toBeDefined();
    }
  });
});

describe('feedback — GitHub issue templates', () => {
  const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(`../../.github/${rel}`, import.meta.url)), 'utf8');

  it('the three markdown templates exist with YAML frontmatter naming them', () => {
    for (const [file, name] of [
      ['ISSUE_TEMPLATE/bug_report.md', 'Bug report'],
      ['ISSUE_TEMPLATE/feature_request.md', 'Suggestion'],
      ['ISSUE_TEMPLATE/playtest.md', 'Playtest note'],
    ] as const) {
      const text = read(file);
      expect(text.startsWith('---'), file).toBe(true);
      expect(text, file).toContain(`name: ${name}`);
    }
  });

  it('the bug template asks for what happened / steps / expected and the diagnostics block', () => {
    const bug = read('ISSUE_TEMPLATE/bug_report.md');
    for (const section of [
      'What happened',
      'Steps to reproduce',
      'What did you expect',
      'Diagnostics',
    ])
      expect(bug, section).toContain(section);
  });

  it('config.yml keeps blank issues on and offers the two contact links', () => {
    const cfg = read('ISSUE_TEMPLATE/config.yml');
    expect(cfg).toContain('blank_issues_enabled: true');
    expect(cfg).toContain('#how-to-play');
    expect(cfg).toContain('PRIVACY.md');
  });
});
