// SPDX-License-Identifier: Apache-2.0
//
// T13/T1 — THE START SCREEN: the boot poster becomes the door. The PoD boot
// composition — kicker MIRROR (yellow display), the giant HOUSE (cream), the
// tagline — plates over the world on an OPAQUE ink field (the poster's own
// language, promoted from decoration to gate), with the session's verbs
// beneath it: fresh saves get one primary BEGIN THE DESCENT; a stored
// campaign (floor > 1 or tierComplete) gets CONTINUE — FLOOR N plus the NEW
// HOUSE ghost secondary (a fresh random seed — main's onNewHouse owns that
// rebuild); a save that exists adds the mini-stats line (streak · shards ·
// best) and every plate carries the credits footer.
//
// It GATES the session: role=dialog + aria-modal (trapDialog), focus lands on
// the primary button the moment it plates, Tab cycles inside, and Escape does
// NOTHING here — there is no back out of the house's front door. While the
// plate stands, the world behind is live in `ready` but deaf: capture-phase
// swallowers keep every game key, stick drag and mouse-hold from reaching the
// collector (the timer arms on the first input AFTER dismissal, exactly as
// shipped — no new arming logic). The buttons alone are heard — so the first
// tap on BEGIN still counts as the audio gesture and the touch-mode lock, as
// any first input should.
//
// Dismiss = the overlay removed and the swallowers lifted; the phase machine
// (dismissStart) is terminal — the door never re-plates within a session.
//
// The pure core (choicesFor, dismissStart) is unit-pinned in
// tests/unit/startScreen.test.ts; the DOM factory below is browser-only.

import { trapDialog } from './dialog';
import { fill, t, type Lang } from './i18n';

/** Which buttons the plate carries — the pure truth table the e2e and the
 *  unit suite both read. `continueLabel` is the {n} payload for the
 *  localized `start.continueFloor` template (pure digits, language-free —
 *  the wording lives in i18n, never here). */
export interface StartChoices {
  primary: 'begin' | 'continue';
  continueLabel?: string;
  secondary: boolean;
}

/** Fresh save → BEGIN alone. Stored campaign → CONTINUE — FLOOR N + NEW
 *  HOUSE. `hasProgress` is the sole gate (floor > 1 OR tierComplete — a
 *  post-tier resume stands on floor 1 and still continues). */
export function choicesFor(hasProgress: boolean, floorN: number): StartChoices {
  if (!hasProgress) return { primary: 'begin', secondary: false };
  return { primary: 'continue', continueLabel: String(floorN), secondary: true };
}

/** The plate's two phases. The dismiss transition is TERMINAL: the screen
 *  gates the session, so once the door has opened it never re-plates inside
 *  it (a re-mount would be a new session's business, not this one's). */
export type StartPhase = 'plated' | 'dismissed';

export function dismissStart(phase: StartPhase): StartPhase {
  return phase === 'plated' ? 'dismissed' : phase; // 'dismissed' stays — the gate never re-plates
}

/** The save's mini-stats, pre-formatted — main owns the formatting (the
 *  best time rides the hud's `(ms/1000).toFixed(1)s` shape, '—' when the
 *  floor has no best yet); the plate only writes what it is given. */
export interface StartStats {
  streak: number;
  shards: number;
  best: string | null;
}

export interface StartScreenOptions {
  lang: Lang;
  /** floor > 1 or tierComplete — the choicesFor gate. */
  hasProgress: boolean;
  /** The campaign floor the world behind the plate is standing on. */
  floorN: number;
  /** A save exists (stored or migrated) — the mini-stats line shows. */
  hasSave: boolean;
  stats: StartStats;
  onBegin(): void;
  onContinue(): void;
  /** NEW HOUSE: main rebuilds the campaign on a fresh random seed, then
   *  dismisses — the new floor is live before the plate lifts. */
  onNewHouse(): void;
}

export interface StartScreenHandle {
  root: HTMLElement;
  /** The door opens: swallowers lift, the trap releases, the overlay is
   *  removed. Idempotent (the phase machine is terminal). */
  dismissStartScreen(): void;
  /** Dismissed state, queryable — main guards with it. */
  isDismissed(): boolean;
}

export function showStartScreen(opts: StartScreenOptions): StartScreenHandle {
  const choices = choicesFor(opts.hasProgress, opts.floorN);
  let phase: StartPhase = 'plated';

  const root = document.createElement('div');
  root.id = 'mh-start';

  const kicker = document.createElement('div');
  kicker.className = 'mh-start-kicker';
  kicker.textContent = t(opts.lang, 'start.kicker');

  const title = document.createElement('h1');
  title.id = 'mh-start-title'; // the dialog's accessible name
  title.className = 'mh-start-title';
  title.textContent = t(opts.lang, 'start.title');

  const tagline = document.createElement('p');
  tagline.className = 'mh-start-tagline';
  tagline.textContent = t(opts.lang, 'start.tagline');

  const actions = document.createElement('div');
  actions.className = 'mh-start-actions';
  const primary = document.createElement('button');
  primary.type = 'button';
  primary.id = 'mh-start-play'; // the door — the FIRST focusable on the plate
  primary.className = 'mh-start-play';
  primary.textContent =
    choices.primary === 'begin'
      ? t(opts.lang, 'start.begin')
      : fill(t(opts.lang, 'start.continueFloor'), { n: choices.continueLabel ?? '' });
  primary.addEventListener('click', choices.primary === 'begin' ? opts.onBegin : opts.onContinue);
  actions.appendChild(primary);
  if (choices.secondary) {
    const fresh = document.createElement('button');
    fresh.type = 'button';
    fresh.id = 'mh-start-new';
    fresh.className = 'mh-start-new';
    fresh.textContent = t(opts.lang, 'start.newHouse');
    fresh.addEventListener('click', opts.onNewHouse);
    actions.appendChild(fresh);
  }

  const stats = document.createElement('p');
  stats.className = 'mh-start-stats';
  if (opts.hasSave) {
    stats.id = 'mh-start-stats';
    stats.textContent = fill(t(opts.lang, 'start.stats'), {
      streak: opts.stats.streak,
      shards: opts.stats.shards,
      best: opts.stats.best ?? '—',
    });
  }

  const credits = document.createElement('p');
  credits.className = 'mh-start-credits';
  credits.textContent = t(opts.lang, 'start.credits');

  root.append(kicker, title, tagline, actions, stats, credits);
  document.body.appendChild(root);

  // Dialog semantics: role=dialog + aria-modal + labelled by the giant HOUSE,
  // Tab cycles inside, focus lands on the primary button at once — and NO
  // onEscape: Escape cannot dismiss the gate (the screen owns the session).
  const trap = trapDialog(root, { labelledBy: 'mh-start-title' });

  // The gate's ears: while the plate stands, the world behind hears nothing.
  // Capture-phase on window — BEFORE the collector's bubble listeners ever
  // run. Tab is spared (the trap's cycle must hear it); the plate's own
  // buttons are spared (a click must click, and the first tap still counts as
  // the audio gesture and the touch-mode lock, as any first input should).
  function onPlate(e: Event): boolean {
    const el = e.target;
    return el instanceof Element && root.contains(el) && el.closest('button') !== null;
  }
  function onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Tab') return; // the trap owns the cycle
    e.stopPropagation(); // the session is gated — no game key exists yet
  }
  function onDown(e: Event): void {
    if (onPlate(e)) return; // BEGIN/CONTINUE/NEW HOUSE stay alive
    e.stopPropagation(); // no stick drag, no mouse-hold walk behind the plate
  }
  function onMove(e: Event): void {
    e.stopPropagation(); // no look deltas bank while the house is still plated
  }
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('mousemove', onMove, true);

  return {
    root,
    dismissStartScreen(): void {
      if (phase === 'dismissed') return; // the door opened once
      phase = dismissStart(phase);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('mousemove', onMove, true);
      trap.release(); // the cycle ends; focus returns to where the plate found it
      root.remove();
    },
    isDismissed: () => phase === 'dismissed',
  };
}
