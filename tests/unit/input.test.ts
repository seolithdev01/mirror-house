// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  actionFor,
  capturableCode,
  keysToMoveInput,
  keysToMoveInput as map,
  mouseOnlyInput,
  rebind,
  withoutKey,
} from '../../src/engine/input';
import {
  KEY_TURN_PER_STEP,
  MOUSE_TURN_PER_STEP,
  TURN_SENSITIVITY,
} from '../../src/engine/constants';
import { DEFAULT_KEYMAP } from '../../src/game/save';

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

// ---- M5/T2 — remapping: the map resolves codes, rebind guards conflicts ------

describe('keysToMoveInput through a remapped keymap (M5/T2)', () => {
  it('a remapped forward key moves; the abandoned default code is dead', () => {
    const km = { ...DEFAULT_KEYMAP, forward: 'KeyP' };
    expect(keysToMoveInput(snap(['KeyP']), 'hybrid', km).forward).toBe(1);
    expect(keysToMoveInput(snap(['KeyW']), 'hybrid', km).forward).toBe(0); // W no longer moves
    expect(keysToMoveInput(snap(['KeyS']), 'hybrid', km).forward).toBe(-1); // untouched actions ride along
  });

  it('turning and sprint resolve through the map too', () => {
    const km = { ...DEFAULT_KEYMAP, turnL: 'KeyZ', turnR: 'KeyC', sprint: 'KeyX' };
    expect(keysToMoveInput(snap(['KeyC']), 'hybrid', km).turn).toBeCloseTo(KEY_TURN_PER_STEP);
    expect(keysToMoveInput(snap(['KeyZ']), 'keyboard', km).turn).toBeCloseTo(-KEY_TURN_PER_STEP);
    expect(keysToMoveInput(snap(['KeyX']), 'hybrid', km).sprint).toBe(true);
    expect(keysToMoveInput(snap(['KeyW']), 'hybrid', km).sprint).toBe(false); // W never sprinted anyway
    expect(keysToMoveInput(snap(['KeyX', 'KeyW']), 'hybrid', km).forward).toBe(1); // sprint pairs with move
  });

  it('arrows and the shifts stay hardwired alternates under any remap', () => {
    const km = { ...DEFAULT_KEYMAP, forward: 'KeyP', sprint: 'KeyX' };
    expect(keysToMoveInput(snap(['ArrowUp']), 'hybrid', km).forward).toBe(1);
    expect(keysToMoveInput(snap(['ArrowLeft']), 'hybrid', km).strafe).toBe(-1);
    expect(keysToMoveInput(snap(['ShiftRight']), 'hybrid', km).sprint).toBe(true);
  });

  it('the third parameter defaults to the default map — old call sites unchanged', () => {
    expect(keysToMoveInput(snap(['KeyW'])).forward).toBe(1);
    expect(keysToMoveInput(snap(['KeyP'])).forward).toBe(0);
  });
});

describe('actionFor — reverse lookup (M5/T2)', () => {
  it('returns the action for a unique code, null for an unmapped one', () => {
    expect(actionFor('KeyW', DEFAULT_KEYMAP)).toBe('forward');
    expect(actionFor('KeyI', DEFAULT_KEYMAP)).toBe('aaina');
    expect(actionFor('Space', DEFAULT_KEYMAP)).toBe('stepThrough');
    expect(actionFor('KeyZ', DEFAULT_KEYMAP)).toBeNull();
    expect(actionFor('', DEFAULT_KEYMAP)).toBeNull();
  });

  it('duplicate codes resolve to the LAST-defined action — KeyE is push, not turnR', () => {
    // The spelled-out semantics: DEFAULT_KEYMAP declares turnR before push, so
    // actionFor('KeyE') names push. main is the one that CONTEXTUALIZES — it
    // checks the door's push hint first and treats the key as turning
    // otherwise; actionFor itself stays pure and last-defined-wins.
    expect(actionFor('KeyE', DEFAULT_KEYMAP)).toBe('push');
    expect(actionFor('KeyE', { a: 'KeyE', b: 'KeyE' })).toBe('b'); // insertion order decides
  });

  it('breaking the E pair changes the lookup: KeyE names turnR once push leaves', () => {
    const km = { ...DEFAULT_KEYMAP, push: 'KeyP' };
    expect(actionFor('KeyE', km)).toBe('turnR');
    expect(actionFor('KeyP', km)).toBe('push');
  });

  it('a fully remapped map resolves every action', () => {
    const km: Record<string, string> = {};
    const actions = Object.keys(DEFAULT_KEYMAP);
    for (let i = 0; i < actions.length; i++) km[actions[i]!] = `Key${String.fromCharCode(65 + i)}`; // A..O, no duals
    for (const [action, code] of Object.entries(km)) expect(actionFor(code, km)).toBe(action);
  });
});

describe('rebind — conflict guard + immutability (M5/T2)', () => {
  it('a free code rebinds and returns a NEW map; the input is untouched', () => {
    const out = rebind(DEFAULT_KEYMAP, 'forward', 'KeyP');
    expect(out.conflict).toBeNull();
    expect(out.map.forward).toBe('KeyP');
    expect(out.map).not.toBe(DEFAULT_KEYMAP); // a copy, never the default in place
    expect(DEFAULT_KEYMAP.forward).toBe('KeyW'); // the default is readonly in spirit AND fact
    expect(Object.keys(out.map).length).toBe(Object.keys(DEFAULT_KEYMAP).length);
    expect(out.map.aaina).toBe('KeyI'); // every other action rides along
  });

  it('a code another action owns refuses with that action named, map unchanged', () => {
    const out = rebind(DEFAULT_KEYMAP, 'forward', 'KeyF'); // frost owns KeyF
    expect(out.conflict).toBe('frost');
    expect(out.map).toBe(DEFAULT_KEYMAP); // refused → the caller keeps what it had
    expect(DEFAULT_KEYMAP.forward).toBe('KeyW');
  });

  it('rebinding onto the E pair refuses — no new duplicates, not even a triple', () => {
    expect(rebind(DEFAULT_KEYMAP, 'frost', 'KeyE').conflict).toBe('turnR'); // first sharer named
    const split = rebind(DEFAULT_KEYMAP, 'push', 'KeyP').map; // E pair broken, push on P
    expect(rebind(split, 'frost', 'KeyP').conflict).toBe('push'); // P is taken now
    expect(rebind(split, 'turnR', 'KeyP').conflict).toBe('push'); // no rebuilding a dual elsewhere
  });

  it('rebinding an action to its own code is the sanctioned no-op (self)', () => {
    const out = rebind(DEFAULT_KEYMAP, 'forward', 'KeyW');
    expect(out.conflict).toBeNull();
    expect(out.map).toBe(DEFAULT_KEYMAP); // nothing changes — the same reference
  });

  it('moving an action OFF the shared E code is legal — the partner keeps the key', () => {
    const out = rebind(DEFAULT_KEYMAP, 'push', 'KeyP');
    expect(out.conflict).toBeNull();
    expect(out.map.turnR).toBe('KeyE'); // turnR keeps E
    expect(out.map.push).toBe('KeyP');
    // Rebuilding the dual elsewhere refuses too (keep simple: NO rebind creates
    // a duplicate; Reset-to-defaults is the one sanctioned way back to the
    // default E pair).
    const back = rebind(out.map, 'push', 'KeyE'); // push returns to E where turnR now sits alone
    expect(back.conflict).toBe('turnR');
    expect(back.map).toBe(out.map);
  });
});

// ---- M5/T5 — the capture-side gate: hardwired codes and junk never bind -------

describe('capturableCode — the rebind capture gate (M5/T5)', () => {
  it('refuses the hardwired alternates: the four arrows and both shifts', () => {
    // These fire their hardwired verbs under EVERY remap (arrows move/turn,
    // shifts sprint — see keysToMoveInput), so a binding there would fire two
    // actions at once; the capture refuses them before the save ever sees them.
    for (const code of [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ])
      expect(capturableCode(code), code).toBe(false);
  });

  it('refuses anything not KeyboardEvent.code-shaped — junk never reaches the save', () => {
    for (const code of ['', 'w', 'W', 'Key W', 'keyW', 'shiftLeft', 'Shift', 'Arrow', 'x'.repeat(25)])
      expect(capturableCode(code), JSON.stringify(code)).toBe(false);
  });

  it('accepts the ordinary bindables: letters, digits, Space, Enter, F- and Numpad- codes', () => {
    for (const code of ['KeyW', 'KeyP', 'Digit1', 'Space', 'Enter', 'F12', 'NumpadMultiply', 'IntlYen'])
      expect(capturableCode(code), code).toBe(true);
    // the non-hardwired modifiers stay bindable — only the shifts are alternates
    expect(capturableCode('ControlLeft')).toBe(true);
    expect(capturableCode('AltRight')).toBe(true);
  });
});
