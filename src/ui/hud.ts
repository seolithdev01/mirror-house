// SPDX-License-Identifier: Apache-2.0
import { FOG_COST } from '../engine/constants';
import type { InputMode } from '../engine/input';

export type HudInit = {
  mode: InputMode;
  onMode(m: InputMode): void;
  onFaq(): void;
  /** M3/T2 — opens/closes Aaina's dialogue panel ([Q] does the same). */
  onAaina(): void;
  onDaily(): void;
  onFrost(): void;
};
export interface Hud {
  setMode(mode: InputMode): void;
  setChips(chips: {
    streak?: number;
    bestMs?: number | null;
    timerMs?: number | null;
    beacons?: { captured: number; total: number };
    shards?: number;
  }): void;
  setBreath(v: number): void;
  setAnger(v: number): void;
  showCleared(ms: number, bestMs: number | null, isBest: boolean): void;
  hideCleared(): void;
  showFail(reason: string): void;
  hideFail(): void;
  /** One line of in-world guidance; null hides it (T7 passages will drive it). */
  hint(text: string | null): void;
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
  const aaina = document.createElement('button');
  aaina.type = 'button';
  aaina.id = 'mh-aaina';
  aaina.textContent = '💬 Aaina';
  aaina.addEventListener('click', () => init.onAaina());
  const daily = document.createElement('button');
  daily.type = 'button';
  daily.id = 'mh-daily';
  daily.textContent = '★ Daily';
  daily.addEventListener('click', () => init.onDaily());
  const frost = document.createElement('button');
  frost.type = 'button';
  frost.id = 'mh-frost';
  frost.textContent = '❄ Frost';
  frost.addEventListener('click', () => init.onFrost());
  const chips = document.createElement('div');
  chips.id = 'mh-chips';
  chips.append(
    chip('🔥 0', 'streak'),
    chip('⏱ —', 'best'),
    chip('⏳ 0.0s', 'timer'),
    chip('🪞 0/0', 'beacons'),
    chip('💠 0', 'shards'),
  );
  const breath = document.createElement('div');
  breath.id = 'mh-breath';
  const breathFill = document.createElement('div');
  breathFill.id = 'mh-breath-fill';
  breath.appendChild(breathFill);
  const anger = document.createElement('div');
  anger.id = 'mh-anger';
  const angerFill = document.createElement('div');
  angerFill.id = 'mh-anger-fill';
  anger.appendChild(angerFill);
  const cleared = document.createElement('div');
  cleared.id = 'mh-cleared';
  cleared.hidden = true;
  const fail = document.createElement('div');
  fail.id = 'mh-fail';
  fail.hidden = true;
  const hint = document.createElement('div');
  hint.id = 'mh-hint';
  hint.hidden = true;
  root.append(modes, faq, aaina, daily, frost, chips, breath, anger, cleared, fail, hint);
  document.body.appendChild(root);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  let hintText: string | null = null; // last shown hint (hint() early-returns on repeats)
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
      if (c.beacons !== undefined)
        (document.getElementById('mh-beacons') as HTMLElement).textContent =
          `🪞 ${c.beacons.captured}/${c.beacons.total}`;
      if (c.shards !== undefined)
        (document.getElementById('mh-shards') as HTMLElement).textContent = `💠 ${c.shards}`;
    },
    setBreath: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      breathFill.style.width = `${(clamped * 100).toFixed(1)}%`;
      frost.disabled = clamped < FOG_COST; // no click-spam when there is not enough breath
    },
    setAnger: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      angerFill.style.width = `${(clamped * 100).toFixed(1)}%`;
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
    showFail: (reason) => {
      fail.hidden = false;
      fail.textContent = reason;
    },
    hideFail: () => {
      fail.hidden = true;
    },
    hint: (text) => {
      if (text === hintText) return; // per-frame calls stay off the DOM when idle
      hintText = text;
      hint.hidden = text === null;
      hint.textContent = text;
    },
    root,
  };
}
