// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_LIMITS,
  buildFeedbackPayload,
  feedbackRatePrefix,
  feedbackStorageKey,
  parseFeedbackPayload,
  targetShotSize,
} from '../../src/game/feedbackNet';

const VALID = (over: Record<string, unknown> = {}) => ({
  v: '0.2.0-beta.4',
  kind: 'bug',
  title: 'stuck in a mirror',
  body: 'floor 12, walked into the tall glass and stayed',
  shot: { w: 1280, h: 720, mime: 'image/jpeg', data: 'a'.repeat(64) },
  ctx: {
    floor: 12, tier: 2, mode: 'touch', view: 'focus', lang: 'en',
    preset: 'high', seed: 'HOME:12', dpr: 2, ua: 'Mozilla/5.0', heap: 9.5,
  },
  ...over,
});

describe('parseFeedbackPayload', () => {
  it('accepts a valid payload and strips unknown keys', () => {
    const r = parseFeedbackPayload({ ...VALID(), junk: 'x', ctx: { ...VALID().ctx as object, junk2: 1 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.kind).toBe('bug');
      expect(Object.keys(r.value).sort()).toEqual(['body', 'ctx', 'kind', 'shot', 'title', 'v']);
    }
  });
  it('rejects non-objects and wrong types', () => {
    for (const raw of [null, 42, 'x', [], VALID({ kind: 7 }), VALID({ title: 9 }),
      VALID({ body: { } }), VALID({ v: null })]) {
      expect(parseFeedbackPayload(raw).ok).toBe(false);
    }
  });
  it('rejects unknown kinds', () => {
    expect(parseFeedbackPayload(VALID({ kind: 'feature' })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ kind: 'love' })).ok).toBe(true);
  });
  it('enforces the limits', () => {
    expect(parseFeedbackPayload(VALID({ title: 'x'.repeat(FEEDBACK_LIMITS.title + 1) })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ body: 'x'.repeat(FEEDBACK_LIMITS.body + 1) })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ shot: { w: 10, h: 10, mime: 'image/jpeg', data: 'x'.repeat(FEEDBACK_LIMITS.shotChars + 1) } })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ shot: { w: 10, h: 10, mime: 'image/png', data: 'x' } })).ok).toBe(false);
  });
  it('rejects a shot whose data is not base64', () => {
    expect(parseFeedbackPayload(VALID({ shot: { w: 10, h: 10, mime: 'image/jpeg', data: 'not base64!!' } })).ok).toBe(false);
  });
  it('rejects bad ctx values', () => {
    expect(parseFeedbackPayload(VALID({ ctx: { ...VALID().ctx as object, floor: '12' } })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ ctx: { ...VALID().ctx as object, ua: 'x'.repeat(400) } })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ ctx: null })).ok).toBe(false);
  });
});

describe('buildFeedbackPayload', () => {
  it('strips the data-url prefix and counts bytes', () => {
    const p = buildFeedbackPayload({
      v: 'v1', kind: 'love', title: 't', body: 'b',
      shot: { w: 640, h: 360, dataUrl: 'data:image/jpeg;base64,QUJD' },
      ctx: { floor: 1, tier: 1, mode: 'hybrid', view: 'quad', lang: 'hi', preset: 'low', seed: 'S', dpr: 1, ua: 'u', heap: null },
    });
    expect(p.shot).toEqual({ w: 640, h: 360, mime: 'image/jpeg', data: 'QUJD' });
    expect(parseFeedbackPayload(p).ok).toBe(true);
  });
});

describe('targetShotSize', () => {
  it('passes through at or under max', () => {
    expect(targetShotSize(1280, 720, 1280)).toEqual([1280, 720]);
    expect(targetShotSize(800, 600, 1280)).toEqual([800, 600]);
  });
  it('scales wide and tall down, rounding even', () => {
    expect(targetShotSize(2560, 1440, 1280)).toEqual([1280, 720]);
    expect(targetShotSize(1170, 2532, 1280)).toEqual([592, 1280]); // tall phone
  });
  it('never returns 0', () => {
    expect(targetShotSize(2, 4000, 1280)).toEqual([1, 1280]);
  });
});

describe('keys', () => {
  it('storage key is date-scoped, sortable, unique', () => {
    expect(feedbackStorageKey('2026-11-19T10:11:12.000Z', 'a1b2c3d4e5f6', 'Xy9K2L'))
      .toBe('fb/2026-11-19/2026-11-19T101112Z-a1b2c3d4e5f6-Xy9K2L.json');
  });
  it('rate prefix is hour-scoped', () => {
    expect(feedbackRatePrefix('2026-11-19T10', 'a1b2c3d4e5f6')).toBe('rate/2026-11-19T10/a1b2c3d4e5f6/');
  });
});
