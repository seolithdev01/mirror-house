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
  /** M3/T6 — toggles the audio mute (same as the [M] key). */
  onMute(): void;
  /** M4/T2 — tier complete → a fresh random-base campaign (Play again). */
  onPlayAgain(): void;
  /** M4/T2 — tier complete → free walk in the cleared Dwaar (Stay). */
  onStay(): void;
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
  /** M3/T3 — the view chip: which ViewMode the renderer is showing ([V] cycles). */
  setView(label: string): void;
  /** M3/T6 — the 🔊/🔇 button label follows the audio engine's mute state. */
  setMuted(muted: boolean): void;
  /** M4/T2 — the floor chip (`L02`, `L10 · DWAAR I ✦` on the threshold floor). */
  setFloor(label: string): void;
  showCleared(ms: number, bestMs: number | null, isBest: boolean): void;
  hideCleared(): void;
  /** M4/T2 — the 0.8s `descending…` banner between floors; hide on rebuild. */
  showDescend(): void;
  hideDescend(): void;
  /** M4/T2 — the Truth-Shard tier-complete screen (Play again / Stay). */
  showTierComplete(stats: { floors: number; shards: number }): void;
  hideTier(): void;
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
  const mute = document.createElement('button');
  mute.type = 'button';
  mute.id = 'mh-mute';
  mute.textContent = '🔊 Sound';
  mute.addEventListener('click', () => init.onMute());
  const chips = document.createElement('div');
  chips.id = 'mh-chips';
  chips.append(
    chip('👁 Focus', 'view'),
    chip('L01', 'floor'),
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
  const descend = document.createElement('div');
  descend.id = 'mh-descend';
  descend.hidden = true;
  const fail = document.createElement('div');
  fail.id = 'mh-fail';
  fail.hidden = true;
  const hint = document.createElement('div');
  hint.id = 'mh-hint';
  hint.hidden = true;
  root.append(
    modes,
    faq,
    aaina,
    daily,
    frost,
    mute,
    chips,
    breath,
    anger,
    cleared,
    descend,
    fail,
    hint,
  );
  document.body.appendChild(root);

  // M4/T2 tier-complete screen — a modal like the FAQ's, appended to the body
  // (not the pointer-events:none #hud root) so its buttons own the clicks.
  const tier = document.createElement('div');
  tier.id = 'mh-tier-overlay';
  tier.hidden = true;
  const tierBox = document.createElement('div');
  tierBox.id = 'mh-tier-box';
  const tierTitle = document.createElement('h2');
  tierTitle.textContent = '✦ Truth-Shard I claimed — Tier I complete';
  const tierStats = document.createElement('p');
  const tierButtons = document.createElement('div');
  tierButtons.id = 'mh-tier-buttons';
  const playAgain = document.createElement('button');
  playAgain.type = 'button';
  playAgain.id = 'mh-tier-again';
  playAgain.textContent = '↻ Play again';
  playAgain.addEventListener('click', () => init.onPlayAgain());
  const stay = document.createElement('button');
  stay.type = 'button';
  stay.id = 'mh-tier-stay';
  stay.textContent = 'Stay — wander the hall';
  stay.addEventListener('click', () => init.onStay());
  const tierNote = document.createElement('p');
  tierNote.id = 'mh-tier-note';
  tierNote.textContent = 'The shard is already banked — staying is a free walk.';
  tierButtons.append(playAgain, stay);
  tierBox.append(tierTitle, tierStats, tierButtons, tierNote);
  tier.appendChild(tierBox);
  document.body.appendChild(tier);

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
    setView: (label) => {
      (document.getElementById('mh-view') as HTMLElement).textContent = `👁 ${label}`;
    },
    setMuted: (m) => {
      mute.textContent = m ? '🔇 Muted' : '🔊 Sound';
    },
    setFloor: (label) => {
      (document.getElementById('mh-floor') as HTMLElement).textContent = label;
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
    showDescend: () => {
      descend.textContent = 'descending…';
      descend.hidden = false;
    },
    hideDescend: () => {
      descend.hidden = true;
    },
    showTierComplete: (stats) => {
      tierStats.textContent = `${stats.floors} floors cleared · ${stats.shards} shards banked`;
      tier.hidden = false;
    },
    hideTier: () => {
      tier.hidden = true;
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
