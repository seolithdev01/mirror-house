// SPDX-License-Identifier: Apache-2.0
import type { InputMode } from '../engine/input';

export type HudInit = {
  mode: InputMode;
  onMode(m: InputMode): void;
  onFaq(): void;
  onDaily(): void;
};
export interface Hud {
  setMode(mode: InputMode): void;
  setChips(chips: { streak?: number; bestMs?: number | null; timerMs?: number | null }): void;
  showCleared(ms: number, bestMs: number | null, isBest: boolean): void;
  hideCleared(): void;
  root: HTMLElement;
}

function chip(label: string, id: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'mh-chip';
  el.id = `mh-${id}`;
  el.textContent = label;
  return el;
}

export function createHud(init: HudInit): Hud {
  const root = document.createElement('div');
  root.id = 'hud';
  const modes = document.createElement('div');
  modes.id = 'mh-modes';
  const buttons: Record<string, HTMLButtonElement> = {};
  for (const m of ['keyboard', 'mouse', 'hybrid'] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.mode = m;
    b.textContent = m === 'keyboard' ? '⌨ Keys' : m === 'mouse' ? '🖱 Mouse' : '⌨+🖱 Both';
    b.addEventListener('click', () => init.onMode(m));
    buttons[m] = b;
    modes.appendChild(b);
  }
  const faq = document.createElement('button');
  faq.type = 'button';
  faq.id = 'mh-faq';
  faq.textContent = '? FAQ';
  faq.addEventListener('click', () => init.onFaq());
  const daily = document.createElement('button');
  daily.type = 'button';
  daily.id = 'mh-daily';
  daily.textContent = '★ Daily';
  daily.addEventListener('click', () => init.onDaily());
  const chips = document.createElement('div');
  chips.id = 'mh-chips';
  chips.append(chip('🔥 0', 'streak'), chip('⏱ —', 'best'), chip('⏳ 0.0s', 'timer'));
  const cleared = document.createElement('div');
  cleared.id = 'mh-cleared';
  cleared.hidden = true;
  root.append(modes, faq, daily, chips, cleared);
  document.body.appendChild(root);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const setMode = (mode: InputMode) => {
    for (const m of Object.keys(buttons)) buttons[m]!.classList.toggle('active', m === mode);
  };
  setMode(init.mode);
  return {
    setMode,
    setChips: (c) => {
      if (c.streak !== undefined)
        (document.getElementById('mh-streak') as HTMLElement).textContent = `🔥 ${c.streak}`;
      if (c.bestMs !== undefined)
        (document.getElementById('mh-best') as HTMLElement).textContent = `⏱ ${
          c.bestMs == null ? '—' : fmt(c.bestMs)
        }`;
      if (c.timerMs !== undefined)
        (document.getElementById('mh-timer') as HTMLElement).textContent = `⏳ ${
          c.timerMs == null ? '—' : fmt(c.timerMs)
        }`;
    },
    showCleared: (ms, bestMs, isBest) => {
      cleared.hidden = false;
      cleared.textContent = isBest
        ? `✨ Floor cleared in ${fmt(ms)} — new best!`
        : `Floor cleared in ${fmt(ms)} (best ${bestMs == null ? '—' : fmt(bestMs)})`;
    },
    hideCleared: () => {
      cleared.hidden = true;
    },
    root,
  };
}
