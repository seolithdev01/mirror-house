// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { choicesFor, dismissStart } from '../../src/ui/startScreen';

// T13/T1 — the start screen's pure core. Everything the overlay does rides on
// two decisions: WHICH buttons the plate carries (choicesFor's truth table —
// fresh saves descend, stored campaigns continue) and WHETHER the gate has
// opened (dismissStart's terminal phase). The DOM factory in the same module
// is browser-only (the touchUi.ts precedent) and never constructed here.

describe('choicesFor — the start screen truth table (T13/T1)', () => {
  it('fresh → one primary BEGIN, no secondary, no continue label', () => {
    expect(choicesFor(false, 1)).toEqual({ primary: 'begin', secondary: false });
  });

  it('hasProgress is the sole gate — a fresh save ignores the floor number', () => {
    expect(choicesFor(false, 7)).toEqual({ primary: 'begin', secondary: false });
    expect(choicesFor(false, 100)).toEqual({ primary: 'begin', secondary: false });
  });

  it('stored → CONTINUE primary + NEW HOUSE ghost secondary', () => {
    const c = choicesFor(true, 7);
    expect(c.primary).toBe('continue');
    expect(c.secondary).toBe(true);
  });

  it('floor 1 with progress is still a stored campaign — the tier flag resumes at 1', () => {
    const c = choicesFor(true, 1);
    expect(c.primary).toBe('continue');
    expect(c.secondary).toBe(true);
  });

  it('continueLabel is the {n} payload — pure digits, language-free', () => {
    expect(choicesFor(true, 1).continueLabel).toBe('1');
    expect(choicesFor(true, 12).continueLabel).toBe('12');
    expect(choicesFor(true, 100).continueLabel).toBe('100');
  });

  it('the fresh shape never carries a continue label', () => {
    expect(choicesFor(false, 42).continueLabel).toBeUndefined();
  });
});

describe('dismissStart — the gate is terminal (T13/T1)', () => {
  it('a plated screen dismisses', () => {
    expect(dismissStart('plated')).toBe('dismissed');
  });

  it('dismiss is idempotent — the door never re-plates within a session', () => {
    expect(dismissStart('dismissed')).toBe('dismissed');
  });
});
