// SPDX-License-Identifier: Apache-2.0
//
// T12/T3 — the TOUCH e2e file: its own describe configured as a phone (390×844
// viewport, hasTouch). The desktop 50/50 smoke suite stays byte-untouched —
// this file ADDS the touch legs to the total (50 → 53 across files). The
// T1 collector gates on `pointerType === 'touch'`, and Playwright's
// `hasTouch` alone does not flip every pointer media query, so each test
// boots with the DEV-only `?ui=touch` session override (T2's ratified path —
// it forces the input mode for the visit and never touches the save) and
// drives real `PointerEvent(pointerType: 'touch')` dispatches at the window,
// the collector's attach point. Proven by T2's live checks; here it gates.

import { expect, test, type Page } from '@playwright/test';

/** The hook members this file reads — the full contract lives in smoke.spec.ts. */
interface TouchHook {
  getPlayer(): { x: number; y: number; heading: number };
  mode(): string;
  breath(): number;
  mirrors(): { captured: number };
  mirrorAt(kind: string): { x: number; z: number; cx: number; cy: number } | null;
  warp(x: number, y: number, heading?: number): void;
  minimap(): boolean;
}

const hook = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }).__MIRROR_HOUSE_DEBUG__;
    return { mode: h.mode(), minimap: h.minimap() };
  });

const player = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }).__MIRROR_HOUSE_DEBUG__;
    return h.getPlayer();
  });

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ !== undefined,
  );
}

/** Every test asserts a clean console: page errors AND console.error lines. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/**
 * One synthetic touch-pointer event at the window (the collector's attach
 * point). `pointerType: 'touch'` is the collector's whole gate — a desktop
 * mouse's pointer events never enter the touch state, so the dispatch must
 * carry it. No setPointerCapture exists in this path: the collector tracks
 * the pointer id manually, exactly as T1 shipped it.
 */
async function touchPointer(
  page: Page,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
  id = 7,
): Promise<void> {
  await page.evaluate(
    ({ type, x, y, id }) => {
      window.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'touch',
          pointerId: id,
          isPrimary: true,
          clientX: x,
          clientY: y,
          bubbles: true,
        }),
      );
    },
    { type, x, y, id },
  );
}

test.describe('touch — phone context (T12)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  // T12/T3 — the stick leg. At 390 px the left 45% boundary sits at 175.5 px
  // (classifyZone), so the down-point below is deep in the stick zone; the
  // 100 px upward push is 100/56 ≈ 1.79 normalized — past the clamp, a full
  // forward deflection (sprint-speed across the 600 ms hold). Lifting the
  // pointer zeroes the live vector — the player coasts to a stop, not a drift.
  test('touch: stick drag moves the player; lifting stops it', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?seed=TOUCHSTK&ui=touch');
    await ready(page);
    expect((await hook(page)).mode).toBe('touch'); // the override armed the mode

    const before = await player(page);
    await touchPointer(page, 'pointerdown', 80, 660);
    await touchPointer(page, 'pointermove', 80, 560); // full-up deflection, held
    await page.waitForTimeout(600); // the stick vector is live state — it steers the whole hold
    const after = await player(page);
    const moved = Math.hypot(after.x - before.x, after.y - before.y);
    expect(moved).toBeGreaterThan(0.5);

    await touchPointer(page, 'pointerup', 80, 560);
    // the lift's frame must LAND before the stop window opens: the position
    // read above and the up-event consumption are different ticks, and a
    // sprint-speed step or two can legally land between them. Settle first,
    // then measure the quiet window — drift there would be a real leak.
    await page.waitForTimeout(300);
    const settled = await player(page);
    await page.waitForTimeout(400);
    const stopped = await player(page);
    const drift = Math.hypot(stopped.x - settled.x, stopped.y - settled.y);
    expect(drift).toBeLessThan(0.05);
    expect(errors).toEqual([]);
  });

  // T12/T3 — the look leg (the brief's known-risk): the right 55% accumulates
  // raw look pixels (lookDx banks like mouseDx), and the frame loop converts
  // the drained bank at TOUCH_LOOK_SENS on the frame's first fixed step. A
  // 200 px leftward sweep is 200 × 0.0045 = 0.9 rad — far past the 0.1 rad
  // bar, and it moves nobody: look turns, it never walks.
  test('touch: right-half drag rotates the heading without stepping', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/?seed=TOUCHLOOK&ui=touch');
    await ready(page);

    const before = await player(page);
    await touchPointer(page, 'pointerdown', 380, 420); // x ≥ 175.5 → the look zone
    await touchPointer(page, 'pointermove', 310, 420);
    await touchPointer(page, 'pointermove', 240, 420);
    await touchPointer(page, 'pointermove', 180, 420); // −200 px of banked look
    await touchPointer(page, 'pointerup', 180, 420);
    await page.waitForTimeout(400); // the next frame drains the bank and turns

    const after = await player(page);
    const turned = after.heading - before.heading; // heading accumulates unnormalized
    expect(turned).toBeLessThan(-0.1); // leftward sweep → negative (left) turn, |Δ| = 0.9
    const stepped = Math.hypot(after.x - before.x, after.y - before.y);
    expect(stepped).toBeLessThan(0.05);
    expect(errors).toEqual([]);
  });

  // T12/T3 — the declutter + thumb-actions leg. 390 ≤ COMPACT_BREAKPOINT_PX,
  // so `body.compact` lands on width alone: the keys bar hides (no keys on a
  // phone) and the panes boot HIDDEN (panesDefault compact/touch) until the
  // dock's MAP chip summons the minimap. The FROST dock button then runs the
  // same tryFrost the F key does: warp 1 m in front of a beacon's glass, tap,
  // and the capture lands in the runtime — the full touch story on one floor.
  test('touch: compact declutter — MAP chip summons the minimap, FROST dock tap captures', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/?seed=TOUCHDOCK&ui=touch');
    await ready(page);

    // the declutter: compact on, keys bar gone, both panes booting hidden
    await expect(page.locator('body')).toHaveClass(/compact/);
    await expect(page.locator('#mh-keys')).toBeHidden();
    expect((await hook(page)).minimap).toBe(false);
    await expect(page.locator('#mh-minimap')).toBeHidden();

    // the MAP chip is the pane's thumb door — the canvas summons visible
    await page.locator('#mh-map').tap();
    await expect(page.locator('#mh-minimap')).toBeVisible();
    expect((await hook(page)).minimap).toBe(true);

    // the FROST dock tap: same verb as F. Stand 1 m in front of the beacon
    // glass (between the mirror and its cell center, like the desktop helper),
    // face it dead ahead, wait for the breath to afford a frost, tap, and the
    // capture lands in the runtime through the touch dock.
    const m = await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }).__MIRROR_HOUSE_DEBUG__;
      return h.mirrorAt('beacon');
    });
    expect(m, 'an uncaptured beacon exists').not.toBeNull();
    const d = Math.hypot(m!.cx - m!.x, m!.cy - m!.z); // mount offset: cell center → wall
    const sx = m!.x + ((m!.cx - m!.x) / d) * 1.0;
    const sz = m!.z + ((m!.cy - m!.z) / d) * 1.0;
    const heading = Math.atan2(m!.x - sx, -(m!.z - sz)); // heading 0 = north (−z)
    await page.waitForFunction(
      () =>
        (
          window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }
        ).__MIRROR_HOUSE_DEBUG__.breath() >= 0.34,
    );
    await page.evaluate(
      ({ sx, sz, heading }) => {
        const h = (
          window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }
        ).__MIRROR_HOUSE_DEBUG__;
        h.warp(sx, sz, heading);
      },
      { sx, sz, heading },
    );
    const capturedBefore = await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }).__MIRROR_HOUSE_DEBUG__;
      return h.mirrors().captured;
    });
    await page.locator('#mh-frost').tap();
    await page.waitForFunction(
      (n: number) =>
        (window as unknown as { __MIRROR_HOUSE_DEBUG__: TouchHook }).__MIRROR_HOUSE_DEBUG__.mirrors()
          .captured > n,
      capturedBefore,
    );
    expect(errors).toEqual([]);
  });
});
