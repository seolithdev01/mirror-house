// SPDX-License-Identifier: Apache-2.0
//
// The ⚙ settings overlay (M5/T1) — the FAQ overlay's modal shape in the
// house's palette. This task owns two sections: Display (text scale radio
// 1/1.25/1.5 — main applies it as the `--mh-text-scale` CSS var on body) and
// Access (reduced-flash + captions toggles — reduced-flash steadies every
// pulsing light today; captions persists now, the caption bar itself arrives
// in T3). Performance (T4) and Controls (T2) are deferred WHOLE — no stub
// sections, no coming-soon headers. Every control applies instantly; main
// persists (debounced) and flushes on close via onClosed.

import { t, type Lang } from './i18n';

export type TextScale = 1 | 1.25 | 1.5;

/** The ladder the radio offers — 100 / 125 / 150 percent. */
export const TEXT_SCALES: readonly TextScale[] = [1, 1.25, 1.5];

/** The live a11y values the overlay reflects (boot paint, external writes). */
export interface SettingsValues {
  textScale: TextScale;
  reducedFlash: boolean;
  captions: boolean;
}

export interface SettingsInit {
  onTextScale(scale: TextScale): void;
  onReducedFlash(on: boolean): void;
  onCaptions(on: boolean): void;
  /** Fired on every closing path (✕, backdrop, toggle-to-close) — main
   *  flushes the debounced save write here, so a closed tab eats nothing. */
  onClosed(): void;
}

export interface SettingsOverlay {
  root: HTMLElement;
  /** open ↔ closed, the ⚙ button's click. */
  toggle(): void;
  setValues(v: SettingsValues): void;
  setLang(lang: Lang): void;
}

/** Radio id per ladder step (`…-100`, `…-125`, `…-150` — selector-safe). */
const scaleId = (s: TextScale): string => `mh-settings-scale-${Math.round(s * 100)}`;

export function buildSettingsOverlay(init: SettingsInit): SettingsOverlay {
  let lang: Lang = 'en';
  const root = document.createElement('div');
  root.id = 'mh-settings-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-settings-box';

  const h = document.createElement('h2');
  box.appendChild(h);

  // ---- Display: text scale radio ---------------------------------------------
  const display = document.createElement('h3');
  const scaleField = document.createElement('fieldset');
  const scaleLegend = document.createElement('legend');
  scaleField.appendChild(scaleLegend);
  const radios: Record<number, HTMLInputElement> = {};
  for (const s of TEXT_SCALES) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'mh-text-scale';
    input.id = scaleId(s);
    input.value = String(s);
    input.addEventListener('change', () => {
      if (input.checked) init.onTextScale(s);
    });
    radios[s] = input;
    label.append(input, document.createTextNode(` ${Math.round(s * 100)}%`));
    scaleField.appendChild(label);
  }

  // ---- Access: reduced-flash + captions toggles -------------------------------
  const access = document.createElement('h3');

  const reducedLabel = document.createElement('label');
  const reduced = document.createElement('input');
  reduced.type = 'checkbox';
  reduced.id = 'mh-settings-reduced-flash';
  reduced.addEventListener('change', () => init.onReducedFlash(reduced.checked));
  reducedLabel.append(reduced, document.createTextNode(' '));
  const reducedText = document.createElement('span');
  reducedLabel.appendChild(reducedText);
  const reducedNote = document.createElement('p');
  reducedNote.className = 'mh-settings-note';

  const captionsLabel = document.createElement('label');
  const captions = document.createElement('input');
  captions.type = 'checkbox';
  captions.id = 'mh-settings-captions';
  captions.addEventListener('change', () => init.onCaptions(captions.checked));
  captionsLabel.append(captions, document.createTextNode(' '));
  const captionsText = document.createElement('span');
  captionsLabel.appendChild(captionsText);
  const captionsNote = document.createElement('p');
  captionsNote.className = 'mh-settings-note';

  const close = document.createElement('button');
  close.type = 'button';
  close.id = 'mh-settings-close';
  function closeNow(): void {
    if (!root.hidden) {
      root.hidden = true;
      init.onClosed();
    }
  }
  close.addEventListener('click', closeNow);
  root.addEventListener('click', (e) => {
    if (e.target === root) closeNow(); // the backdrop click closes
  });

  box.append(
    display,
    scaleField,
    access,
    reducedLabel,
    reducedNote,
    captionsLabel,
    captionsNote,
    close,
  );
  root.appendChild(box);
  document.body.appendChild(root);

  function relabel(): void {
    h.textContent = t(lang, 'settings.title');
    display.textContent = t(lang, 'settings.display');
    scaleLegend.textContent = t(lang, 'settings.textScale');
    access.textContent = t(lang, 'settings.access');
    reducedText.textContent = t(lang, 'settings.reducedFlash');
    reducedNote.textContent = t(lang, 'settings.reducedFlashNote');
    captionsText.textContent = t(lang, 'settings.captions');
    captionsNote.textContent = t(lang, 'settings.captionsNote');
    close.textContent = t(lang, 'settings.close');
  }
  relabel();

  return {
    root,
    toggle: () => {
      if (root.hidden) root.hidden = false;
      else closeNow();
    },
    setValues: (v) => {
      for (const s of TEXT_SCALES) radios[s]!.checked = s === v.textScale;
      reduced.checked = v.reducedFlash;
      captions.checked = v.captions;
    },
    setLang: (next) => {
      if (next === lang) return;
      lang = next;
      relabel();
    },
  };
}
