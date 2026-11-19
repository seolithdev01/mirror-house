// SPDX-License-Identifier: Apache-2.0
//
// step007/T2 — the 📮 feedback composer overlay. The About panel's modal
// shape (same box, same trapDialog semantics, same stack contract) holding a
// three-way category radio (Bug / Suggestion / a kind word), a short title,
// and one textarea whose value IS the message that will be sent: on every
// open it is prefilled with the prompt and the diagnostics snapshot main
// composes from live state, and the player can edit or trim every line of it
// — privacy is absolute, nothing leaves the page until a button is pressed.
// The two exits are real anchors (target=_blank / mailto:) whose hrefs are
// recomposed from the live textarea on every keystroke, so what the player
// just read is exactly what the GitHub form (or mail client) receives — and
// the href itself stays inspectable before the press. Alongside the text, a
// LIVE screenshot — the moment the form was opened — is captured on every
// open (a synchronous canvas read; the renderer holds the last frame) and
// previewed under the kind radio with one meta line; T4's sender attaches it
// to the wire payload. init.snapshot() hands over the wire context the same
// moment is taken in.

import { buildIssueUrl, buildMailto, SUPPORT_EMAIL, type FeedbackKind } from '../game/feedback';
import { targetShotSize, type FeedbackCtx } from '../game/feedbackNet';
import { trapDialog } from './dialog';
import { fill, t, type Lang } from './i18n';

/** The kind radio's three members, in display order. */
const KINDS: readonly FeedbackKind[] = ['bug', 'suggestion', 'love'];

/** One captured moment: the downscaled dimensions + the JPEG data-URL the
 *  wire payload (T4) will carry inside the shot field. */
export interface FeedbackShot {
  w: number;
  h: number;
  dataUrl: string;
}

/** Capture the live game canvas into a ≤1280-wide JPEG data-URL. Reads the
 *  pixels synchronously (safe: the renderer runs with preserveDrawingBuffer
 *  so the last frame is held). Returns null when no canvas exists — the
 *  composer still works, just without a shot. */
function captureShot(): FeedbackShot | null {
  const game = document.querySelector<HTMLCanvasElement>('#game');
  if (game === null || game.width === 0 || game.height === 0) return null;
  const [w, h] = targetShotSize(game.width, game.height, 1280);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const g = off.getContext('2d');
  if (g === null) return null;
  g.drawImage(game, 0, 0, w, h);
  return { w, h, dataUrl: off.toDataURL('image/jpeg', 0.75) };
}

export interface FeedbackOverlay {
  root: HTMLElement;
  /** open ↔ closed — the 📮 button's and the ⚙ entry's click. Opening
   *  refreshes the textarea (prompt + a fresh diagnostics snapshot) and both
   *  hrefs; closing leaves the player's draft title and edits in place. */
  toggle(): void;
  setLang(lang: Lang): void;
}

export function buildFeedbackOverlay(init: {
  diagnostics(): string;
  /** live context for the wire payload (T4 builds the POST from this). */
  snapshot(): FeedbackCtx;
}): FeedbackOverlay {
  let lang: Lang = 'en';
  const root = document.createElement('div');
  root.id = 'mh-feedback-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-feedback-box';
  const h = document.createElement('h2');
  h.id = 'mh-feedback-title'; // the dialog's accessible name (trapDialog)

  // The category radio — bug files to bug_report.md, suggestion to
  // feature_request.md, a kind word to playtest.md (game/feedback owns the
  // mapping; the labels are chrome, bilingual).
  const kindField = document.createElement('fieldset');
  kindField.id = 'mh-feedback-kind';
  const kindLegend = document.createElement('legend');
  kindField.appendChild(kindLegend);
  const kindRadios: Record<FeedbackKind, HTMLInputElement> = {} as Record<
    FeedbackKind,
    HTMLInputElement
  >;
  const kindTexts: Record<FeedbackKind, HTMLElement> = {} as Record<FeedbackKind, HTMLElement>;
  for (const kind of KINDS) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'mh-feedback-kind';
    input.id = `mh-feedback-kind-${kind}`;
    input.value = kind;
    input.checked = kind === 'bug'; // the common case opens pre-selected
    input.addEventListener('change', () => {
      if (input.checked) refreshHrefs();
    });
    kindRadios[kind] = input;
    const text = document.createElement('span');
    kindTexts[kind] = text;
    label.append(input, document.createTextNode(' '), text);
    kindField.appendChild(label);
  }

  // The moment — captured on every open (captureShot above): a downscaled
  // JPEG preview beside one meta line ({w}×{h} · ~KB · attached on SEND).
  // The img is decorative (alt=''); the meta line does the naming. The whole
  // row hides until a shot exists (no-canvas contexts keep the composer).
  let currentShot: FeedbackShot | null = null;
  const shotWrap = document.createElement('div');
  shotWrap.id = 'mh-feedback-shot-wrap';
  const shotImg = document.createElement('img');
  shotImg.id = 'mh-feedback-shot';
  shotImg.alt = ''; // decorative preview; the meta line names it
  const shotMeta = document.createElement('span');
  shotMeta.id = 'mh-feedback-shot-meta';
  shotWrap.append(shotImg, shotMeta);

  // The short title — the issue's title line / the mail's subject. The label
  // text lives in its own span (relabel() rewrites spans, never the control).
  const summaryLabel = document.createElement('label');
  summaryLabel.htmlFor = 'mh-feedback-summary';
  const summaryText = document.createElement('span');
  const summary = document.createElement('input');
  summary.type = 'text';
  summary.id = 'mh-feedback-summary';
  summary.maxLength = 80;
  summary.addEventListener('input', refreshHrefs);
  summaryLabel.append(summaryText, summary);

  // The body. THE message: prompt + diagnostics prefilled on every open, the
  // player's to edit — the anchors below carry exactly this textarea's value.
  const bodyLabel = document.createElement('label');
  bodyLabel.htmlFor = 'mh-feedback-body';
  const bodyText = document.createElement('span');
  const body = document.createElement('textarea');
  body.id = 'mh-feedback-body';
  body.rows = 12;
  body.spellcheck = false; // the diagnostics half is ids and codes, not prose
  body.addEventListener('input', refreshHrefs);
  bodyLabel.append(bodyText, body);

  // The privacy line: the promise this whole overlay exists to keep.
  const privacy = document.createElement('p');
  privacy.id = 'mh-feedback-privacy';

  // The two exits — anchors, not buttons: the href is composed before the
  // press (inspectable, right-click copyable) and target=_blank is the
  // window.open equivalent on a user gesture, popup-blocker-proof. The mail
  // anchor is a plain href (no target): mail clients take it from here.
  const actions = document.createElement('div');
  actions.id = 'mh-feedback-actions';
  const github = document.createElement('a');
  github.id = 'mh-feedback-github';
  github.target = '_blank';
  github.rel = 'noopener noreferrer';
  const email = document.createElement('a');
  email.id = 'mh-feedback-email';
  actions.append(github, email);

  const close = document.createElement('button');
  close.type = 'button';
  close.addEventListener('click', () => {
    root.hidden = true;
  });
  box.append(h, kindField, shotWrap, summaryLabel, bodyLabel, privacy, actions, close);
  root.appendChild(box);
  root.addEventListener('click', (e) => {
    if (e.target === root) root.hidden = true;
  });
  document.body.appendChild(root);
  trapDialog(root, { labelledBy: 'mh-feedback-title', onEscape: () => (root.hidden = true) });

  /** The live kind — whichever radio is checked (bug until changed). */
  function kind(): FeedbackKind {
    for (const k of KINDS) if (kindRadios[k].checked) return k;
    return 'bug';
  }

  /** Recompose both exits from the live fields: the title falls back to the
   *  kind's own label when empty, the body is the textarea, verbatim. */
  function refreshHrefs(): void {
    const k = kind();
    const title = summary.value.trim() || t(lang, `feedback.${k}`);
    github.href = buildIssueUrl(k, title, body.value);
    email.href = buildMailto(SUPPORT_EMAIL, `[Mirror House] ${title}`, body.value);
  }

  /** Land the fresh body on open: the kind's prompt, a separator, then the
   *  diagnostics header + snapshot. Player edits live until the next OPEN —
   *  a language flip or a re-open mid-draft never clobbers typed text. */
  function refreshBody(): void {
    const diag = init.diagnostics();
    body.value =
      `${t(lang, `feedback.prompt.${kind()}`)}\n\n` +
      `--- ${t(lang, 'feedback.diagHeader')}\n${diag}\n`;
    refreshHrefs();
  }

  /** One meta line from the stored shot — the open path and relabel() share
   *  it, so a language flip re-renders the SAME capture in the new words.
   *  ~KB: base64 chars → bytes (¾) → KB, floored at 1 so it never reads 0. */
  function renderShotMeta(): void {
    if (currentShot === null) return;
    const kb = Math.max(1, Math.round((currentShot.dataUrl.length * 3) / 4 / 1024));
    shotMeta.textContent = fill(t(lang, 'feedback.shotMeta'), {
      w: currentShot.w,
      h: currentShot.h,
      kb,
    });
  }

  /** Hold the moment on open: capture the live canvas, refresh preview +
   *  meta — or hide the whole row when there is no canvas to read. */
  function refreshShot(): void {
    currentShot = captureShot();
    if (currentShot === null) {
      shotImg.removeAttribute('src');
      shotWrap.hidden = true;
    } else {
      shotImg.src = currentShot.dataUrl;
      shotWrap.hidden = false;
      renderShotMeta();
    }
  }

  function relabel(): void {
    h.textContent = t(lang, 'feedback.title');
    kindLegend.textContent = t(lang, 'feedback.kind');
    for (const k of KINDS) kindTexts[k].textContent = t(lang, `feedback.${k}`);
    summaryText.textContent = t(lang, 'feedback.summary');
    bodyText.textContent = t(lang, 'feedback.body');
    privacy.textContent = t(lang, 'feedback.privacyNote');
    github.textContent = t(lang, 'feedback.github');
    email.textContent = t(lang, 'feedback.email');
    close.textContent = t(lang, 'aria.close');
    close.setAttribute('aria-label', t(lang, 'aria.close'));
    renderShotMeta(); // the meta line re-renders the held shot in the new words
    refreshHrefs(); // the empty-title fallback follows the new labels
  }
  relabel();
  return {
    root,
    toggle: () => {
      if (root.hidden) {
        refreshBody(); // fresh diagnostics with every open
        refreshShot(); // the moment, re-held with every open
        root.hidden = false;
      } else root.hidden = true;
    },
    setLang: (next) => {
      if (next === lang) return;
      lang = next;
      relabel();
    },
  };
}
