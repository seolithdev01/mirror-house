// SPDX-License-Identifier: Apache-2.0
import { KEY_TURN_PER_STEP, MOUSE_TURN_PER_STEP, TURN_SENSITIVITY } from './constants';
import type { MoveInput } from '../game/player';
import { DEFAULT_KEYMAP, type KeyMap } from '../game/save';

export interface KeyboardSnapshot {
  keys: ReadonlySet<string>;
  mouseDx: number;
}

export type InputMode = 'keyboard' | 'mouse' | 'hybrid';

/**
 * A snapshot with one key's hold claim released — the ratified way a dual-use
 * key yields its movement share for a step (Aaina's own key while she is
 * open, the door's push key while the push hint shows): drop the key before
 * keysToMoveInput sees the snapshot, so exactly that key's contribution
 * disappears while the mouse and every other key keep working. Returns the
 * input unchanged (same reference) when the key is not held.
 */
export function withoutKey(snap: KeyboardSnapshot, code: string): KeyboardSnapshot {
  if (!snap.keys.has(code)) return snap;
  const keys = new Set(snap.keys);
  keys.delete(code);
  return { keys, mouseDx: snap.mouseDx };
}

/**
 * Codes → movement, resolved through the keymap (M5/T2). The MAPPED codes are
 * the primary bindings — remapping `forward` off KeyW kills W — while the
 * arrows and both shifts stay hardwired alternates under every remap (the
 * one-handed/no-remap floor the default experience has always had). The E
 * pair note: turnR's share follows `keymap.turnR` wherever it lives, and the
 * push claim (main.ts, doorHintActive) drops the PUSH key's code — the two
 * only coincide while turnR and push share one code (the default KeyE).
 */
export function keysToMoveInput(
  snap: KeyboardSnapshot,
  mode: InputMode = 'hybrid',
  keymap: KeyMap = DEFAULT_KEYMAP,
): MoveInput {
  const has = (...codes: string[]) => codes.some((c) => snap.keys.has(c));
  const fwd = keymap.forward ?? 'KeyW';
  const back = keymap.back ?? 'KeyS';
  const left = keymap.left ?? 'KeyA';
  const right = keymap.right ?? 'KeyD';
  const turnL = keymap.turnL ?? 'KeyQ';
  const turnR = keymap.turnR ?? 'KeyE';
  const sprint = keymap.sprint ?? 'ShiftLeft';
  const forward = (has(fwd, 'ArrowUp') ? 1 : 0) - (has(back, 'ArrowDown') ? 1 : 0);
  const keyTurn = (has(turnR) ? 1 : 0) - (has(turnL) ? 1 : 0);
  const isSprint = has(sprint, 'ShiftRight');
  const mouseTurn = snap.mouseDx * TURN_SENSITIVITY;
  if (mode === 'keyboard') {
    const arrowTurn = (has('ArrowRight') ? 1 : 0) - (has('ArrowLeft') ? 1 : 0);
    return {
      forward,
      strafe: 0,
      sprint: isSprint,
      turn: mouseTurn + (keyTurn + arrowTurn) * KEY_TURN_PER_STEP,
    };
  }
  const strafe = (has(right, 'ArrowRight') ? 1 : 0) - (has(left, 'ArrowLeft') ? 1 : 0);
  return { forward, strafe, sprint: isSprint, turn: mouseTurn + keyTurn * KEY_TURN_PER_STEP };
}

/**
 * Reverse lookup (M5/T2): the action a keydown `code` names under `map`.
 * DUPLICATE codes resolve to the LAST-declared action — with the default map
 * that makes KeyE name `push`, not `turnR` — and main is the one that
 * contextualizes: its keydown dispatch consults the door's push hint first
 * (a live hint means the shared key pushes; otherwise the press is nothing,
 * since turning is held-key movement resolved in keysToMoveInput). Keeping
 * actionFor pure and last-defined-wins means no context leaks into the input
 * layer. Unknown codes return null.
 */
export function actionFor(code: string, map: KeyMap): string | null {
  let found: string | null = null;
  for (const [action, bound] of Object.entries(map)) if (bound === code) found = action;
  return found;
}

/** The outcome of a rebind attempt: on conflict the ORIGINAL map comes back
 *  (same reference) plus the offending action's name for the inline warning;
 *  on success a fresh map with `action` moved to `code`. */
export interface RebindResult {
  map: KeyMap;
  conflict: string | null;
}

/**
 * Move one action onto a new code (M5/T2), refusing every rebind that would
 * CREATE a duplicate: if any OTHER action already owns `code`, the rebind
 * refuses and names it. Rebinding an action to its own current code is the
 * sanctioned self no-op (same map back, no conflict). Even rebuilding the
 * default E pair by hand (push back onto turnR's key after a split) refuses
 * — Reset-to-defaults in the Controls section is the one way back to the
 * sanctioned dual. The input map is never mutated; success returns a copy.
 */
export function rebind(map: KeyMap, action: string, code: string): RebindResult {
  if (map[action] === code) return { map, conflict: null }; // self — nothing to do
  for (const [other, bound] of Object.entries(map))
    if (other !== action && bound === code) return { map, conflict: other };
  return { map: { ...map, [action]: code }, conflict: null };
}

export interface MouseState {
  leftDown: boolean;
  rightDown: boolean;
  cursorNorm: number;
}

export function mouseOnlyInput(m: MouseState): MoveInput {
  const mag = Math.abs(m.cursorNorm);
  const steer = mag < 0.15 ? 0 : Math.sign(m.cursorNorm) * Math.min(1, (mag - 0.15) / 0.5);
  return {
    forward: m.leftDown ? 1 : 0,
    strafe: 0,
    sprint: m.rightDown,
    turn: steer * MOUSE_TURN_PER_STEP,
  };
}

export class InputCollector {
  private keys = new Set<string>();
  private mouseDx = 0;
  private leftDown = false;
  private rightDown = false;
  private cursorX = 0;
  private win: Window | null = null;

  attach(win: Window): () => void {
    const down = (e: KeyboardEvent) => this.keys.add(e.code);
    const up = (e: KeyboardEvent) => this.keys.delete(e.code);
    const move = (e: MouseEvent) => {
      this.cursorX = e.clientX;
      if (document.pointerLockElement) this.mouseDx += e.movementX;
    };
    const mouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.leftDown = true;
      if (e.button === 2) this.rightDown = true;
    };
    const mouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.leftDown = false;
      if (e.button === 2) this.rightDown = false;
    };
    const contextMenu = (e: Event) => e.preventDefault();
    const clearKeys = () => this.keys.clear();
    const onPointerLockChange = () => {
      if (!document.pointerLockElement) this.keys.clear();
    };
    this.win = win;
    win.addEventListener('keydown', down);
    win.addEventListener('keyup', up);
    win.addEventListener('mousemove', move);
    win.addEventListener('mousedown', mouseDown);
    win.addEventListener('mouseup', mouseUp);
    win.addEventListener('contextmenu', contextMenu);
    win.addEventListener('blur', clearKeys);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => {
      win.removeEventListener('keydown', down);
      win.removeEventListener('keyup', up);
      win.removeEventListener('mousemove', move);
      win.removeEventListener('mousedown', mouseDown);
      win.removeEventListener('mouseup', mouseUp);
      win.removeEventListener('contextmenu', contextMenu);
      win.removeEventListener('blur', clearKeys);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }

  snapshotAndReset(): KeyboardSnapshot {
    const snap: KeyboardSnapshot = { keys: new Set(this.keys), mouseDx: this.mouseDx };
    this.mouseDx = 0;
    return snap;
  }

  mouseState(): MouseState {
    return { leftDown: this.leftDown, rightDown: this.rightDown, cursorNorm: this.cursorNorm() };
  }

  private cursorNorm(): number {
    const w = this.win?.innerWidth ?? 0;
    return w > 0 ? (this.cursorX / w) * 2 - 1 : 0;
  }
}
