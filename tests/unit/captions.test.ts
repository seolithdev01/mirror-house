// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import {
  CAPTION_TTL_MS,
  captionFeed,
  renderCaptions,
  type CaptionEvent,
} from '../../src/ui/captions';

const ev = (id: string, at: number, text = id, ttlMs = CAPTION_TTL_MS): CaptionEvent => ({
  id,
  text,
  at,
  ttlMs,
});

/** A minimal stand-in element: renderCaptions touches only textContent/hidden,
 *  so node (no DOM) can host the render tests — plus a write counter the
 *  churn-free test reads. */
function stubEl(): { el: HTMLElement; writes: () => number } {
  let text = '';
  let writes = 0;
  const el = {
    get textContent() {
      return text;
    },
    set textContent(v: string) {
      writes++;
      text = v;
    },
    hidden: false,
  };
  return { el: el as unknown as HTMLElement, writes: () => writes };
}

describe('captions — captionFeed', () => {
  it('appends a new event to a fresh feed', () => {
    const out = captionFeed([], ev('echo-sense', 1000, 'The glass sees you'), 1000);
    expect(out).toEqual([ev('echo-sense', 1000, 'The glass sees you')]);
  });

  it('trims expired events (now ≥ at + ttl is gone; one ms earlier survives)', () => {
    const feed = [ev('old', 0), ev('edge', 1000), ev('live', 2000)];
    const out = captionFeed(feed, ev('new', 5000), 5000);
    // old: 0 + 4000 ≤ 5000 → dropped. edge: 1000 + 4000 ≤ 5000 → dropped too.
    // live: 2000 + 4000 > 5000 → survives.
    expect(out.map((e) => e.id)).toEqual(['live', 'new']);
  });

  it('drops a duplicate id while an unexpired event with that id lives in the feed', () => {
    const feed = [ev('echo-sense', 1000, 'first'), ev('other', 1500, 'kept')];
    const out = captionFeed(feed, ev('echo-sense', 2500, 'second'), 2500);
    expect(out).toEqual([ev('echo-sense', 1000, 'first'), ev('other', 1500, 'kept')]);
  });

  it('accepts the same id again once the previous one expired (and trims it)', () => {
    const feed = [ev('taal', 0, 'first')];
    const out = captionFeed(feed, ev('taal', 5000, 'second'), 5000);
    expect(out).toEqual([ev('taal', 5000, 'second')]);
  });

  it('never mutates the input array (a fresh array out)', () => {
    const feed = [ev('a', 1000)];
    const inputCopy = [...feed];
    const out = captionFeed(feed, ev('b', 1000), 1000);
    expect(feed).toEqual(inputCopy); // input untouched
    expect(out).not.toBe(feed); // and the result is a new array
  });
});

describe('captions — renderCaptions', () => {
  it('shows the latest two live events, newest last, joined by a newline', () => {
    const { el } = stubEl();
    renderCaptions(
      el,
      [ev('a', 0, 'first'), ev('b', 1000, 'second'), ev('c', 2000, 'third')],
      2500,
    );
    expect(el.textContent).toBe('second\nthird');
    expect(el.hidden).toBe(false);
  });

  it('an empty feed hides the bar', () => {
    const { el } = stubEl();
    renderCaptions(el, [], 1000);
    expect(el.hidden).toBe(true);
    expect(el.textContent).toBe('');
  });

  it('expired events do not render even if still in the feed (the bar empties itself)', () => {
    const { el } = stubEl();
    renderCaptions(el, [ev('a', 0, 'gone')], 4000); // 0 + 4000 ≤ 4000 → expired
    expect(el.hidden).toBe(true);
    expect(el.textContent).toBe('');
  });

  it('is churn-free: identical consecutive renders write textContent once', () => {
    const { el, writes } = stubEl();
    const feed = [ev('a', 1000, 'The glass sees you')];
    renderCaptions(el, feed, 1200);
    renderCaptions(el, feed, 1300);
    renderCaptions(el, feed, 1400);
    expect(writes()).toBe(1); // per-frame callers never churn the DOM
  });
});
