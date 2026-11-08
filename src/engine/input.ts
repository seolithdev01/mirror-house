// SPDX-License-Identifier: Apache-2.0
import { KEY_TURN_PER_STEP, MOUSE_TURN_PER_STEP, TURN_SENSITIVITY } from './constants';
import type { MoveInput } from '../game/player';

export interface KeyboardSnapshot { keys: ReadonlySet<string>; mouseDx: number }

export type InputMode = 'keyboard' | 'mouse' | 'hybrid';

export function keysToMoveInput(snap: KeyboardSnapshot, mode: InputMode = 'hybrid'): MoveInput {
  const has = (...codes: string[]) => codes.some((c) => snap.keys.has(c));
  const forward = (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0);
  const keyTurn = (has('KeyE') ? 1 : 0) - (has('KeyQ') ? 1 : 0);
  const sprint = has('ShiftLeft', 'ShiftRight');
  const mouseTurn = snap.mouseDx * TURN_SENSITIVITY;
  if (mode === 'keyboard') {
    const arrowTurn = (has('ArrowRight') ? 1 : 0) - (has('ArrowLeft') ? 1 : 0);
    return { forward, strafe: 0, sprint, turn: mouseTurn + (keyTurn + arrowTurn) * KEY_TURN_PER_STEP };
  }
  const strafe = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0);
  return { forward, strafe, sprint, turn: mouseTurn + keyTurn * KEY_TURN_PER_STEP };
}

export interface MouseState { leftDown: boolean; rightDown: boolean; cursorNorm: number }

export function mouseOnlyInput(m: MouseState): MoveInput {
  const mag = Math.abs(m.cursorNorm);
  const steer = mag < 0.15 ? 0 : Math.sign(m.cursorNorm) * Math.min(1, (mag - 0.15) / 0.5);
  return { forward: m.leftDown ? 1 : 0, strafe: 0, sprint: m.rightDown, turn: steer * MOUSE_TURN_PER_STEP };
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
