// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

interface DebugHook {
  getPlayer(): { x: number; y: number; heading: number };
  seed: string;
  look(): string;
  mode(): string;
  mirrors: number;
  avatarPresent: boolean;
  streak(): number;
  bestFor(seed: string): number | null;
}
// page.evaluate results cannot carry functions across the process boundary,
// so the closure-backed members (look/mode/streak/best) are invoked in the
// browser and returned as a snapshot; `mode` is re-read per call, so a snapshot
// taken after a click reflects the current input mode.
const hook = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      seed: h.seed,
      look: h.look(),
      mode: h.mode(),
      mirrors: h.mirrors,
      avatarPresent: h.avatarPresent,
      streak: h.streak(),
      best: h.bestFor(h.seed),
    };
  });

test('loads a seeded floor, moves with W, no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?seed=PLAYTEST');

  await expect(page.locator('#game')).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ !== undefined,
  );
  const before = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );

  // spawn faces an open direction, so 0.6 s of walking must cover ground
  const moved = Math.hypot(after.x - before.x, after.y - before.y);
  expect(moved).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

test('same seed renders the same spawn', async ({ page }) => {
  await page.goto('/?seed=SAMESAME');
  const p = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.reload();
  const q = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  expect(q).toEqual(p);
});

test('step003: look param, mirrors at spawn, avatar present', async ({ page }) => {
  await page.goto('/?seed=MIRROR&look=teal-white');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__);
  const h = await hook(page);
  expect(h.look).toBe('teal-white');
  expect(h.mirrors).toBeGreaterThanOrEqual(2);
  expect(h.avatarPresent).toBe(true);
});

test('step003: mode buttons switch input mode', async ({ page }) => {
  await page.goto('/?seed=MODES');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__);
  await page.locator('#hud button[data-mode="keyboard"]').click();
  expect((await hook(page)).mode).toBe('keyboard');
  await page.locator('#hud button[data-mode="mouse"]').click();
  expect((await hook(page)).mode).toBe('mouse');
});

test('step003: FAQ opens with 12 entries and H toggles', async ({ page }) => {
  await page.goto('/?seed=FAQ');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__);
  await page.locator('#mh-faq').click();
  await expect(page.locator('#mh-faq-box details')).toHaveCount(12);
  await page.keyboard.press('KeyH'); // closes
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await page.keyboard.press('KeyH'); // reopens
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();
});

test('step003: meta starts fresh on a clean device', async ({ page }) => {
  // Playwright contexts are isolated, so localStorage starts empty
  await page.goto('/?seed=FRESH');
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__);
  const snap = await hook(page);
  expect(snap.streak).toBe(0);
  expect(snap.best).toBeNull();
});
