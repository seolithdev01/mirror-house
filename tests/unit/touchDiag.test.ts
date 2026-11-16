// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  diagEventType,
  formatDiagHeader,
  formatDiagRow,
  parseDiagMode,
  pushDiagRow,
  TOUCH_DIAG_ROWS,
  type TouchDiagEvent,
} from '../../src/ui/touchDiag';

// t12 hotfix — the ?diag=1 overlay's pure layer: the flag parser (the
// parseTestMode contract), the event-type mapping, the row/header formats and
// the 10-row ring cap. The DOM factory in the same module is browser-only
// (the touchUi.ts precedent) and never imported here.

describe('parseDiagMode — the ?diag=1 gate', () => {
  it('is on for diag=1 (with or without the leading ?)', () => {
    expect(parseDiagMode('?diag=1')).toBe(true); // the shape main.ts passes
    expect(parseDiagMode('diag=1')).toBe(true);
  });

  it('is off for diag=0 — the explicit reset', () => {
    expect(parseDiagMode('?diag=0')).toBe(false);
  });

  it('is off when the param is absent (the default experience)', () => {
    expect(parseDiagMode('')).toBe(false);
    expect(parseDiagMode('?')).toBe(false);
    expect(parseDiagMode('?seed=PLAYTEST&test=1')).toBe(false);
  });

  it('is off for junk values — exact 1 only', () => {
    expect(parseDiagMode('?diag=yes')).toBe(false);
    expect(parseDiagMode('?diag=true')).toBe(false);
    expect(parseDiagMode('?diag=2')).toBe(false);
    expect(parseDiagMode('?diag=01')).toBe(false);
    expect(parseDiagMode('?diag=')).toBe(false);
  });

  it('rides along with other params anywhere in the query', () => {
    expect(parseDiagMode('?seed=TESTMO&diag=1')).toBe(true);
    expect(parseDiagMode('?diag=1&seed=TESTMO&lang=hi')).toBe(true);
    expect(parseDiagMode('?lang=hi&seed=TESTMO&diag=0')).toBe(false);
  });
});

describe('diagEventType — the four documented pointer types', () => {
  it('maps the four pointer events to their row words', () => {
    expect(diagEventType('pointerdown')).toBe('down');
    expect(diagEventType('pointermove')).toBe('move');
    expect(diagEventType('pointerup')).toBe('up');
    expect(diagEventType('pointercancel')).toBe('cancel');
  });

  it('returns null for anything else — the overlay renders only its four words', () => {
    expect(diagEventType('pointerover')).toBeNull();
    expect(diagEventType('click')).toBeNull();
    expect(diagEventType('')).toBeNull();
  });
});

describe('formatDiagRow — the documented row contract', () => {
  it('renders id · type · word · x,y · target tag', () => {
    const e: TouchDiagEvent = {
      pointerId: 7,
      pointerType: 'touch',
      type: 'down',
      x: 120,
      y: 640,
      target: 'CANVAS',
    };
    expect(formatDiagRow(e)).toBe('#7 · touch · down · 120,640 · CANVAS');
  });

  it('renders the cancel word — the phone-failure signal the panel exists to catch', () => {
    const e: TouchDiagEvent = {
      pointerId: 3,
      pointerType: 'touch',
      type: 'cancel',
      x: 64,
      y: 700,
      target: 'DIV',
    };
    expect(formatDiagRow(e)).toBe('#3 · touch · cancel · 64,700 · DIV');
  });
});

describe('formatDiagHeader — mode, coarse and compact', () => {
  it('names the resolved mode and both device/layout flags', () => {
    expect(formatDiagHeader('touch', true, true)).toBe('DIAG · mode=touch · coarse=Y · compact=Y');
    expect(formatDiagHeader('hybrid', false, false)).toBe(
      'DIAG · mode=hybrid · coarse=N · compact=N',
    );
  });
});

describe('pushDiagRow — the 10-row ring', () => {
  const row = (id: number): TouchDiagEvent => ({
    pointerId: id,
    pointerType: 'touch',
    type: 'move',
    x: id,
    y: id,
    target: 'BODY',
  });

  it('prepends the newest row', () => {
    const next = pushDiagRow([row(1)], row(2));
    expect(next.map((r) => r.pointerId)).toEqual([2, 1]);
  });

  it('caps at 10 rows, oldest dropped first', () => {
    let rows: TouchDiagEvent[] = [];
    for (let id = 1; id <= 15; id++) rows = pushDiagRow(rows, row(id));
    expect(rows).toHaveLength(TOUCH_DIAG_ROWS);
    expect(rows.map((r) => r.pointerId)).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7, 6]);
  });

  it('never mutates the input array', () => {
    const base = [row(1)];
    pushDiagRow(base, row(2));
    expect(base.map((r) => r.pointerId)).toEqual([1]);
  });
});
