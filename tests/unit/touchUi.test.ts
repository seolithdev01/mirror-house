// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { COMPACT_BREAKPOINT_PX } from '../../src/engine/constants';
import type { InputMode } from '../../src/engine/input';
import { isCompactLayout, panesDefault, shouldShowTouchUi } from '../../src/ui/touchUi';

// T12/T2 — the touch UI's three visibility predicates, pure. Everything the
// overlay and the responsive declutter do rides on these truth tables; the
// DOM factory in the same module is browser-only (the minimap.ts precedent)
// and never imported here.

describe('shouldShowTouchUi — the overlay visibility gate (T12/T2)', () => {
  const cases: Array<[boolean, boolean, InputMode, boolean, string]> = [
    [true, false, 'touch', true, 'coarse device in touch mode → the overlay shows at once'],
    [false, true, 'touch', true, 'fine primary pointer, but a touch was seen → shows (the touchscreen laptop)'],
    [true, true, 'touch', true, 'coarse AND touched → shows'],
    [false, false, 'touch', false, 'touch mode on a never-touched fine device → waits for the first touch'],
    [true, false, 'hybrid', false, 'the mode gates: coarse hardware alone never raises the stick'],
    [false, true, 'keyboard', false, 'a seen touch in keyboard mode shows nothing'],
    [true, false, 'mouse', false, 'coarse hardware in mouse mode shows nothing'],
    [false, false, 'keyboard', false, 'the fully-desktop case never shows'],
  ];
  for (const [hasCoarse, seenTouch, mode, want, name] of cases) {
    it(name, () => {
      expect(shouldShowTouchUi(hasCoarse, seenTouch, mode)).toBe(want);
    });
  }
});

describe('isCompactLayout — the responsive declutter gate (T12/T2)', () => {
  it('declares compact at or under COMPACT_BREAKPOINT_PX (≤, the boundary is compact), never above', () => {
    expect(isCompactLayout(900, false)).toBe(true); // the breakpoint pixel itself is compact
    expect(isCompactLayout(899, false)).toBe(true);
    expect(isCompactLayout(390, false)).toBe(true); // the phone-width pin (the T3 e2e viewport)
    expect(isCompactLayout(901, false)).toBe(false);
    expect(isCompactLayout(1280, false)).toBe(false); // the desktop e2e viewport stays as shipped
    expect(isCompactLayout(1440, false)).toBe(false); // the desktop live-check width
  });
  it('a coarse pointer forces compact at ANY width — the declutter follows the touch hand', () => {
    expect(isCompactLayout(1440, true)).toBe(true);
    expect(isCompactLayout(901, true)).toBe(true);
    expect(isCompactLayout(390, true)).toBe(true);
  });
  it('the breakpoint constant is pinned at 900', () => {
    expect(COMPACT_BREAKPOINT_PX).toBe(900);
  });
});

describe('panesDefault — the minimap/motion pane boot defaults (T12/T2)', () => {
  it('desktop (not compact, not touch) keeps the shipped defaults: both panes on', () => {
    expect(panesDefault(false, false)).toEqual({ map: true, motion: true });
  });
  it('compact hides both by default — the dock chips summon them as overlays', () => {
    expect(panesDefault(true, false)).toEqual({ map: false, motion: false });
  });
  it('touch mode hides both even on a wide window (the declutter follows the touch hand)', () => {
    expect(panesDefault(false, true)).toEqual({ map: false, motion: false });
  });
  it('compact + touch hides both', () => {
    expect(panesDefault(true, true)).toEqual({ map: false, motion: false });
  });
});
