// SPDX-License-Identifier: Apache-2.0
import { TURN_SENSITIVITY } from './constants';
import type { MoveInput } from '../game/player';

export interface KeyboardSnapshot { keys: ReadonlySet<string>; mouseDx: number }

export function keysToMoveInput(snap: KeyboardSnapshot): MoveInput {
  const has = (...codes: string[]) => codes.some((c) => snap.keys.has(c));
  return {
    forward: (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0),
    strafe: (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0),
    sprint: has('ShiftLeft', 'ShiftRight'),
    turn: snap.mouseDx * TURN_SENSITIVITY,
  };
}

export class InputCollector {
  private keys = new Set<string>();
  private mouseDx = 0;

  attach(win: Window): () => void {
    const down = (e: KeyboardEvent) => this.keys.add(e.code);
    const up = (e: KeyboardEvent) => this.keys.delete(e.code);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement) this.mouseDx += e.movementX;
    };
    win.addEventListener('keydown', down);
    win.addEventListener('keyup', up);
    win.addEventListener('mousemove', move);
    return () => {
      win.removeEventListener('keydown', down);
      win.removeEventListener('keyup', up);
      win.removeEventListener('mousemove', move);
    };
  }

  snapshotAndReset(): KeyboardSnapshot {
    const snap: KeyboardSnapshot = { keys: new Set(this.keys), mouseDx: this.mouseDx };
    this.mouseDx = 0;
    return snap;
  }
}
