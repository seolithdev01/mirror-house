// SPDX-License-Identifier: Apache-2.0
//
// step007/T2 — the feedback composer's pure half. Everything here is plain
// data in, plain data out: the error ring buffer (window `error` /
// `unhandledrejection` land here capped and truncated), the diagnostics
// snapshot (READ-ONLY truth from live state, rendered as the `key: value`
// block the player reviews in the textarea before anything opens), the
// GitHub new-issue URL (markdown templates take query-string prefills —
// forms/yml do not, which is why the repo ships .md templates), and the
// mailto fallback. Privacy is absolute: no function here touches the network;
// the player's press of [Open GitHub issue] / [Email instead] is the only
// send, and it carries exactly the body they just read.

/** The repo's new-issue endpoint — the one URL the [Open GitHub issue] builds. */
export const ISSUE_URL = 'https://github.com/seolithdev01/mirror-house/issues/new';

/** The support alias the composer's [Email instead] writes to. A constant, not
 *  a config: the address the project owner published for this purpose. */
export const SUPPORT_EMAIL = 'itsupport01@seolith.com';

/** How many errors the ring keeps (the plan's capped 10-entry ring). */
export const ERROR_RING_CAP = 10;

/** Per-entry text budget — enough for a message + a little stack, never a
 *  whole page of noise in the player's textarea. */
export const ERROR_TEXT_MAX = 200;

export type FeedbackKind = 'bug' | 'suggestion' | 'love';

/** One recorded runtime error: `at` is performance.now() ms, `text` the
 *  single-line, truncated rendering. */
export interface RingError {
  at: number;
  text: string;
}

/** Fold any raw error into one line of text: non-strings stringify, newlines
 *  become spaces (one line per entry in the report), and the result is capped
 *  at ERROR_TEXT_MAX code points — Array.from walks code points, so a
 *  multibyte message never leaves half a surrogate pair behind. */
function errorText(raw: unknown): string {
  const oneLine = String(raw).replace(/\s+/g, ' ').trim();
  return Array.from(oneLine).slice(0, ERROR_TEXT_MAX).join('');
}

/**
 * Record one error onto the ring — pure: the input array is never mutated,
 * the newest lands last, and once the cap is reached the OLDEST falls off the
 * front (the diagnostics keep the most recent 10, arrival order intact).
 */
export function recordError(ring: readonly RingError[], at: number, raw: unknown): RingError[] {
  const next = [...ring, { at, text: errorText(raw) }];
  return next.length > ERROR_RING_CAP ? next.slice(next.length - ERROR_RING_CAP) : next;
}

/**
 * How many actions sit on a non-default binding — the keymap-diff count the
 * snapshot reports (a count, never the bindings: the layout is already in the
 * seed, and rebinding history is nobody's business but the player's).
 */
export function keymapDiffCount(
  map: Readonly<Record<string, string>>,
  defaults: KeyMapLike,
): number {
  let diffs = 0;
  for (const action of Object.keys(defaults))
    if ((map[action] ?? '') !== defaults[action]) diffs += 1;
  return diffs;
}
/** keymapDiffCount only reads the default map's shape — a structural type so
 *  this module need not import the save layer. */
interface KeyMapLike {
  [action: string]: string | undefined;
}

/** Everything the snapshot renders — main fills it from live state at the
 *  moment the composer opens; nothing here reaches back into the game. */
export interface DiagnosticsState {
  appVersion: string;
  userAgent: string;
  lang: string;
  /** The effective quality preset ('low' | 'mid' | 'high'). */
  preset: string;
  /** The CURRENT floor's full seed (`BASE:1` — the per-floor bucket). */
  seed: string;
  floor: number;
  /** The campaign's base seed (`BASE`). */
  campaignBase: string;
  /** The phase machine's kind: ready | running | failing | cleared. */
  phaseKind: string;
  /** The live venue pack's id, or null on the campaign floor. */
  venueId: string | null;
  reducedFlash: boolean;
  captions: boolean;
  textScale: number;
  remappedKeys: number;
  errors: readonly RingError[];
}

/**
 * Render the diagnostics block the player reviews (and may trim) before
 * sending — one `key: value` per line, the error ring last. The exact text
 * produced here is the exact text that lands in the GitHub issue / email:
 * what the player saw is what the maintainer gets.
 */
export function diagnosticsSnapshot(state: DiagnosticsState): string {
  const onOff = (b: boolean): string => (b ? 'on' : 'off');
  const lines = [
    `game: Mirror House v${state.appVersion}`,
    `lang: ${state.lang}`,
    `preset: ${state.preset}`,
    `seed: ${state.seed}`,
    `floor: ${state.floor}`,
    `campaign: ${state.campaignBase}`,
    `phase: ${state.phaseKind}`,
    `venue: ${state.venueId ?? 'none'}`,
    `reducedFlash: ${onOff(state.reducedFlash)}`,
    `captions: ${onOff(state.captions)}`,
    `textScale: ${state.textScale}`,
    `remappedKeys: ${state.remappedKeys}`,
    `userAgent: ${state.userAgent}`,
  ];
  if (state.errors.length === 0) lines.push('errors: none');
  else {
    lines.push(`errors: ${state.errors.length}`);
    for (const e of state.errors) lines.push(`  [${(e.at / 1000).toFixed(1)}s] ${e.text}`); // arrival order, oldest first
  }
  return lines.join('\n');
}

/** The markdown template each kind files into (query-prefillable, unlike
 *  issue forms) + the labels the triage board sorts by: every in-game issue
 *  carries `from-game`, bugs and suggestions add `feedback`, kind words go to
 *  the playtest board. */
const KIND_META: Record<FeedbackKind, { template: string; labels: string }> = {
  bug: { template: 'bug_report.md', labels: 'from-game,feedback' },
  suggestion: { template: 'feature_request.md', labels: 'from-game,feedback' },
  love: { template: 'playtest.md', labels: 'from-game,playtest' },
};

/**
 * Compose the GitHub new-issue URL: template + labels + title + body, every
 * value encodeURIComponent-encoded (newlines as %0A, multibyte intact — the
 * textarea's exact contents survive the trip; the tests round-trip them).
 */
export function buildIssueUrl(kind: FeedbackKind, title: string, body: string): string {
  const { template, labels } = KIND_META[kind];
  const params = new URLSearchParams();
  params.set('template', template);
  params.set('labels', labels);
  params.set('title', title);
  params.set('body', body);
  return `${ISSUE_URL}?${params.toString()}`;
}

/**
 * Compose the mailto fallback: `mailto:<to>?subject=…&body=…`, both encoded
 * the same way the issue URL is. `to` is a parameter, not a hidden constant —
 * the UI passes SUPPORT_EMAIL, and a test can pass anything.
 */
export function buildMailto(to: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  return `mailto:${to}?${params.toString()}`;
}
