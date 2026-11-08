// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { keysToMoveInput } from '../../src/engine/input';
import { TURN_SENSITIVITY } from '../../src/engine/constants';

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
