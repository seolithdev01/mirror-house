// SPDX-License-Identifier: Apache-2.0
import {
  KEY_TURN_PER_STEP,
  MOUSE_TURN_PER_STEP,
  TOUCH_STICK_RADIUS_PX,
  TURN_SENSITIVITY,
} from './constants';
import type { MoveInput } from '../game/player';
import { CODE_RE, DEFAULT_KEYMAP, type KeyMap } from '../game/save';
import { classifyZone } from '../game/touch';
import type { TouchStick } from '../game/touch';

export interface KeyboardSnapshot {
  keys: ReadonlySet<string>;
  mouseDx: number;
}

/** T12 — the union widens `'touch'` in the SAME commit validateSave's mode
 *  list accepts it (the enum-widening lesson: the validator touches the union
 *  in the commit that moves it, or stored saves wipe on reload). */
export type InputMode = 'keyboard' | 'mouse' | 'hybrid' | 'touch';

/**
 * The boot-time mode auto-select (T12/T1), pure: a stored mode always wins —
 * existing saves keep their choice, never wiped by a device hint. With no
 * stored mode (a brand-new save), a coarse-pointer device (touch screen)
 * starts on `'touch'`; everything else falls back to the long-time default
 * `'hybrid'`. main.ts calls this once at boot with
 * `matchMedia('(pointer: coarse)').matches` and the save's stored mode.
 */
export function defaultMode(hasCoarsePointer: boolean, stored?: InputMode): InputMode {
  if (stored !== undefined) return stored;
  return hasCoarsePointer ? 'touch' : 'hybrid';
}

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

/** The hardwired alternate families the rebind capture must refuse (M5/T5):
 *  `Arrow*` and `Shift*`. Arrows move/turn and the shifts sprint under every
 *  remap (see keysToMoveInput), so an action bound there would fire its verb
 *  AND its hardwired one on the same press. Prefix-based, not enumerated
 *  pairs, so no future arrow/shift code slips the gate. */
const HARDWIRED_RE = /^(Arrow|Shift)/;

/**
 * The capture-side gate (M5/T5): may a pressed `e.code` become a binding?
 * False for the hardwired alternates above and for anything failing the
 * save's CODE_RE shape check — the same regex validateKeyMap polices — so
 * junk is refused at the capture, before it can ever enter the save. Pure:
 * the settings overlay calls this on the keydown; the save's own gate stays
 * the backstop for imported files.
 */
export function capturableCode(code: string): boolean {
  return CODE_RE.test(code) && !HARDWIRED_RE.test(code);
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

/** One frame's touch state (T12/T1): the stick's live vector (raw — the
 *  deadzone is stickToMove's policy) and the look bank, drained by the read
 *  exactly like mouseDx. T12/T2 adds `origin` — the stick pointer's DOWN
 *  point in client px: the DOM mirror anchors the base ring there (the nub
 *  rides origin + clamped vector). It holds the last origin while the stick
 *  is up (meaningless until the next `stick.active` frame). */
export interface TouchSnapshot {
  stick: TouchStick;
  lookDx: number;
  origin: { x: number; y: number };
}

export class InputCollector {
  private keys = new Set<string>();
  private mouseDx = 0;
  private leftDown = false;
  private rightDown = false;
  private cursorX = 0;
  private win: Window | null = null;
  // T12 — the two-zone touch tracker. `pointerType === 'touch'` only: a
  // desktop mouse's pointer events never enter this state, so keyboard/mouse/
  // hybrid behavior stays byte-identical. First touch down in the LEFT 45%
  // owns the stick until it lifts (origin = the down point); first touch in
  // the RIGHT 55% is the look pointer (dx accumulation like the mouse bank).
  // No setPointerCapture — manual id tracking, exactly as the plan ratified.
  private stickActive = false;
  private stickId: number | null = null;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private stickDx = 0;
  private stickDy = 0;
  private lookId: number | null = null;
  private lookLastX = 0;
  private lookDx = 0;

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
    const pointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      // T12 final-review — HUD taps never claim a zone: a touch whose target
      // is an interactive element (dock buttons, chips, settings) is chrome's
      // press, not the play surface's — the canvas and body still claim
      // normally. (The `typeof` guard keeps the node-env unit tests — no DOM
      // `Element` global, no `target` on synthetic events — on the same path.)
      if (
        typeof Element !== 'undefined' &&
        e.target instanceof Element &&
        e.target.closest('button, a, input, select, textarea, label, [role="button"]')
      )
        return;
      const viewW = this.win?.innerWidth ?? 0;
      if (classifyZone(e.clientX, viewW) === 'stick') {
        if (this.stickActive) return; // first touch owns the zone until it lifts
        this.stickActive = true;
        this.stickId = e.pointerId;
        this.stickOriginX = e.clientX;
        this.stickOriginY = e.clientY;
        this.stickDx = 0;
        this.stickDy = 0;
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.lookLastX = e.clientX;
      }
    };
    const pointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (this.stickActive && e.pointerId === this.stickId) {
        const dx = (e.clientX - this.stickOriginX) / TOUCH_STICK_RADIUS_PX;
        const dy = (e.clientY - this.stickOriginY) / TOUCH_STICK_RADIUS_PX;
        const mag = Math.hypot(dx, dy);
        const scale = mag > 1 ? 1 / mag : 1; // direction holds, magnitude clamps to 1
        this.stickDx = dx * scale;
        this.stickDy = dy * scale;
      } else if (e.pointerId === this.lookId) {
        this.lookDx += e.clientX - this.lookLastX;
        this.lookLastX = e.clientX;
      }
    };
    const pointerEnd = (e: PointerEvent) => {
      if (this.stickActive && e.pointerId === this.stickId) {
        this.stickActive = false;
        this.stickId = null;
        this.stickDx = 0;
        this.stickDy = 0;
      } else if (e.pointerId === this.lookId) {
        this.lookId = null;
      }
    };
    this.win = win;
    win.addEventListener('keydown', down);
    win.addEventListener('keyup', up);
    win.addEventListener('mousemove', move);
    win.addEventListener('mousedown', mouseDown);
    win.addEventListener('mouseup', mouseUp);
    win.addEventListener('contextmenu', contextMenu);
    win.addEventListener('blur', clearKeys);
    win.addEventListener('pointerdown', pointerDown);
    win.addEventListener('pointermove', pointerMove);
    win.addEventListener('pointerup', pointerEnd);
    win.addEventListener('pointercancel', pointerEnd);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => {
      win.removeEventListener('keydown', down);
      win.removeEventListener('keyup', up);
      win.removeEventListener('mousemove', move);
      win.removeEventListener('mousedown', mouseDown);
      win.removeEventListener('mouseup', mouseUp);
      win.removeEventListener('contextmenu', contextMenu);
      win.removeEventListener('blur', clearKeys);
      win.removeEventListener('pointerdown', pointerDown);
      win.removeEventListener('pointermove', pointerMove);
      win.removeEventListener('pointerup', pointerEnd);
      win.removeEventListener('pointercancel', pointerEnd);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }

  snapshotAndReset(): KeyboardSnapshot {
    const snap: KeyboardSnapshot = { keys: new Set(this.keys), mouseDx: this.mouseDx };
    this.mouseDx = 0;
    return snap;
  }

  /** The touch frame (T12/T1): the stick's live raw vector (it does NOT drain
   *  — a held thumb keeps steering) and the look bank, which DOES drain on the
   *  read, one pixel-accumulation per snapshot, exactly like mouseDx. */
  touchSnapshot(): TouchSnapshot {
    const stick: TouchStick = { active: this.stickActive, dx: this.stickDx, dy: this.stickDy };
    const lookDx = this.lookDx;
    this.lookDx = 0;
    return { stick, lookDx, origin: { x: this.stickOriginX, y: this.stickOriginY } };
  }

  mouseState(): MouseState {
    return { leftDown: this.leftDown, rightDown: this.rightDown, cursorNorm: this.cursorNorm() };
  }

  private cursorNorm(): number {
    const w = this.win?.innerWidth ?? 0;
    return w > 0 ? (this.cursorX / w) * 2 - 1 : 0;
  }
}
