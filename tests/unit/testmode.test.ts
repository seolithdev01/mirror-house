// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { parseTestMode } from '../../src/game/testMode';

// step007/T3 — tester mode's pure flag: `?test=1` unlocks the diagnostics
// hook + TESTER chip in ANY build (PROD included — that is the point),
// `?test=0` is the documented reset, and everything else is off. The input is
// the raw query string (window.location.search, leading `?` included), so the
// suite can walk every shape without a browser.
describe('parseTestMode', () => {
  it('is on for test=1 (with or without the leading ?)', () => {
    expect(parseTestMode('?test=1')).toBe(true); // the shape main.ts passes
    expect(parseTestMode('test=1')).toBe(true);
  });

  it('is off for test=0 — the explicit reset', () => {
    expect(parseTestMode('?test=0')).toBe(false);
  });

  it('is off when the param is absent (the default experience)', () => {
    expect(parseTestMode('')).toBe(false);
    expect(parseTestMode('?')).toBe(false);
    expect(parseTestMode('?seed=PLAYTEST&look=teal-white')).toBe(false);
  });

  it('is off for junk values — exact 1 only', () => {
    expect(parseTestMode('?test=yes')).toBe(false);
    expect(parseTestMode('?test=true')).toBe(false);
    expect(parseTestMode('?test=2')).toBe(false);
    expect(parseTestMode('?test=01')).toBe(false);
    expect(parseTestMode('?test=1x')).toBe(false);
    expect(parseTestMode('?test=')).toBe(false);
  });

  it('rides along with other params anywhere in the query', () => {
    expect(parseTestMode('?seed=TESTMO&test=1')).toBe(true);
    expect(parseTestMode('?test=1&seed=TESTMO&lang=hi')).toBe(true);
    expect(parseTestMode('?lang=hi&seed=TESTMO&test=0')).toBe(false);
  });

  it('0 wins over 1 when both appear — the reset must reset', () => {
    expect(parseTestMode('?test=1&test=0')).toBe(false);
    expect(parseTestMode('?test=0&test=1')).toBe(false);
  });
});
