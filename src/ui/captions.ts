// SPDX-License-Identifier: Apache-2.0
//
// Captions (M5/T3) — the house's sound cues as text. The feed is a pure
// event log: `captionFeed` dedupes by id within the event's ttl (the same
// cue cannot speak twice in one window — the echo sense check fires every
// 250 ms per echo) and trims what expired; `renderCaptions` paints the
// LATEST TWO live lines into the bottom-center bar (#mh-captions, owned by
// hud.ts) and hides it when nothing is live. The FADE is CSS, not JS: the
// bar joins the reduced-flash family (opacity transition ≥300 ms when the
// body class is on — see index.html), the same contract every overlay and
// banner already rides. No three.js, no document — node unit tests import
// this module freely; renderCaptions touches only textContent/hidden on the
// element it is handed.

/** How long one caption line stays on the bar. */
export const CAPTION_TTL_MS = 4000;

export interface CaptionEvent {
  id: string;
  text: string;
  at: number;
  ttlMs: number;
}

/** True while the event is still within its ttl (`at + ttlMs` exclusive). */
function live(e: CaptionEvent, now: number): boolean {
  return now < e.at + e.ttlMs;
}

/**
 * Add `ev` to the feed: trim what `now` has expired, then drop `ev` when an
 * unexpired event with the same id already spoke (dedupe within ttl — the
 * earlier line keeps its own clock; a repeat after expiry lands as fresh).
 * Pure: the input array is never mutated, the result is always fresh.
 */
export function captionFeed(
  events: readonly CaptionEvent[],
  ev: CaptionEvent,
  now: number,
): CaptionEvent[] {
  const kept = events.filter((e) => live(e, now));
  if (kept.some((e) => e.id === ev.id)) return kept;
  return [...kept, ev];
}

/**
 * Paint the bar: the latest two live lines, oldest first, joined by one
 * newline (the bar's `white-space: pre-line` turns that into two stacked
 * lines); hidden when nothing is live. Writes textContent only when it
 * actually changed — the frame loop calls this every frame and the DOM
 * stays quiet while the lines hold.
 */
export function renderCaptions(
  el: HTMLElement,
  events: readonly CaptionEvent[],
  now: number,
): void {
  const lines = events.filter((e) => live(e, now)).slice(-2);
  const text = lines.map((e) => e.text).join('\n');
  if (el.textContent !== text) el.textContent = text;
  el.hidden = lines.length === 0;
}
