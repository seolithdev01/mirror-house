// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  keysToMoveInput,
  keysToMoveInput as map,
  mouseOnlyInput,
  withoutKey,
} from '../../src/engine/input';
import {
  KEY_TURN_PER_STEP,
  MOUSE_TURN_PER_STEP,
  TURN_SENSITIVITY,
} from '../../src/engine/constants';

const snap = (keys: string[], mouseDx = 0) => ({ keys: new Set(keys), mouseDx });

describe('keysToMoveInput', () => {
  it('WASD maps to forward/strafe', () => {
    expect(keysToMoveInput(snap(['KeyW'])).forward).toBe(1);
    expect(keysToMoveInput(snap(['KeyS'])).forward).toBe(-1);
    expect(keysToMoveInput(snap(['KeyD'])).strafe).toBe(1);
    expect(keysToMoveInput(snap(['KeyA'])).strafe).toBe(-1);
    expect(keysToMoveInput(snap([])).forward).toBe(0);
  });

  it('arrows work too and combine with shift sprint', () => {
    const i = keysToMoveInput(snap(['ArrowUp', 'ShiftLeft'], 10));
    expect(i.forward).toBe(1);
    expect(i.sprint).toBe(true);
    expect(i.turn).toBeCloseTo(10 * TURN_SENSITIVITY);
  });

  it('opposites cancel; no keys = idle', () => {
    expect(keysToMoveInput(snap(['KeyW', 'KeyS'])).forward).toBe(0);
    const idle = keysToMoveInput(snap([]));
    expect(idle).toEqual({ forward: 0, strafe: 0, sprint: false, turn: 0 });
  });
});

describe('input modes', () => {
  it('keyboard mode: arrows turn, no strafe, Q/E turn', () => {
    const right = map({ keys: new Set(['ArrowRight']), mouseDx: 0 }, 'keyboard');
    expect(right.turn).toBeCloseTo(KEY_TURN_PER_STEP);
    expect(right.strafe).toBe(0);
    expect(map({ keys: new Set(['KeyQ']), mouseDx: 0 }, 'keyboard').turn).toBeCloseTo(
      -KEY_TURN_PER_STEP,
    );
    const both = map({ keys: new Set(['ArrowRight', 'KeyD']), mouseDx: 0 }, 'keyboard');
    expect(both.strafe).toBe(0);
  });
  it('hybrid mode: arrows strafe, mouse turns, Q/E turns too', () => {
    const h = map({ keys: new Set(['ArrowRight', 'KeyE']), mouseDx: 10 });
    expect(h.strafe).toBe(1);
    expect(h.turn).toBeCloseTo(10 * 0.003 + KEY_TURN_PER_STEP);
  });
  it('mouse-only: hold left = walk steering toward cursor; right = sprint; center deadzone', () => {
    expect(mouseOnlyInput({ leftDown: true, rightDown: false, cursorNorm: 0 })).toEqual({
      forward: 1,
      strafe: 0,
      sprint: false,
      turn: 0,
    });
    expect(mouseOnlyInput({ leftDown: true, rightDown: true, cursorNorm: 0.65 }).turn).toBeCloseTo(
      MOUSE_TURN_PER_STEP,
    );
    expect(mouseOnlyInput({ leftDown: false, rightDown: false, cursorNorm: 1 }).forward).toBe(0);
    expect(mouseOnlyInput({ leftDown: true, rightDown: false, cursorNorm: -0.9 }).turn).toBeCloseTo(
      -MOUSE_TURN_PER_STEP,
    );
    expect(mouseOnlyInput({ leftDown: true, rightDown: false, cursorNorm: 0.1 }).turn).toBe(0); // deadzone
  });
});

describe('withoutKey — the dual-use key claim', () => {
  it('drops only the claimed key, keeps the rest and the mouse; absent key → same snapshot', () => {
    const s = snap(['KeyE', 'KeyW'], 7);
    const claimed = withoutKey(s, 'KeyE');
    expect(claimed.keys.has('KeyE')).toBe(false);
    expect(claimed.keys.has('KeyW')).toBe(true);
    expect(claimed.mouseDx).toBe(7);
    expect(withoutKey(s, 'KeyQ')).toBe(s); // nothing claimed → same reference
  });

  it('a claimed key loses exactly its turn share — mouse and other keys keep turning', () => {
    const s = snap(['KeyE'], 10);
    expect(keysToMoveInput(s).turn).toBeCloseTo(10 * TURN_SENSITIVITY + KEY_TURN_PER_STEP);
    expect(keysToMoveInput(withoutKey(s, 'KeyE')).turn).toBeCloseTo(10 * TURN_SENSITIVITY);
    expect(keysToMoveInput(withoutKey(s, 'KeyE')).forward).toBe(0); // only turn is E's share
  });
});
