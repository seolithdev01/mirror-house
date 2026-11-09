// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  idbGet,
  idbPut,
  mergeCampaign,
  migrateMeta,
  serializeSave,
  validateSave,
  type SaveData,
} from '../../src/game/save';
import type { Campaign } from '../../src/game/campaign';
import { isValidSeed } from '../../src/game/seedCode';

const good: SaveData = {
  v: 2,
  lookName: 'teal-white',
  mode: 'mouse',
  muted: true,
  lang: 'en',
  shards: 12,
  best: { 'PLAYTEST:1': 4321, 'PLAYTEST:2': 5123.5 },
  streak: { count: 3, lastDay: '2026-11-08' },
  progress: { seedBase: 'PLAYTEST', floor: 7, tierComplete: false },
};

/** A good save with one mutation, as untrusted JSON would deliver it. */
function mutated(f: (r: Record<string, unknown>) => void): unknown {
  const r = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
  f(r);
  return r;
}

describe('save: defaultSave', () => {
  it('is a valid v2 save with fresh progression', () => {
    const s = defaultSave('ABCDE2');
    expect(s.v).toBe(2);
    expect(s.lookName).toBe('indigo-gold');
    expect(s.mode).toBe('hybrid');
    expect(s.muted).toBe(false);
    expect(s.lang).toBe('en');
    expect(s.shards).toBe(0);
    expect(s.best).toEqual({});
    expect(s.streak).toEqual({ count: 0, lastDay: '' });
    expect(s.progress).toEqual({ seedBase: 'ABCDE2', floor: 1, tierComplete: false });
    expect(validateSave(s)).not.toBeNull();
    expect(isValidSeed(defaultSave().progress.seedBase)).toBe(true); // random default is a seed
  });
});

describe('save: validateSave', () => {
  it('accepts a complete v2 save (untrusted-JSON shaped)', () => {
    expect(validateSave(JSON.parse(JSON.stringify(good)))).toEqual(good);
  });

  it('rejects wrong or missing v', () => {
    expect(validateSave(mutated((r) => (r.v = 1)))).toBeNull();
    expect(validateSave(mutated((r) => (r.v = 3)))).toBeNull();
    expect(validateSave(mutated((r) => (r.v = '2')))).toBeNull();
    expect(validateSave(mutated((r) => (r.v = 2.0)))).not.toBeNull(); // 2.0 IS 2
    expect(validateSave(mutated((r) => delete r.v))).toBeNull();
  });

  it('rejects negative, fractional, non-number, and oversized shards', () => {
    expect(validateSave(mutated((r) => (r.shards = -1)))).toBeNull();
    expect(validateSave(mutated((r) => (r.shards = 2.5)))).toBeNull();
    expect(validateSave(mutated((r) => (r.shards = '5')))).toBeNull();
    expect(validateSave(mutated((r) => (r.shards = 1e12)))).toBeNull();
    expect(validateSave(mutated((r) => delete r.shards))).toBeNull();
  });

  it('rejects bad mode, lang, muted, lookName', () => {
    expect(validateSave(mutated((r) => (r.mode = 'dance')))).toBeNull();
    expect(validateSave(mutated((r) => (r.mode = 3)))).toBeNull();
    expect(validateSave(mutated((r) => delete r.mode))).toBeNull();
    expect(validateSave(mutated((r) => (r.lang = 'fr')))).toBeNull();
    expect(validateSave(mutated((r) => delete r.lang))).toBeNull();
    expect(validateSave(mutated((r) => (r.muted = 'true')))).toBeNull();
    expect(validateSave(mutated((r) => (r.muted = 1)))).toBeNull();
    expect(validateSave(mutated((r) => (r.lookName = '')))).toBeNull();
    expect(validateSave(mutated((r) => (r.lookName = 'x'.repeat(65))))).toBeNull();
    expect(validateSave(mutated((r) => (r.lookName = 42)))).toBeNull();
  });

  it('rejects malformed best records', () => {
    expect(validateSave(mutated((r) => (r.best = [])))).toBeNull();
    expect(validateSave(mutated((r) => (r.best = 'nope')))).toBeNull();
    expect(validateSave(mutated((r) => (r.best = { A: -1 })))).toBeNull();
    expect(validateSave(mutated((r) => (r.best = { A: 'fast' })))).toBeNull();
    expect(validateSave(mutated((r) => (r.best = { A: Number.POSITIVE_INFINITY })))).toBeNull();
    expect(validateSave(mutated((r) => delete r.best))).toBeNull();
  });

  it('rejects malformed streak', () => {
    expect(validateSave(mutated((r) => (r.streak = { count: -1, lastDay: '2026-11-08' })))).toBeNull();
    expect(validateSave(mutated((r) => (r.streak = { count: 1.5, lastDay: '2026-11-08' })))).toBeNull();
    expect(validateSave(mutated((r) => (r.streak = { count: 1, lastDay: 'whenever' })))).toBeNull();
    expect(validateSave(mutated((r) => (r.streak = { count: 1, lastDay: '2026/11/08' })))).toBeNull();
    expect(
      validateSave(mutated((r) => (r.streak = { count: 1, lastDay: '2026-11-08', extra: 1 }))),
    ).toBeNull();
    expect(
      validateSave(mutated((r) => (r.streak = { count: 1 } as Record<string, unknown>))),
    ).toBeNull(); // lastDay missing entirely
    expect(
      validateSave(mutated((r) => delete (r.streak as Record<string, unknown>).lastDay)),
    ).toBeNull();
  });

  it('rejects malformed progress', () => {
    expect(validateSave(mutated((r) => (r.progress = { ...good.progress, floor: 0 })))).toBeNull();
    expect(validateSave(mutated((r) => (r.progress = { ...good.progress, floor: 11 })))).toBeNull();
    expect(validateSave(mutated((r) => (r.progress = { ...good.progress, floor: 2.5 })))).toBeNull();
    expect(validateSave(mutated((r) => (r.progress = { ...good.progress, floor: '3' })))).toBeNull();
    expect(
      validateSave(mutated((r) => (r.progress = { ...good.progress, seedBase: 'bad seed' }))),
    ).toBeNull();
    expect(
      validateSave(mutated((r) => (r.progress = { ...good.progress, seedBase: 'TOOLONGSEED7777777' }))),
    ).toBeNull();
    expect(
      validateSave(mutated((r) => (r.progress = { ...good.progress, tierComplete: 'yes' }))),
    ).toBeNull();
    expect(
      validateSave(mutated((r) => (r.progress = { ...good.progress, extra: true }))),
    ).toBeNull();
    expect(validateSave(mutated((r) => delete r.progress))).toBeNull();
  });

  it('rejects proto junk: an own __proto__ key is an unknown field, not a prototype', () => {
    // JSON.parse never assigns a prototype — it defines an OWN "__proto__" data
    // property. A strict validator must treat it as an unknown top-level field.
    const payload = JSON.parse(`{"__proto__":{"count":1},"v":2,"lookName":"indigo-gold",
      "mode":"hybrid","muted":false,"lang":"en","shards":0,"best":{},
      "streak":{"count":0,"lastDay":""},
      "progress":{"seedBase":"ABCDE2","floor":1,"tierComplete":false}}`);
    expect(Object.keys(payload)).toContain('__proto__'); // the fixture really is own-key junk
    expect(validateSave(payload)).toBeNull();
    // and a non-plain prototype (class instance) never passes either
    expect(validateSave(new Date())).toBeNull();
  });

  it('rejects non-objects and unknown top-level fields', () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave('save')).toBeNull();
    expect(validateSave(2)).toBeNull();
    expect(validateSave([good])).toBeNull();
    expect(validateSave(mutated((r) => (r.bonus = 'surprise')))).toBeNull();
    expect(validateSave(mutated((r) => delete r.lookName))).toBeNull();
  });
});

describe('save: migrateMeta (v1 → v2)', () => {
  it('maps every v1 field; progress starts fresh; lang is en', () => {
    const s = migrateMeta({
      v: 1,
      lookName: 'teal-white',
      mode: 'mouse',
      best: { 'OLDBASE:1': 9000 },
      streak: { count: 3, lastDay: '2026-11-08' },
      shards: 12,
      muted: true,
    });
    expect(s).toEqual({
      v: 2,
      lookName: 'teal-white',
      mode: 'mouse',
      muted: true,
      lang: 'en',
      shards: 12,
      best: { 'OLDBASE:1': 9000 },
      streak: { count: 3, lastDay: '2026-11-08' },
      progress: { seedBase: s.progress.seedBase, floor: 1, tierComplete: false },
    });
    expect(isValidSeed(s.progress.seedBase)).toBe(true); // a fresh campaign, not the old base
    expect(validateSave(s)).not.toBeNull();
  });

  it('defaults absent additive fields (older metas: no shards, no muted)', () => {
    const s = migrateMeta({
      v: 1,
      lookName: 'indigo-gold',
      mode: 'hybrid',
      best: {},
      streak: { count: 0, lastDay: '' },
    });
    expect(s.shards).toBe(0);
    expect(s.muted).toBe(false);
  });

  it('invalid payloads → defaultSave()', () => {
    for (const bad of [null, 'junk', 7, [], good, { v: 1 }]) {
      const s = migrateMeta(bad);
      expect(s.v).toBe(2);
      expect(s.lookName).toBe('indigo-gold');
      expect(s.best).toEqual({});
      expect(s.streak).toEqual({ count: 0, lastDay: '' });
      expect(s.shards).toBe(0);
      expect(s.muted).toBe(false);
      expect(s.progress).toEqual({ seedBase: s.progress.seedBase, floor: 1, tierComplete: false });
    }
  });

  it('salvages the valid fields of a partly-corrupt meta', () => {
    const s = migrateMeta({ v: 1, lookName: 'rose-gold', mode: 'tap', best: 'nope' });
    expect(s.lookName).toBe('rose-gold'); // good fields keep their value
    expect(s.mode).toBe('hybrid'); // bad fields fall back
    expect(s.best).toEqual({});
    expect(s.streak).toEqual({ count: 0, lastDay: '' });
  });
});

describe('save: mergeCampaign', () => {
  it('writes the campaign into progress immutably', () => {
    const s0 = defaultSave('PLAY22');
    const c: Campaign = { seedBase: 'NEXT88', floor: 7, tierComplete: true };
    const s1 = mergeCampaign(s0, c);
    expect(s1.progress).toEqual({ seedBase: 'NEXT88', floor: 7, tierComplete: true });
    expect(s1.progress).not.toBe(s0.progress); // a new box, never the old one in place
    expect(s1).not.toBe(s0);
    expect(s0.progress).toEqual({ seedBase: 'PLAY22', floor: 1, tierComplete: false }); // untouched
    expect(s0.streak).toEqual({ count: 0, lastDay: '' });
    expect(s1.best).toEqual({}); // the rest of the save rides along
  });
});

describe('save: serializeSave', () => {
  it('emits pretty JSON with a trailing newline that validates back', () => {
    const text = serializeSave(good);
    expect(text.endsWith('\n')).toBe(true);
    expect(JSON.parse(text)).toEqual(good);
    expect(validateSave(JSON.parse(text))).toEqual(good);
  });
});

describe('save: idb wrapper is inert under node (no indexedDB)', () => {
  it('get resolves null and put resolves without a store', async () => {
    await expect(idbGet()).resolves.toBeNull();
    await expect(idbPut(good)).resolves.toBeUndefined();
  });
});
