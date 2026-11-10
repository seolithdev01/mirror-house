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
// the href itself stays inspectable before the press.

import { buildIssueUrl, buildMailto, SUPPORT_EMAIL, type FeedbackKind } from '../game/feedback';
import { trapDialog } from './dialog';
import { t, type Lang } from './i18n';

/** The kind radio's three members, in display order. */
const KINDS: readonly FeedbackKind[] = ['bug', 'suggestion', 'love'];

export interface FeedbackOverlay {
  root: HTMLElement;
  /** open ↔ closed — the 📮 button's and the ⚙ entry's click. Opening
   *  refreshes the textarea (prompt + a fresh diagnostics snapshot) and both
   *  hrefs; closing leaves the player's draft title and edits in place. */
  toggle(): void;
  setLang(lang: Lang): void;
}

export function buildFeedbackOverlay(init: { diagnostics(): string }): FeedbackOverlay {
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
  box.append(h, kindField, summaryLabel, bodyLabel, privacy, actions, close);
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
    refreshHrefs(); // the empty-title fallback follows the new labels
  }
  relabel();
  return {
    root,
    toggle: () => {
      if (root.hidden) {
        refreshBody(); // fresh diagnostics with every open
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
