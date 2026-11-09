// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_A11Y,
  DEFAULT_KEYMAP,
  defaultSave,
  idbGet,
  idbPut,
  mergeCampaign,
  migrateMeta,
  normalizeSave,
  serializeSave,
  validateSave,
  type A11ySettings,
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
      a11y: DEFAULT_A11Y,
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

// ---- M5/T1 — a11y fields, additive and optional-in-validation ------------------
//
// The a11y box arrives additively: old v2 saves (stored, exported, imported
// before M5) carry NO a11y key, validate unchanged, and gain defaults only
// post-load via normalizeSave. New exports emit the full shape.

describe('save: a11y field validation (M5/T1)', () => {
  it('accepts an old-shape v2 save without a11y — no key synthesized, validation owns shape', () => {
    const out = validateSave(JSON.parse(JSON.stringify(good)));
    expect(out).toEqual(good); // byte-for-byte the pre-M5 contract
    expect(out?.a11y).toBeUndefined(); // normalizeSave owns the defaults, not validateSave
  });

  it('accepts and echoes a full save with a11y — fresh tree, no shared structure', () => {
    const a11y: A11ySettings = {
      reducedFlash: true,
      captions: true,
      textScale: 1.25,
      keyMap: { ...DEFAULT_KEYMAP, aaina: 'KeyP' },
    };
    const out = validateSave(JSON.parse(JSON.stringify({ ...good, a11y })));
    expect(out).toEqual({ ...good, a11y });
    expect(out?.a11y?.keyMap).not.toBe(a11y.keyMap); // a fresh box, never the input's
  });

  it('rejects malformed a11y boxes', () => {
    const withA11y = (a11y: unknown): unknown => mutated((r) => (r.a11y = a11y));
    const flags = { reducedFlash: false, captions: false };
    // M5/T2 tightened keyMap validation: the full 15-action set, code-shaped
    // values (the remap layer's own describe block owns those semantics).
    expect(
      validateSave(
        withA11y({ ...flags, textScale: 1, keyMap: { ...DEFAULT_KEYMAP, aaina: 'KeyP' } }),
      ),
    ).not.toBeNull();
    expect(validateSave(withA11y(null))).toBeNull();
    expect(validateSave(withA11y('a11y'))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 1 }))).toBeNull(); // keyMap missing
    expect(validateSave(withA11y({ ...flags, textScale: 1, keyMap: {} }))).toBeNull(); // empty is not a map
    expect(validateSave(withA11y({ reducedFlash: 1, captions: false, textScale: 1, keyMap: {} }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, captions: 'no', textScale: 1, keyMap: {} }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 1.1, keyMap: {} }))).toBeNull(); // off the ladder
    expect(validateSave(withA11y({ ...flags, textScale: '1', keyMap: {} }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 2, keyMap: {} }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 1, keyMap: 'wasd' }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 1, keyMap: { aaina: 9 } }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 1, keyMap: { '': 'KeyI' } }))).toBeNull();
    expect(validateSave(withA11y({ ...flags, textScale: 1, keyMap: { aaina: '' } }))).toBeNull();
    expect(
      validateSave(withA11y({ ...flags, textScale: 1, keyMap: {}, extra: true })),
    ).toBeNull(); // unknown field inside a11y
  });

  it('defaultSave carries the full default a11y and validates', () => {
    const s = defaultSave('ABCDE2');
    expect(s.a11y).toEqual(DEFAULT_A11Y);
    expect(validateSave(s)).not.toBeNull();
  });
});

describe('save: normalizeSave — defaults applied post-load (M5/T1)', () => {
  it('fills the default a11y into an old-shape save (the stored/pre-M5 boot path)', () => {
    const old = validateSave(JSON.parse(JSON.stringify(good)))!;
    expect(old.a11y).toBeUndefined();
    const s = normalizeSave(old);
    expect(s.a11y).toEqual(DEFAULT_A11Y);
    expect(s.a11y?.keyMap).toEqual(DEFAULT_KEYMAP);
  });

  it('keeps a present, valid a11y untouched — the same save object, no churn', () => {
    const a11y: A11ySettings = { reducedFlash: true, captions: false, textScale: 1.5, keyMap: { ...DEFAULT_KEYMAP } };
    const withA11y = { ...good, a11y };
    const s = normalizeSave(withA11y);
    expect(s).toBe(withA11y); // nothing to fill — identical reference
    expect(s.a11y).toBe(a11y);
  });

  it('heals an invalid a11y to defaults (belt and braces — a hand-built save never crashes boot)', () => {
    const junk = { ...good, a11y: { reducedFlash: 'yes', captions: 0, textScale: 9, keyMap: null } };
    const s = normalizeSave(junk as unknown as SaveData);
    expect(s.a11y).toEqual(DEFAULT_A11Y);
  });

  it('a normalized save serializes and validates back through the export round-trip', () => {
    const s = normalizeSave(validateSave(JSON.parse(JSON.stringify(good)))!);
    const text = serializeSave(s);
    expect(JSON.parse(text)).toEqual(s); // export emits the FULL shape, a11y included
    expect(validateSave(JSON.parse(text))).toEqual(s);
  });
});

describe('DEFAULT_KEYMAP (M5/T1)', () => {
  it('has exactly the 15 actions with the authoritative defaults', () => {
    expect(Object.keys(DEFAULT_KEYMAP).length).toBe(15);
    expect(DEFAULT_KEYMAP).toEqual({
      forward: 'KeyW',
      back: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      sprint: 'ShiftLeft',
      turnL: 'KeyQ',
      turnR: 'KeyE',
      frost: 'KeyF',
      view: 'KeyV',
      aaina: 'KeyI',
      push: 'KeyE',
      stepThrough: 'Space',
      faq: 'KeyH',
      mute: 'KeyM',
      tactical: 'KeyT',
    });
  });

  it('codes are unique except the sanctioned E-dual (turnR + push share KeyE)', () => {
    const byCode = new Map<string, string[]>();
    for (const [action, code] of Object.entries(DEFAULT_KEYMAP))
      byCode.set(code, [...(byCode.get(code) ?? []), action]);
    const shared = [...byCode.entries()].filter(([, actions]) => actions.length > 1);
    expect(shared.length).toBe(1); // exactly one dual key in the default map
    const [code, actions] = shared[0]!;
    expect(code).toBe('KeyE'); // E stays dual with the door-claim
    expect([...actions].sort()).toEqual(['push', 'turnR']);
  });

  it('Q and E are pure turning — Aaina moved to her own key I (M5/T1 decision)', () => {
    expect(byAction('turnL')).toBe('KeyQ');
    expect(byAction('turnR')).toBe('KeyE');
    expect(byAction('aaina')).toBe('KeyI'); // her own key — the Q conflict is dead
    expect([...Object.entries(DEFAULT_KEYMAP)].filter(([, c]) => c === 'KeyQ').map(([a]) => a)).toEqual([
      'turnL',
    ]);
  });
});

function byAction(action: string): string {
  const code = (DEFAULT_KEYMAP as Record<string, string>)[action];
  if (code === undefined) throw new Error(`unknown action ${action}`);
  return code;
}

// ---- M5/T2 — the remap layer's keymap semantics: known actions, code shapes --

describe('save: keyMap validation — known actions + code shapes (M5/T2)', () => {
  const withKeyMap = (keyMap: unknown): unknown => mutated((r) => (r.a11y = keyMap));
  const flags = { reducedFlash: false, captions: false, textScale: 1 };
  const a11yWith = (keyMap: unknown): unknown => withKeyMap({ ...flags, keyMap });

  it('accepts a remapped full map — every action present, codes round-trip', () => {
    const keyMap = { ...DEFAULT_KEYMAP, forward: 'KeyP', push: 'Minus' };
    const out = validateSave(a11yWith(keyMap));
    expect(out?.a11y?.keyMap).toEqual(keyMap);
    expect(out?.a11y?.keyMap).not.toBe(keyMap); // fresh tree, never the input's
  });

  it('rejects unknown actions — the 15 are the whole vocabulary', () => {
    expect(
      validateSave(a11yWith({ ...DEFAULT_KEYMAP, macro: 'KeyP' })),
    ).toBeNull(); // extra action
    expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP, Forward: 'KeyP' }))).toBeNull(); // case is not a rename
  });

  it('rejects missing actions — a valid map binds every one of the 15', () => {
    const partial = { ...DEFAULT_KEYMAP } as Record<string, string>;
    delete partial.frost;
    expect(validateSave(a11yWith(partial))).toBeNull();
  });

  it('rejects values that are not KeyboardEvent.code-shaped', () => {
    for (const bad of ['wasd', 'keyW', 'P', 'Key W', 'Key-W', 'keydown', 'X'.repeat(30), ' KeyW']) {
      expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP, forward: bad })), `${bad} shape`).toBeNull();
    }
  });

  it('accepts the real code families a capture can produce', () => {
    for (const good of [
      'KeyP',
      'Digit1',
      'ArrowDown',
      'ShiftRight',
      'Enter',
      'NumpadMultiply',
      'F12',
      'Semicolon',
      'IntlYen',
    ]) {
      expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP, forward: good })), `${good} shape`).not.toBeNull();
    }
    // Space is a real code too — it just belongs to stepThrough by default, so
    // binding it elsewhere must move stepThrough off it first (no new duals).
    expect(
      validateSave(a11yWith({ ...DEFAULT_KEYMAP, forward: 'Space', stepThrough: 'Minus' })),
    ).not.toBeNull();
    expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP, forward: 'Space' }))).toBeNull(); // would double-book Space
  });

  it('duplicates: only the turnR+push pair may share a code — nothing else, no triples', () => {
    expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP }))).not.toBeNull(); // the default E pair
    expect(
      validateSave(a11yWith({ ...DEFAULT_KEYMAP, turnR: 'KeyR', push: 'KeyR' })),
    ).not.toBeNull(); // the pair on another code is the same sanctioned shape
    expect(
      validateSave(a11yWith({ ...DEFAULT_KEYMAP, turnR: 'KeyP', push: 'KeyP', forward: 'KeyP' })),
    ).toBeNull(); // a triple
    expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP, frost: 'KeyW' }))).toBeNull(); // forward+frost share
    expect(validateSave(a11yWith({ ...DEFAULT_KEYMAP, turnR: 'KeyR', aaina: 'KeyR' }))).toBeNull(); // turnR+aaina is not the sanctioned pair
  });
});

describe('save: idb wrapper is inert under node (no indexedDB)', () => {
  it('get resolves null and put resolves without a store', async () => {
    await expect(idbGet()).resolves.toBeNull();
    await expect(idbPut(good)).resolves.toBeUndefined();
  });
});
