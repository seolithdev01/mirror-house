// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { classifyZone, stickToMove } from '../../src/game/touch';
import type { TouchStick } from '../../src/game/touch';
import { TOUCH_DEADZONE, TOUCH_STICK_RADIUS_PX } from '../../src/engine/constants';

const stick = (dx: number, dy: number, active = true): TouchStick => ({ active, dx, dy });

describe('stickToMove — axes (T12/T1)', () => {
  it('forward = −dy: pushing the nub UP (dy negative) walks forward', () => {
    expect(stickToMove(stick(0, -1))).toEqual({ forward: 1, strafe: 0 });
    expect(stickToMove(stick(0, 1))).toEqual({ forward: -1, strafe: 0 });
  });
  it('strafe = dx: right is positive', () => {
    expect(stickToMove(stick(1, 0))).toEqual({ forward: 0, strafe: 1 });
    expect(stickToMove(stick(-1, 0))).toEqual({ forward: 0, strafe: -1 });
  });
  it('an inactive stick is idle — lifted thumb never moves the player', () => {
    expect(stickToMove(stick(0.9, -0.9, false))).toEqual({ forward: 0, strafe: 0 });
  });
});

describe('stickToMove — analog magnitude (T12/T1)', () => {
  it('half a nub is half a walk: magnitude passes through unscaled', () => {
    // 0.5 of the radius straight up — analog walk, not a key press
    expect(stickToMove(stick(0, -0.5)).forward).toBeCloseTo(0.5);
    expect(stickToMove(stick(0.3, 0)).strafe).toBeCloseTo(0.3);
  });
  it('a diagonal keeps its direction; magnitude is the analog speed', () => {
    const m = stickToMove(stick(0.6, -0.8)); // magnitude exactly 1
    expect(m.strafe).toBeCloseTo(0.6);
    expect(m.forward).toBeCloseTo(0.8);
  });
  it('magnitude beyond the stick radius clamps to exactly 1', () => {
    const m = stickToMove(stick(1.2, -0.9)); // magnitude 1.5
    expect(m.strafe).toBeCloseTo(0.8); // 1.2 / 1.5
    expect(m.forward).toBeCloseTo(0.6); // 0.9 / 1.5
    expect(Math.hypot(m.forward, m.strafe)).toBeCloseTo(1);
  });
  it('a pure over-flick clamps each reported value to ≤ 1 without flipping', () => {
    expect(stickToMove(stick(2.5, 0)).strafe).toBe(1);
    expect(stickToMove(stick(0, -3)).forward).toBe(1);
  });
});

describe('stickToMove — deadzone (T12/T1)', () => {
  it('thumb jitter below TOUCH_DEADZONE is idle', () => {
    expect(stickToMove(stick(0.1, 0))).toEqual({ forward: 0, strafe: 0 });
    expect(stickToMove(stick(0.1, 0.1))).toEqual({ forward: 0, strafe: 0 }); // mag ≈ 0.141
  });
  it('the deadzone gates on magnitude, not per-axis — one live axis survives a quiet partner', () => {
    // mag 0.2 ≥ TOUCH_DEADZONE with dy inside the deadzone: dy passes analog, not zeroed per-axis
    const m = stickToMove(stick(0.19, 0));
    expect(m.strafe).toBeCloseTo(0.19);
  });
  it('the deadzone edge itself is live (magnitude ≥ TOUCH_DEADZONE moves)', () => {
    const m = stickToMove(stick(0, -TOUCH_DEADZONE));
    expect(m.forward).toBeCloseTo(TOUCH_DEADZONE);
  });
  it('TOUCH_DEADZONE is the ratified 0.18 and the radius the ratified 56px (pin)', () => {
    expect(TOUCH_DEADZONE).toBe(0.18);
    expect(TOUCH_STICK_RADIUS_PX).toBe(56);
  });
});

describe('classifyZone — the 45/55 split (T12/T1)', () => {
  it('left of 0.45·viewW is stick; the boundary itself is look', () => {
    expect(classifyZone(0, 1000)).toBe('stick');
    expect(classifyZone(449.9, 1000)).toBe('stick');
    expect(classifyZone(450, 1000)).toBe('look'); // strict <
    expect(classifyZone(999, 1000)).toBe('look');
  });
  it('scales with the viewport — the phone-width pin (390 → 175.5)', () => {
    expect(classifyZone(175, 390)).toBe('stick');
    expect(classifyZone(175.5, 390)).toBe('look');
    expect(classifyZone(176, 390)).toBe('look');
  });
});
