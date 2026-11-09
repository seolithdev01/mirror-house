// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';

interface DebugHook {
  getPlayer(): { x: number; y: number; heading: number };
  seed: string;
  look(): string;
  mode(): string;
  mirrors(): { total: number; fogged: number; captured: number };
  avatarPresent: boolean;
  streak(): number;
  bestFor(seed: string): number | null;
  breath(): number;
  echoes(): Array<{ id: number; x: number; y: number; mode: string }>;
  chhaya(): { x: number; y: number } | null;
  house(): {
    anger: number;
    attempts: number;
    pendingShards: number;
    crackedAny: boolean;
    beacons: { captured: number; total: number };
    exitUnlocked: boolean;
    failed: boolean;
  };
  metaShards(): number;
  fail(reason: string): void;
  fogTarget(): number | null;
  canStepThrough(): boolean;
  stepThrough(): void;
  doorTarget(): number | null;
  pushDoor(): void;
  doorsOpened(): number[];
  mirrorRefs(): unknown[];
  mirrorRuntime(): unknown[];
  canWalk(x: number, y: number, d: number): boolean;
  // T8 hooks — scripted win/lose
  beaconsLeft(): number;
  anger(): number;
  shards(): number;
  attempts(): number;
  enemyCount(): number;
  enemyPos(i: number): { x: number; y: number } | null;
  chhayaPos(): { x: number; y: number } | null;
  mirrorAt(kind: string): {
    x: number;
    z: number;
    id: number;
    kind: string;
    cellX: number;
    cellY: number;
    cx: number;
    cy: number;
  } | null;
  exitPos(): { x: number; z: number };
  warp(x: number, y: number, heading?: number): void;
  addAnger(n: number): void;
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
      mirrors: h.mirrors(),
      avatarPresent: h.avatarPresent,
      streak: h.streak(),
      best: h.bestFor(h.seed),
    };
  });

/** Every test asserts a clean console: page errors AND console.error lines. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Wait for the dev hook to exist (module script has run). */
async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__MIRROR_HOUSE_DEBUG__ !== undefined,
  );
}

/**
 * Capture the next uncaptured beacon: warp to a spot 1m in front of the glass
 * (between the mirror and its own cell center, so the stand point is always
 * inside the room whatever wall the beacon mounted on), face it dead ahead —
 * nearest mirror in the 60° cone wins, and at 1m that is always the beacon —
 * wait for enough breath (frost costs 0.34, recharge is 0.25/s), press F, and
 * wait for the capture to land in the runtime.
 */
async function captureNextBeacon(page: Page): Promise<void> {
  const m = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrorAt('beacon');
  });
  expect(m, 'an uncaptured beacon exists').not.toBeNull();
  const d = Math.hypot(m!.cx - m!.x, m!.cy - m!.z); // mount offset: cell center → wall
  const sx = m!.x + ((m!.cx - m!.x) / d) * 1.0;
  const sz = m!.z + ((m!.cy - m!.z) / d) * 1.0;
  const heading = Math.atan2(m!.x - sx, -(m!.z - sz)); // heading 0 = north (−z)
  const before = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrors().captured;
  });
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__
        .breath() >= 0.34,
  );
  await page.evaluate(
    ({ sx, sz, heading }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      h.warp(sx, sz, heading);
    },
    { sx, sz, heading },
  );
  await page.keyboard.press('KeyF');
  await page.waitForFunction(
    (n: number) =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.mirrors()
        .captured > n,
    before,
  );
}

test('loads a seeded floor, moves with W, no page errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=PLAYTEST');

  await expect(page.locator('#game')).toBeVisible();
  await ready(page);
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
  const errors = collectErrors(page);
  await page.goto('/?seed=SAMESAME');
  const p = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.reload();
  const q = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  expect(q).toEqual(p);
  expect(errors).toEqual([]);
});

test('step003: look param, mirrors at spawn, avatar present', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=MIRROR&look=teal-white');
  await ready(page);
  const h = await hook(page);
  expect(h.look).toBe('teal-white');
  expect(h.mirrors.total).toBeGreaterThanOrEqual(2);
  expect(h.avatarPresent).toBe(true);
  expect(errors).toEqual([]);
});

test('step003: mode buttons switch input mode', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=MODES');
  await ready(page);
  await page.locator('#hud button[data-mode="keyboard"]').click();
  expect((await hook(page)).mode).toBe('keyboard');
  await page.locator('#hud button[data-mode="mouse"]').click();
  expect((await hook(page)).mode).toBe('mouse');
  expect(errors).toEqual([]);
});

test('step003: FAQ opens with 16 entries and H toggles', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=FAQ');
  await ready(page);
  await page.locator('#mh-faq').click();
  await expect(page.locator('#mh-faq-box details')).toHaveCount(16);
  await page.keyboard.press('KeyH'); // closes
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await page.keyboard.press('KeyH'); // reopens
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

test('step003: meta starts fresh on a clean device', async ({ page }) => {
  const errors = collectErrors(page);
  // Playwright contexts are isolated, so localStorage starts empty
  await page.goto('/?seed=FRESH');
  await ready(page);
  const snap = await hook(page);
  expect(snap.streak).toBe(0);
  expect(snap.best).toBeNull();
  expect(errors).toEqual([]);
});

test('m2: frost captures a beacon and unlocks gating', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=BEACONS');
  await ready(page);
  const total = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.house().beacons.total;
  });
  expect(total).toBeGreaterThanOrEqual(1);
  const fogged0 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrors().fogged;
  });

  // first capture: captured +1, one beacon fewer left, gate still sealed
  await captureNextBeacon(page);
  const mid = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { left: h.beaconsLeft(), captured: h.mirrors().captured, unlocked: h.house().exitUnlocked };
  });
  expect(mid.captured).toBe(1);
  expect(mid.left).toBe(total - 1);
  if (total > 1) expect(mid.unlocked).toBe(false);

  // capture the rest — ordering comes from mirrorAt('beacon'), never assumed
  while ((await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.beaconsLeft();
  })) > 0) {
    await captureNextBeacon(page);
  }
  const end = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { left: h.beaconsLeft(), captured: h.mirrors().captured, fogged: h.mirrors().fogged, unlocked: h.house().exitUnlocked };
  });
  expect(end.left).toBe(0);
  expect(end.captured).toBe(total);
  expect(end.fogged).toBeGreaterThanOrEqual(fogged0 + total); // captures count as fogged
  expect(end.unlocked).toBe(true);
  expect(errors).toEqual([]);
});

test('m2: caught by an echo restarts the floor', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=CAUGHT');
  await ready(page);
  const spawn = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.getPlayer();
  });
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.enemyCount() >
      0,
  );
  const pos = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.enemyPos(0);
  });
  expect(pos).not.toBeNull();
  await page.evaluate(
    (p: { x: number; y: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      h.warp(p.x, p.y);
    },
    pos!,
  );
  await expect(page.locator('#mh-fail')).toBeVisible();
  await expect(page.locator('#mh-fail')).toHaveText('Caught by the glass');
  // FAIL_FREEZE_MS is 1200ms; +margin → resetFloor has re-armed the floor
  await page.waitForTimeout(1600);
  const after = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { attempts: h.attempts(), failed: h.house().failed, player: h.getPlayer() };
  });
  expect(after.attempts).toBe(1);
  expect(after.failed).toBe(false);
  expect(Math.hypot(after.player.x - spawn.x, after.player.y - spawn.y)).toBeLessThan(0.01);
  expect(after.player.heading).toBe(spawn.heading);
  expect(errors).toEqual([]);
});

test('m2: house collapse at 100 anger', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=COLLAPSE');
  await ready(page);
  expect(
    await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.anger();
    }),
  ).toBe(0);
  await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.addAnger(100); // straight to ANGER_MAX — the house comes down
  });
  await expect(page.locator('#mh-fail')).toBeVisible();
  await expect(page.locator('#mh-fail')).toHaveText('The mirrors collapsed');
  await page.waitForTimeout(1600); // past FAIL_FREEZE_MS → resetFloor
  const after = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { attempts: h.attempts(), anger: h.anger(), failed: h.house().failed };
  });
  expect(after.attempts).toBe(1);
  expect(after.failed).toBe(false);
  expect(after.anger).toBe(0); // the house calms when the floor re-arms
  expect(errors).toEqual([]);
});

test('m2: full win flow records shards and best', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=M2WIN');
  await ready(page);
  // the clear check needs a started run — take one step first
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyW');
  const total = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.house().beacons.total;
  });
  for (let i = 0; i < total; i++) await captureNextBeacon(page);
  expect(
    await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.beaconsLeft();
    }),
  ).toBe(0);
  const exit = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.exitPos();
  });
  await page.evaluate(
    (e: { x: number; z: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      h.warp(e.x, e.z);
    },
    exit,
  );
  await expect(page.locator('#mh-cleared')).toBeVisible({ timeout: 5000 });
  const after = await page.evaluate((s: string) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { shards: h.shards(), best: h.bestFor(s), pending: h.house().pendingShards };
  }, 'M2WIN');
  expect(after.shards).toBeGreaterThanOrEqual(15); // 3 × SHARD_BEACON banked on clear
  expect(after.best).not.toBeNull();
  expect(errors).toEqual([]);
});
