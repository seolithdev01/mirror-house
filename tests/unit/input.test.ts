// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  InputCollector,
  MODE_LOCK_OPEN,
  actionFor,
  applyLockInput,
  capturableCode,
  defaultMode,
  detectMode,
  isModifierCode,
  keysToMoveInput,
  keysToMoveInput as map,
  modeLockFor,
  mouseOnlyInput,
  rebind,
  withoutKey,
  type DeviceSignals,
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

  it('KeyN names the minimap toggle (T11) — a pure dispatch pin', () => {
    expect(actionFor('KeyN', DEFAULT_KEYMAP)).toBe('map');
  });

  it('KeyB names the motion-pane toggle (T11/T2) — a pure dispatch pin', () => {
    expect(actionFor('KeyB', DEFAULT_KEYMAP)).toBe('body');
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

// ---- T12/T1 — the touch plumbing: boot auto-select + pointer tracking --------
// ---- T12b/T1 — the detection ladder (two-arm) + the first-input lock ----------

/** Every DeviceSignals combination the four booleans can name — the full
 *  16-row truth table the ladder must survive unchanged. */
function* allSignals(): Generator<DeviceSignals> {
  for (const coarse of [false, true])
    for (const touchCapable of [false, true])
      for (const fine of [false, true])
        for (const hover of [false, true]) yield { coarse, touchCapable, fine, hover };
}

describe('detectMode — the two-arm boot ladder (T12b/T1)', () => {
  it('pins the FULL truth table: touchCapable → touch, else hybrid (the desktop arm keeps keyboard + mouse)', () => {
    for (const s of allSignals()) {
      const expected = s.touchCapable ? 'touch' : 'hybrid';
      expect(detectMode(s), JSON.stringify(s)).toBe(expected);
    }
  });
  it('a phone or tablet (coarse primary, touch) → touch', () => {
    expect(detectMode({ coarse: true, touchCapable: true, fine: false, hover: false })).toBe(
      'touch',
    );
  });
  it('an iPad WITH a keyboard attached (coarse + fine + hover + touch) → touch', () => {
    expect(detectMode({ coarse: true, touchCapable: true, fine: true, hover: true })).toBe(
      'touch',
    );
  });
  it('a Surface-class fine-primary machine with a touchscreen → touch (touchscreen wins)', () => {
    expect(detectMode({ coarse: false, touchCapable: true, fine: true, hover: true })).toBe(
      'touch',
    );
  });
  it('a mouse-only kiosk (fine + hover, zero touch) → hybrid — a mouse without a keyboard is undetectable, and hybrid carries BOTH keyboard and mouse; pure mouse stays reachable via ⚙', () => {
    expect(detectMode({ coarse: false, touchCapable: false, fine: true, hover: true })).toBe(
      'hybrid',
    );
  });
  it('no signals at all → hybrid (anything that runs a browser UI has a keyboard; mouse look rides along)', () => {
    expect(detectMode({ coarse: false, touchCapable: false, fine: false, hover: false })).toBe(
      'hybrid',
    );
  });
});

describe('defaultMode — back-compat wrapper over the ladder (T12b/T1)', () => {
  it('a stored mode always wins — existing saves keep their mode, no wipe', () => {
    expect(defaultMode(true, 'keyboard')).toBe('keyboard');
    expect(defaultMode(true, 'mouse')).toBe('mouse');
    expect(defaultMode(true, 'hybrid')).toBe('hybrid');
    expect(defaultMode(false, 'touch')).toBe('touch');
  });
  it('a NEW save (no stored mode): coarse ⇒ touch-capable → touch, else hybrid — the T12 default', () => {
    expect(defaultMode(true)).toBe('touch'); // the wrapper maps coarse → touchCapable
    expect(defaultMode(false)).toBe('hybrid');
  });
});

describe('applyLockInput — the first-input lock (T12b/T1)', () => {
  it('a touch pointerdown locks touch', () => {
    expect(applyLockInput(MODE_LOCK_OPEN, 'touch-down')).toEqual({
      locked: true,
      mode: 'touch',
    });
  });
  it('FRESH + keydown locks HYBRID — not keyboard: a keypress proves a keyboard, and hybrid keeps mouse look alive', () => {
    const locked = applyLockInput(MODE_LOCK_OPEN, 'key-down');
    expect(locked).toEqual({ locked: true, mode: 'hybrid' });
    expect(locked.mode).not.toBe('keyboard'); // keys-only would kill mouse-look — never the lock's pick
    expect(locked.mode).not.toBe('mouse');
  });
  it('mouse input NEVER locks — ambiguous (the keyboard stands), same state back', () => {
    expect(applyLockInput(MODE_LOCK_OPEN, 'mouse')).toBe(MODE_LOCK_OPEN);
  });
  it('idempotent: a landed lock never re-locks — the SAME state back, whatever fires next', () => {
    const locked = applyLockInput(MODE_LOCK_OPEN, 'touch-down');
    expect(applyLockInput(locked, 'key-down')).toBe(locked);
    expect(applyLockInput(locked, 'touch-down')).toBe(locked);
    expect(applyLockInput(locked, 'mouse')).toBe(locked);
  });
  it('a STORED mode boots locked — the lock never speaks for a saved choice', () => {
    const stored = modeLockFor('keyboard');
    expect(stored).toEqual({ locked: true, mode: 'keyboard' });
    expect(applyLockInput(stored, 'touch-down')).toBe(stored);
    expect(applyLockInput(stored, 'key-down')).toBe(stored);
    expect(modeLockFor('touch')).toEqual({ locked: true, mode: 'touch' });
  });
  it('a fresh save (no stored mode) boots open', () => {
    expect(modeLockFor(undefined)).toBe(MODE_LOCK_OPEN);
    expect(MODE_LOCK_OPEN).toEqual({ locked: false, mode: null });
  });
  it('modifier keydowns say nothing — isModifierCode gates the lock wiring', () => {
    for (const code of [
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'MetaLeft',
      'MetaRight',
      'CapsLock',
      'NumLock',
      'ScrollLock',
    ])
      expect(isModifierCode(code), code).toBe(true);
    for (const code of ['KeyW', 'KeyH', 'Space', 'Enter', 'ArrowUp', 'F12', 'Digit1'])
      expect(isModifierCode(code), code).toBe(false);
  });
});

/** Minimal Window stand-in: records the listeners attach() registers so tests
 *  can fire synthetic pointer events; innerWidth 1000 puts the 45/55 zone
 *  boundary at x = 450. */
class FakeWin {
  innerWidth = 1000;
  private readonly ls = new Map<string, (e: unknown) => void>();
  addEventListener(type: string, l: (e: unknown) => void): void {
    this.ls.set(type, l);
  }
  removeEventListener(type: string): void {
    this.ls.delete(type);
  }
  fire(type: string, e: unknown): void {
    this.ls.get(type)?.(e);
  }
}

/** attach() touches the global `document` for the pointerlock listener — node
 *  has none, so the tests install a minimal stub for the duration. */
function withDocStub<T>(fn: () => T): T {
  const g = globalThis as { document?: unknown };
  const prev = g.document;
  g.document = { addEventListener: () => {}, removeEventListener: () => {}, pointerLockElement: null };
  try {
    return fn();
  } finally {
    g.document = prev;
  }
}

/** A synthetic pointer event: only the fields the tracker reads. */
const ptr = (id: number, x: number, y: number, type = 'touch'): PointerEvent =>
  ({ pointerType: type, pointerId: id, clientX: x, clientY: y }) as unknown as PointerEvent;

/** attach a fresh collector over a fresh fake window. */
function collector(): { win: FakeWin; c: InputCollector } {
  const win = new FakeWin();
  const c = new InputCollector();
  c.attach(win as unknown as Window);
  return { win, c };
}

describe('InputCollector touch tracking (T12/T1)', () => {
  it('a left-zone touch becomes the stick: origin at the down point, vector normalized by the 56px radius', () => {
    withDocStub(() => {
      const { win, c } = collector();
      win.fire('pointerdown', ptr(1, 200, 400));
      let ts = c.touchSnapshot();
      expect(ts.stick.active).toBe(true);
      expect(ts.stick.dx).toBe(0); // the nub starts where the thumb landed
      expect(ts.stick.dy).toBe(0);
      expect(ts.lookDx).toBe(0);
      // one radius right AND one radius up = magnitude √2 — the tracker clamps
      // to the rim, direction held: (√2⁄2, −√2⁄2)
      win.fire('pointermove', ptr(1, 200 + 56, 400 - 56));
      ts = c.touchSnapshot();
      expect(ts.stick.dx).toBeCloseTo(Math.SQRT1_2);
      expect(ts.stick.dy).toBeCloseTo(-Math.SQRT1_2);
      // half a radius → analog 0.5 (deadzone is stickToMove's business, not the tracker's)
      win.fire('pointermove', ptr(1, 200 + 28, 400));
      ts = c.touchSnapshot();
      expect(ts.stick.dx).toBeCloseTo(0.5);
      expect(ts.stick.dy).toBeCloseTo(0);
    });
  });

  it('the stick vector clamps to magnitude 1 beyond the radius; lifting clears it', () => {
    withDocStub(() => {
      const { win, c } = collector();
      win.fire('pointerdown', ptr(1, 200, 400));
      win.fire('pointermove', ptr(1, 200 + 84, 400)); // 1.5 radii along +x
      let ts = c.touchSnapshot();
      expect(ts.stick.dx).toBe(1); // clamped
      expect(ts.stick.dy).toBe(0);
      win.fire('pointerup', ptr(1, 200 + 84, 400));
      ts = c.touchSnapshot();
      expect(ts.stick.active).toBe(false);
      expect(ts.stick.dx).toBe(0);
      expect(ts.stick.dy).toBe(0);
      win.fire('pointermove', ptr(1, 400, 400)); // pointer gone — the stick stays idle
      expect(c.touchSnapshot().stick.active).toBe(false);
    });
  });

  it('a right-zone touch is the look pointer: dx accumulates like mouseDx, snapshot drains it', () => {
    withDocStub(() => {
      const { win, c } = collector();
      win.fire('pointerdown', ptr(2, 800, 300)); // x = 800 ≥ 450 → look zone
      win.fire('pointermove', ptr(2, 812, 300));
      win.fire('pointermove', ptr(2, 819, 300));
      expect(c.touchSnapshot().lookDx).toBe(19);
      expect(c.touchSnapshot().lookDx).toBe(0); // drained, exactly like the mouse bank
      win.fire('pointerup', ptr(2, 819, 300));
      win.fire('pointermove', ptr(2, 900, 300)); // no active look pointer — nothing banks
      expect(c.touchSnapshot().lookDx).toBe(0);
    });
  });

  it('mouse pointer events never become stick or look — desktop behavior untouched', () => {
    withDocStub(() => {
      const { win, c } = collector();
      win.fire('pointerdown', ptr(1, 100, 100, 'mouse'));
      win.fire('pointermove', ptr(1, 300, 100, 'mouse'));
      const ts = c.touchSnapshot();
      expect(ts.stick.active).toBe(false);
      expect(ts.lookDx).toBe(0);
    });
  });

  it('the snapshot carries the stick origin — the DOM mirror anchors the base ring there (T12/T2)', () => {
    withDocStub(() => {
      const { win, c } = collector();
      win.fire('pointerdown', ptr(1, 200, 400));
      const ts = c.touchSnapshot();
      expect(ts.origin.x).toBe(200);
      expect(ts.origin.y).toBe(400);
      // the origin never follows the drag — it is the DOWN point
      win.fire('pointermove', ptr(1, 260, 410));
      expect(c.touchSnapshot().origin).toEqual({ x: 200, y: 400 });
    });
  });

  it('first touch owns its zone; a later same-zone touch is ignored; the zone boundary is look', () => {
    withDocStub(() => {
      const { win, c } = collector();
      win.fire('pointerdown', ptr(1, 100, 100)); // stick
      win.fire('pointerdown', ptr(3, 449, 100)); // also left of 450 — but the stick is taken
      win.fire('pointermove', ptr(3, 400, 100)); // id 3 moves — the stick must not follow
      expect(c.touchSnapshot().stick.dx).toBe(0);
      win.fire('pointerdown', ptr(4, 450, 100)); // exactly at 0.45·viewW → look, not stick
      win.fire('pointermove', ptr(4, 480, 100));
      expect(c.touchSnapshot().lookDx).toBe(30);
      expect(c.touchSnapshot().stick.active).toBe(true); // the stick pointer is still id 1
      // cancelling the stick clears it like a lift
      win.fire('pointercancel', ptr(1, 100, 100));
      expect(c.touchSnapshot().stick.active).toBe(false);
    });
  });
});
