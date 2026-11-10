// SPDX-License-Identifier: Apache-2.0
//
// The ⚙ settings overlay (M5/T1) — the FAQ overlay's modal shape in the
// house's palette. Display (text scale radio 1/1.25/1.5 — main applies it as
// the `--mh-text-scale` CSS var on body) and Access (reduced-flash + captions
// toggles — reduced-flash steadies every pulsing light; captions feeds the
// T3 caption bar). M5/T2 adds Controls: the 15 rebindable actions as
// label+key rows — click a row, the next keydown is captured (Escape
// cancels), main rebinds through the conflict guard and pushes the new
// values back; a refused rebind names the conflicting action inline. M5/T4
// adds Performance: the auto/low/mid/high quality radio — sharpness applies
// at once, mirror detail on the next floor (the note says so). Every control
// applies instantly; main persists (debounced) and flushes on close via
// onClosed.

import { DEFAULT_KEYMAP, type KeyMap } from '../game/save';
import { capturableCode } from '../engine/input';
import { PERF_CHOICES, type PerfChoice } from '../game/quality';
import { trapDialog } from './dialog';
import { fill, t, type Lang } from './i18n';

export type TextScale = 1 | 1.25 | 1.5;

/** The ladder the radio offers — 100 / 125 / 150 percent. */
export const TEXT_SCALES: readonly TextScale[] = [1, 1.25, 1.5];

/** The live a11y values the overlay reflects (boot paint, external writes). */
export interface SettingsValues {
  textScale: TextScale;
  reducedFlash: boolean;
  captions: boolean;
  /** M5/T2 — the live key binding table the Controls rows render. */
  keyMap: KeyMap;
  /** M5/T4 — the quality choice the Performance radio reflects ('auto' or a
   *  pinned preset; the effective preset itself is main's business). */
  perf: PerfChoice;
}

export interface SettingsInit {
  onTextScale(scale: TextScale): void;
  onReducedFlash(on: boolean): void;
  onCaptions(on: boolean): void;
  /** M5/T4 — the player pinned a quality rung (or returned to auto); main
   *  applies the preset live (pixel ratio instant) and persists the choice. */
  onPerf(choice: PerfChoice): void;
  /** M5/T2 — attempt a rebind through the conflict guard; the OFFENDING
   *  action's name comes back on refusal (the inline warning names it), or
   *  null on success (main has already applied + persisted + pushed values). */
  onRebind(action: string, code: string): string | null;
  /** M5/T2 — reset every binding to DEFAULT_KEYMAP (the one sanctioned way
   *  back to the default E pair once it has been split). */
  onResetKeys(): void;
  /** M6/T1 — the Floors section's single button: play the DEMO venue pack's
   *  side-floor, or — while one is live — return to the campaign. Main owns
   *  which (it holds the venue state); the button's label follows setVenue. */
  onVenueFloor(): void;
  /** step007/T1 — the About entry: opens the About panel ON TOP of ⚙ (the
   *  dialog stack peels it first; ⚙ stays open underneath). */
  onAbout(): void;
  /** step007/T2 — the Feedback entry: opens the 📮 composer ON TOP of ⚙ (the
   *  same stack contract as the About entry). */
  onFeedback(): void;
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
  /** M6/T1 — the Floors section reflects the venue state: the button says
   *  Play (no venue floor) or Return to campaign (one is live). */
  setVenue(on: boolean): void;
  /** M5/T2 — the action whose key the overlay is capturing right now, or
   *  null. Main's keydown dispatch stands down while a capture is live, so
   *  the pressed key belongs to the rebind, never to the game. */
  capturingAction(): string | null;
}

/** Radio id per ladder step (`…-100`, `…-125`, `…-150` — selector-safe). */
const scaleId = (s: TextScale): string => `mh-settings-scale-${Math.round(s * 100)}`;

/** Radio id per quality choice (`…-auto`, `…-low`, `…-mid`, `…-high`). */
const perfId = (c: PerfChoice): string => `mh-settings-perf-${c}`;

/** The one-line friendly name for a KeyboardEvent.code — `KeyP` → `P`,
 *  `Digit1` → `1`, arrows to glyphs, modifiers to L/R names; anything else
 *  (Space, Enter, F12, …) shows as-is. Pure display, both languages. */
export function keyLabel(code: string): string {
  const m = /^Key([A-Z])$/.exec(code) ?? /^Digit([0-9])$/.exec(code);
  if (m) return m[1]!;
  const ARROWS: Readonly<Record<string, string>> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  const arrow = ARROWS[code];
  if (arrow !== undefined) return arrow;
  const MODS: Readonly<Record<string, string>> = {
    ShiftLeft: 'L Shift',
    ShiftRight: 'R Shift',
    ControlLeft: 'L Ctrl',
    ControlRight: 'R Ctrl',
    AltLeft: 'L Alt',
    AltRight: 'R Alt',
    MetaLeft: 'L Meta',
    MetaRight: 'R Meta',
  };
  return MODS[code] ?? code;
}

export function buildSettingsOverlay(init: SettingsInit): SettingsOverlay {
  let lang: Lang = 'en';
  const root = document.createElement('div');
  root.id = 'mh-settings-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-settings-box';

  const h = document.createElement('h2');
  h.id = 'mh-settings-title'; // M5/T6 — the dialog's accessible name
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

  // ---- Performance: the quality radio (M5/T4) --------------------------------
  // 'auto' tracks the frame rate (main's rolling 5s average feeds autoPreset);
  // a pinned rung wins until the player returns to auto. The note is honest
  // about the two clocks: sharpness (pixel ratio) lands at once, mirror
  // detail (hero RT, bob) on the next floor build.
  const performance = document.createElement('h3');
  const perfField = document.createElement('fieldset');
  const perfLegend = document.createElement('legend');
  perfField.appendChild(perfLegend);
  const perfRadios: Record<string, HTMLInputElement> = {};
  const perfTexts: Record<string, HTMLElement> = {};
  for (const c of PERF_CHOICES) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'mh-perf';
    input.id = perfId(c);
    input.value = c;
    input.addEventListener('change', () => {
      if (input.checked) init.onPerf(c);
    });
    perfRadios[c] = input;
    const text = document.createElement('span');
    perfTexts[c] = text;
    label.append(input, document.createTextNode(' '), text);
    perfField.appendChild(label);
  }
  const perfNote = document.createElement('p');
  perfNote.className = 'mh-settings-note';

  // ---- Floors: the venue side-floor card (M6/T1) ----------------------------
  // One card for the shipped DEMO pack — a clearly-labeled fictional café —
  // with the one honest note: sponsored floors never touch the campaign. The
  // button plays the demo floor, or returns once one is live (main owns the
  // state; setVenue flips this label).
  const floors = document.createElement('h3');
  const venueCard = document.createElement('div');
  venueCard.className = 'mh-venue-card';
  const venueName = document.createElement('div');
  venueName.className = 'mh-venue-name';
  const venuePlay = document.createElement('button');
  venuePlay.type = 'button';
  venuePlay.id = 'mh-settings-venue';
  venuePlay.addEventListener('click', () => init.onVenueFloor());
  const venueNote = document.createElement('p');
  venueNote.className = 'mh-settings-note';
  venueCard.append(venueName, venuePlay, venueNote);
  /** The Floors button's live meaning — Play (false) or Return (true). */
  let venueLive = false;

  function renderVenueCard(): void {
    venuePlay.textContent = t(lang, venueLive ? 'venue.return' : 'venue.play');
    venuePlay.setAttribute('aria-label', t(lang, venueLive ? 'venue.return' : 'venue.play'));
  }

  // ---- Controls: the 15 rebindable actions (M5/T2) --------------------------
  const controls = document.createElement('h3');
  const keyNote = document.createElement('p');
  keyNote.className = 'mh-settings-note';
  const keymapList = document.createElement('div');
  keymapList.className = 'mh-keymap';
  /** Rows in DEFAULT_KEYMAP's canonical order; buttons keyed by action. */
  const keyBtns: Record<string, HTMLButtonElement> = {};
  const keyLabels: Record<string, HTMLElement> = {};
  for (const action of Object.keys(DEFAULT_KEYMAP)) {
    const row = document.createElement('div');
    row.className = 'mh-key-row';
    const label = document.createElement('span');
    label.className = 'mh-key-label';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mh-key-btn';
    btn.dataset.action = action;
    btn.addEventListener('click', () => startCapture(action));
    row.append(label, btn);
    keymapList.appendChild(row);
    keyBtns[action] = btn;
    keyLabels[action] = label;
  }
  const keyMsg = document.createElement('p');
  keyMsg.className = 'mh-settings-note';
  keyMsg.id = 'mh-keymap-msg';
  keyMsg.setAttribute('role', 'status');
  const resetKeys = document.createElement('button');
  resetKeys.type = 'button';
  resetKeys.id = 'mh-settings-reset-keys';
  resetKeys.addEventListener('click', () => init.onResetKeys());

  /** The captured rebind state: null = idle; an action name = the next
   *  keydown (except Escape) rebinds that action. */
  let capturing: string | null = null;
  /** The overlay's mirror of the live map — main pushes it via setValues. */
  let keyMap: KeyMap = DEFAULT_KEYMAP;

  function renderKeyRows(): void {
    for (const action of Object.keys(DEFAULT_KEYMAP)) {
      const btn = keyBtns[action]!;
      const label = keyLabels[action]!;
      label.textContent = t(lang, `key.${action}`);
      if (capturing === action) {
        btn.textContent = t(lang, 'settings.pressKey');
        btn.classList.add('mh-key-capturing');
      } else {
        btn.textContent = keyLabel(keyMap[action] ?? '?');
        btn.classList.remove('mh-key-capturing');
      }
    }
  }

  function setKeyMsg(text: string | null, warn: boolean): void {
    keyMsg.textContent = text ?? '';
    keyMsg.classList.toggle('mh-key-conflict', warn);
  }

  function startCapture(action: string): void {
    capturing = action;
    setKeyMsg(t(lang, 'settings.pressKey'), false);
    renderKeyRows();
  }

  function endCapture(): void {
    capturing = null;
    renderKeyRows();
  }

  // The capture eats the next keydown on the CAPTURE phase of window — first
  // in line before every bubble-phase game listener — and stops the event's
  // propagation outright, so a key bound to a verb (M mutes, H opens the FAQ)
  // rebinds instead of firing while it is being captured. M5/T5: the capture
  // first REFUSES what may never bind — the hardwired arrows/shifts and any
  // code failing the save's CODE_RE shape check — with the inline message
  // saying why; the capture stays armed, so the very next keydown can still
  // land the rebind (Escape still cancels).
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (capturing === null) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const action = capturing;
      if (e.code === 'Escape') {
        endCapture();
        setKeyMsg(null, false);
        return;
      }
      if (!capturableCode(e.code)) {
        setKeyMsg(t(lang, 'settings.keyRefused'), true);
        return; // refused — the capture stays armed for a valid key
      }
      const conflict = init.onRebind(action, e.code); // success → main pushed setValues
      capturing = null;
      renderKeyRows();
      if (conflict !== null)
        setKeyMsg(
          fill(t(lang, 'settings.keyConflict'), { action: t(lang, `key.${conflict}`) }),
          true,
        );
      else setKeyMsg(null, false);
    },
    true,
  );

  const close = document.createElement('button');
  close.type = 'button';
  close.id = 'mh-settings-close';
  // step007/T1 — the About entry (second of the panel's two doors, the ⓘ
  // beside 🌐 being the first): a plain button above the ✕.
  const aboutEntry = document.createElement('button');
  aboutEntry.type = 'button';
  aboutEntry.id = 'mh-settings-about';
  aboutEntry.addEventListener('click', () => init.onAbout());
  // step007/T2 — the Feedback entry beside it: the 📮 composer's second door
  // (the HUD 📮 is the first).
  const feedbackEntry = document.createElement('button');
  feedbackEntry.type = 'button';
  feedbackEntry.id = 'mh-settings-feedback';
  feedbackEntry.addEventListener('click', () => init.onFeedback());
  function closeNow(): void {
    if (!root.hidden) {
      root.hidden = true;
      if (capturing !== null) {
        endCapture(); // a closing overlay never keeps a capture armed
        setKeyMsg(null, false);
      }
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
    performance,
    perfField,
    perfNote,
    floors,
    venueCard,
    controls,
    keyNote,
    keymapList,
    keyMsg,
    resetKeys,
    aboutEntry,
    feedbackEntry,
    close,
  );
  root.appendChild(box);
  document.body.appendChild(root);
  // M5/T6 — dialog semantics: role=dialog + aria-modal, Tab cycles inside,
  // Escape closes through the SAME closeNow (flush the save, disarm a capture
  // — the capture-phase listener eats an in-capture Escape before this sees
  // it, so Escape-while-capturing only cancels the capture, as documented).
  trapDialog(root, { labelledBy: 'mh-settings-title', onEscape: closeNow });

  function relabel(): void {
    h.textContent = t(lang, 'settings.title');
    display.textContent = t(lang, 'settings.display');
    scaleLegend.textContent = t(lang, 'settings.textScale');
    access.textContent = t(lang, 'settings.access');
    reducedText.textContent = t(lang, 'settings.reducedFlash');
    reducedNote.textContent = t(lang, 'settings.reducedFlashNote');
    captionsText.textContent = t(lang, 'settings.captions');
    captionsNote.textContent = t(lang, 'settings.captionsNote');
    performance.textContent = t(lang, 'settings.performance');
    perfLegend.textContent = t(lang, 'settings.perf');
    for (const c of PERF_CHOICES) perfTexts[c]!.textContent = t(lang, `settings.perf_${c}`);
    perfNote.textContent = t(lang, 'settings.perfNote');
    floors.textContent = t(lang, 'settings.floors');
    venueName.textContent = t(lang, 'venue.demoName');
    venueNote.textContent = t(lang, 'venue.settingsNote');
    renderVenueCard();
    controls.textContent = t(lang, 'settings.controls');
    keyNote.textContent = t(lang, 'settings.keyNote');
    resetKeys.textContent = t(lang, 'settings.resetKeys');
    aboutEntry.textContent = t(lang, 'btn.about'); // step007/T1 — the ⓘ twin
    feedbackEntry.textContent = `📮 ${t(lang, 'btn.feedback')}`; // step007/T2 — the 📮 twin
    close.textContent = t(lang, 'settings.close');
    close.setAttribute('aria-label', t(lang, 'aria.close')); // M5/T6
    renderKeyRows();
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
      for (const c of PERF_CHOICES) perfRadios[c]!.checked = c === v.perf;
      keyMap = v.keyMap;
      renderKeyRows();
    },
    setLang: (next) => {
      if (next === lang) return;
      lang = next;
      relabel();
    },
    setVenue: (on) => {
      venueLive = on;
      renderVenueCard();
    },
    capturingAction: () => capturing,
  };
}
