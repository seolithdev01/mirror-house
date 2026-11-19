// SPDX-License-Identifier: Apache-2.0
//
// step007/T2 — the 📮 feedback composer overlay. The About panel's modal
// shape (same box, same trapDialog semantics, same stack contract) holding a
// three-way category radio (Bug / Suggestion / a kind word), a short title,
// and one textarea whose value IS the message that will be sent: on every
// open it is prefilled with the prompt and the diagnostics snapshot main
// composes from live state, and the player can edit or trim every line of it
// — nothing leaves the page until you press a button: SEND's one POST is the
// only network exit, and the anchors hand the same text to GitHub or mail.
// The two fallback exits are real anchors (target=_blank / mailto:) whose
// hrefs are recomposed from the live textarea on every keystroke, so what
// the player just read is exactly what the GitHub form (or mail client)
// receives — and the href itself stays inspectable before the press.
// Alongside the text, a LIVE screenshot — the moment the form was opened —
// is captured on every open (a synchronous canvas read; the renderer holds
// the last frame) and previewed under the kind radio with one meta line.
// step007/T4 — SEND: the wire exit. One button POSTs the whole report — the
// note, the held shot, the wire context — same-origin to /api/feedback (the
// overlay's ONLY network call; the anchors never auto-send), a role=status
// line announces sending → sent | failed, and SEND is disabled unless a shot
// is held: a report always ships its moment, or it does not ship at all.
// init.snapshot() hands over the wire context the same moment is taken in;
// init.version stamps the build the report came from.

import { buildIssueUrl, buildMailto, SUPPORT_EMAIL, type FeedbackKind } from '../game/feedback';
import { buildFeedbackPayload, targetShotSize, type FeedbackCtx } from '../game/feedbackNet';
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
  /** the build stamp on the wire payload (main passes APP_VERSION). */
  version: string;
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
  // The img stays alt='' (a real alt would double the meta line in reading
  // order) but carries the T2-review aria-label from 'feedback.shot' — the
  // honest name assistive tech needs for the pixel block above the form.
  // The whole row hides until a shot exists (no-canvas contexts keep the
  // composer). currentShot === null is also SEND's gate: no moment, no send.
  let currentShot: FeedbackShot | null = null;
  const shotWrap = document.createElement('div');
  shotWrap.id = 'mh-feedback-shot-wrap';
  const shotImg = document.createElement('img');
  shotImg.id = 'mh-feedback-shot';
  shotImg.alt = ''; // decorative preview; the aria-label + meta line name it
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

  // The actions row, in order: the second privacy line (exactly what one
  // SEND press ships), the SEND button (T4's wire exit — see send() below),
  // the status line announcing the verdict, then the two fallback exits —
  // anchors, not buttons: the href is composed before the press (inspectable,
  // right-click copyable) and target=_blank is the window.open equivalent on
  // a user gesture, popup-blocker-proof. The mail anchor is a plain href (no
  // target): mail clients take it from here. They stay as the no-wire path.
  const actions = document.createElement('div');
  actions.id = 'mh-feedback-actions';
  const privacy2 = document.createElement('p');
  privacy2.id = 'mh-feedback-privacy2';
  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.id = 'mh-feedback-send';
  const statusEl = document.createElement('p');
  statusEl.id = 'mh-feedback-status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  statusEl.hidden = true; // idle says nothing; renderSendState() owns this
  const github = document.createElement('a');
  github.id = 'mh-feedback-github';
  github.target = '_blank';
  github.rel = 'noopener noreferrer';
  const email = document.createElement('a');
  email.id = 'mh-feedback-email';
  actions.append(privacy2, sendBtn, statusEl, github, email);

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

  // step007/T4 — the SEND state machine: idle → sending → sent | failed.
  // lastError holds the server's error string (or the network's verdict)
  // only while failed; renderSendState() is the single writer of the button
  // and the status line, so a language flip re-renders both verbatim.
  type SendState = 'idle' | 'sending' | 'sent' | 'failed';
  let sendState: SendState = 'idle';
  let lastError = '';
  const renderSendState = (): void => {
    // Honesty rule: a report always ships its shot — no held moment, no SEND.
    sendBtn.disabled = sendState === 'sending' || currentShot === null;
    sendBtn.textContent =
      sendState === 'sending' ? t(lang, 'feedback.sending') : t(lang, 'feedback.send');
    statusEl.className = sendState === 'failed' ? 'failed' : '';
    if (sendState === 'idle') statusEl.hidden = true;
    else {
      statusEl.hidden = false;
      statusEl.textContent =
        sendState === 'sent'
          ? t(lang, 'feedback.sent')
          : sendState === 'sending'
            ? t(lang, 'feedback.sending')
            : fill(t(lang, 'feedback.failed'), { err: lastError });
    }
  };

  /** One press ships the whole report: kind + title + the textarea verbatim
   *  + the held shot + the wire context, POSTed same-origin to /api/feedback
   *  — the ONLY fetch this overlay (or its anchors) ever makes. The server's
   *  own error string lands in the status line on failure; the draft stays
   *  intact either way. */
  const send = async (): Promise<void> => {
    if (sendState === 'sending' || currentShot === null) return;
    sendState = 'sending';
    renderSendState();
    const payload = buildFeedbackPayload({
      v: init.version,
      kind: kind(),
      title: summary.value.trim() === '' ? 'Mirror House feedback' : summary.value.trim(),
      body: body.value,
      shot: currentShot,
      ctx: init.snapshot(),
    });
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
      });
      if (res.ok) {
        sendState = 'sent';
      } else {
        let err = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { ok: boolean; error?: string };
          if (typeof j.error === 'string') err = j.error;
        } catch {
          /* non-JSON body — keep the HTTP code */
        }
        lastError = err;
        sendState = 'failed';
      }
    } catch {
      lastError = 'no connection';
      sendState = 'failed';
    }
    renderSendState();
  };
  sendBtn.addEventListener('click', () => {
    void send();
  });

  function relabel(): void {
    h.textContent = t(lang, 'feedback.title');
    kindLegend.textContent = t(lang, 'feedback.kind');
    for (const k of KINDS) kindTexts[k].textContent = t(lang, `feedback.${k}`);
    summaryText.textContent = t(lang, 'feedback.summary');
    bodyText.textContent = t(lang, 'feedback.body');
    privacy.textContent = t(lang, 'feedback.privacyNote');
    privacy2.textContent = t(lang, 'feedback.privacyNote2');
    github.textContent = t(lang, 'feedback.github');
    email.textContent = t(lang, 'feedback.email');
    close.textContent = t(lang, 'aria.close');
    close.setAttribute('aria-label', t(lang, 'aria.close'));
    shotImg.setAttribute('aria-label', t(lang, 'feedback.shot')); // the T2-review rider: the orphan key names the preview
    renderShotMeta(); // the meta line re-renders the held shot in the new words
    renderSendState(); // the button + status line re-render in the new words
    refreshHrefs(); // the empty-title fallback follows the new labels
  }
  relabel();
  return {
    root,
    toggle: () => {
      if (root.hidden) {
        refreshBody(); // fresh diagnostics with every open
        refreshShot(); // the moment, re-held with every open
        sendState = 'idle'; // a reopen is a fresh slate — no stale verdict
        lastError = '';
        renderSendState(); // (also re-arms SEND once the fresh shot is held)
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
