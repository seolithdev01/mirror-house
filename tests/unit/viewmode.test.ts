// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  cycleView,
  exitTactical,
  isTactical,
  showsOverhead,
  type ViewMode,
} from '../../src/game/viewMode';

const ALL: ViewMode[] = ['focus', 'quad', 'overhead', 'tactical'];

describe('cycleView', () => {
  it('walks focus → quad → overhead → focus', () => {
    expect(cycleView('focus')).toBe('quad');
    expect(cycleView('quad')).toBe('overhead');
    expect(cycleView('overhead')).toBe('focus');
  });
  it('returns to focus after a full three-press cycle', () => {
    let v: ViewMode = 'focus';
    for (let i = 0; i < 3; i++) v = cycleView(v);
    expect(v).toBe('focus');
  });
  it('escapes tactical to focus', () => {
    expect(cycleView('tactical')).toBe('focus');
  });
});

describe('exitTactical', () => {
  it('tactical → focus; every other mode is unchanged', () => {
    expect(exitTactical('tactical')).toBe('focus');
    for (const v of ['focus', 'quad', 'overhead'] as const) expect(exitTactical(v)).toBe(v);
  });
});

describe('isTactical', () => {
  it('is true only for tactical (the simulation pause)', () => {
    for (const v of ALL) expect(isTactical(v)).toBe(v === 'tactical');
  });
});

describe('showsOverhead', () => {
  it('is true for overhead and tactical, false for the 3D modes', () => {
    for (const v of ALL) expect(showsOverhead(v)).toBe(v === 'overhead' || v === 'tactical');
  });
});
