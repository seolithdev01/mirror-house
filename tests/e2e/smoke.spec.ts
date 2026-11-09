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
  // M3/T6 hooks — views, audio, Aaina's economy, fog of war
  view(): string;
  viewMode(): string;
  audioState(): { started: boolean; muted: boolean; intensity: number };
  grantShards(n: number): void;
  aaina(): { open: boolean; hintCost: number; lastHint: string | null };
  visitedCount(): number;
  // M4/T2 — the campaign spine (base seed, current floor, tier flag)
  campaign(): { base: string; floor: number; tierComplete: boolean };
  // M4/T6 — the live UI language (the ?lang=hi e2e reads it)
  lang(): string;
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
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.breath() >= 0.34,
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
  const before = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );

  // spawn faces an open direction, so 0.6 s of walking must cover ground
  const moved = Math.hypot(after.x - before.x, after.y - before.y);
  expect(moved).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

test('same seed renders the same spawn', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=SAMESAME');
  await ready(page); // boot is async now (M4/T4 save load) — wait for the hook
  const p = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
  );
  await page.reload();
  await ready(page);
  const q = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.getPlayer(),
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

test('step003: FAQ opens with 21 entries and H toggles', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=FAQ');
  await ready(page);
  await page.locator('#mh-faq').click();
  await expect(page.locator('#mh-faq-box details')).toHaveCount(21);
  await page.keyboard.press('KeyH'); // closes
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await page.keyboard.press('KeyH'); // reopens
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

test('sm: movement is paused behind the FAQ and resumes on close', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=PAUSED');
  await ready(page);
  const pos = () =>
    page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.getPlayer();
    });

  await page.locator('#mh-faq').click(); // open the overlay
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();

  const beforePause = await pos();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const duringPause = await pos();
  const drift = Math.hypot(duringPause.x - beforePause.x, duringPause.y - beforePause.y);
  expect(drift).toBeLessThan(0.05);

  await page.keyboard.press('KeyH'); // close
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();

  const beforeResume = await pos();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const afterResume = await pos();
  const moved = Math.hypot(afterResume.x - beforeResume.x, afterResume.y - beforeResume.y);
  expect(moved).toBeGreaterThan(0.5);
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
    return {
      left: h.beaconsLeft(),
      captured: h.mirrors().captured,
      unlocked: h.house().exitUnlocked,
    };
  });
  expect(mid.captured).toBe(1);
  expect(mid.left).toBe(total - 1);
  if (total > 1) expect(mid.unlocked).toBe(false);

  // capture the rest — ordering comes from mirrorAt('beacon'), never assumed
  while (
    (await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.beaconsLeft();
    })) > 0
  ) {
    await captureNextBeacon(page);
  }
  const end = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      left: h.beaconsLeft(),
      captured: h.mirrors().captured,
      fogged: h.mirrors().fogged,
      unlocked: h.house().exitUnlocked,
    };
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
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.enemyCount() > 0,
  );
  const pos = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.enemyPos(0);
  });
  expect(pos).not.toBeNull();
  await page.evaluate((p: { x: number; y: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(p.x, p.y);
  }, pos!);
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
  await page.evaluate((e: { x: number; z: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(e.x, e.z);
  }, exit);
  await expect(page.locator('#mh-cleared')).toBeVisible({ timeout: 5000 });
  const after = await page.evaluate((s: string) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { shards: h.shards(), best: h.bestFor(s), pending: h.house().pendingShards };
  }, 'M2WIN:1'); // M4/T2: bests bucket per floor — floor 1 of base M2WIN
  expect(after.shards).toBeGreaterThanOrEqual(15); // 3 × SHARD_BEACON banked on clear
  expect(after.best).not.toBeNull();
  expect(errors).toEqual([]);
});

test('m3: V cycles views and T pauses the floor', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=VTACTIC');
  await ready(page);
  const viewMode = () =>
    page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.viewMode(),
    );
  const pos = () =>
    page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.getPlayer(),
    );

  // [V] walks the cycle: focus → quad → overhead
  expect(await viewMode()).toBe('focus');
  await page.keyboard.press('KeyV');
  expect(await viewMode()).toBe('quad');
  await page.keyboard.press('KeyV');
  expect(await viewMode()).toBe('overhead');

  // T pauses from the overhead map; holding W cannot move the player
  await page.keyboard.press('KeyT');
  expect(await viewMode()).toBe('tactical');
  const frozenAt = await pos();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  const during = await pos();
  expect(Math.hypot(during.x - frozenAt.x, during.y - frozenAt.y)).toBeLessThan(0.05);

  // Esc resumes focus and the still-held W covers ground again
  await page.keyboard.press('Escape');
  expect(await viewMode()).toBe('focus');
  const resumedAt = await pos();
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  const after = await pos();
  expect(Math.hypot(after.x - resumedAt.x, after.y - resumedAt.y)).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

test('m3: audio starts on first gesture and M mutes', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=MUTEKEY');
  await ready(page);
  const audioState = () =>
    page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.audioState(),
    );

  const a0 = await audioState();
  expect(a0.started).toBe(false); // silent until a gesture
  expect(a0.muted).toBe(false); // a fresh save boots unmuted
  expect(a0.intensity).toBeGreaterThan(0); // the frame loop already feeds a calm 0.2

  await page.keyboard.press('KeyZ'); // any keydown is the gesture
  expect((await audioState()).started).toBe(true);

  await page.keyboard.press('KeyM');
  expect((await audioState()).muted).toBe(true);
  // the choice persists in the IDB save v2 (M4/T4; write-through debounced
  // 250ms) — read the store directly once the debounce window has closed
  await page.waitForTimeout(400);
  const saved = await page.evaluate(
    () =>
      new Promise<{ muted?: boolean } | null>((resolve) => {
        const req = indexedDB.open('mirror-house', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('save')) return resolve(null);
          const get = db.transaction('save', 'readonly').objectStore('save').get('main');
          get.onsuccess = () => resolve((get.result as { muted?: boolean } | undefined) ?? null);
        };
        req.onerror = () => resolve(null);
      }),
  );
  expect(saved?.muted).toBe(true);

  await page.keyboard.press('KeyM');
  expect((await audioState()).muted).toBe(false);

  // the HUD 🔊 button throws the same switch
  await page.locator('#mh-mute').click();
  expect((await audioState()).muted).toBe(true);
  await expect(page.locator('#mh-mute')).toHaveText(/🔇/);
  expect(errors).toEqual([]);
});

test('m3: aaina hint economy — buy, price grows, situation moves', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=AAINAQ');
  await ready(page);
  await page.evaluate((n: number) => {
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.grantShards(
      n,
    );
  }, 20);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.metaShards(),
    ),
  ).toBe(20);

  // open her panel ([Q]) and go to the Hint tab
  await page.keyboard.press('KeyQ');
  await expect(page.locator('#mh-aaina-overlay')).toBeVisible();
  await page.locator('#mh-aaina-tab-hint').click();
  let panel = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.aaina(),
  );
  expect(panel.open).toBe(true);
  expect(panel.hintCost).toBe(5);
  expect(panel.lastHint).toBeNull();

  // first buy: ◆5, the line is revealed, the purse drops to 15
  await page.locator('#mh-aaina-buy').click();
  panel = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.aaina(),
  );
  expect(panel.lastHint).not.toBeNull();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.metaShards(),
    ),
  ).toBe(15);

  // the bought line pins the Buy button until her subject changes: clear the
  // beacons and she moves on to the open stair door
  while (
    (await page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.beaconsLeft(),
    )) > 0
  ) {
    await captureNextBeacon(page);
  }

  // second buy: the floor's second hint costs ◆10, leaving ◆5
  panel = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.aaina(),
  );
  expect(panel.hintCost).toBe(10);
  await page.locator('#mh-aaina-buy').click();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.metaShards(),
    ),
  ).toBe(5);
  panel = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.aaina(),
  );
  expect(panel.lastHint).not.toBeNull();
  expect(errors).toEqual([]);
});

test('m3: overhead map shows and the fog of war grows', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=FOGMAP');
  await ready(page);
  const visitedCount = () =>
    page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.visitedCount(),
    );

  expect(await visitedCount()).toBe(1); // only the spawn cell is explored
  await expect(page.locator('#overhead')).toBeHidden(); // focus shows no map

  await page.keyboard.press('KeyV');
  await page.keyboard.press('KeyV'); // focus → quad → overhead
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.viewMode(),
    ),
  ).toBe('overhead');
  await expect(page.locator('#overhead')).toBeVisible();

  // warp to a far cell and walk — every cell entered joins the explored set
  const exit = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.exitPos(),
  );
  await page.evaluate((e: { x: number; z: number }) => {
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.warp(
      e.x,
      e.z,
    );
  }, exit);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  expect(await visitedCount()).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('m4: manifest + sw wiring', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=PWAWIRE');
  await expect(page.locator('#game')).toBeVisible();

  // the manifest is linked and the link actually resolves
  const manifestHref = await page.evaluate(() =>
    document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
  );
  expect(manifestHref).toBeTruthy();
  const res = await page.request.fetch(manifestHref!);
  expect(res.status()).toBe(200);

  // the OS chrome reads the house's night
  const theme = await page.evaluate(() =>
    document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  );
  expect(theme).toBe('#0b1026');

  // the favicon link points at the lantern glyph
  const icon = await page.evaluate(() =>
    document.querySelector('link[rel="icon"]')?.getAttribute('href'),
  );
  expect(icon).toBe('/icon.svg');
  const iconRes = await page.request.fetch(icon!);
  expect(iconRes.status()).toBe(200);

  // the SW registration is PROD-only: this suite runs the DEV server, so no
  // registration may exist (the honest dev-level offline-wiring assertion —
  // the real offline reload is proven against a PROD build in the task report).
  // NOTE: getRegistration() resolves `undefined` (not null) when none exists —
  // the SW spec's own hole — so falsy is the exact check.
  const reg = await page.evaluate(() =>
    navigator.serviceWorker ? navigator.serviceWorker.getRegistration() : null,
  );
  expect(reg).toBeFalsy();
  expect(errors).toEqual([]);
});

/** Clear floor 1 of `seed` the scripted way — start the run with one step,
 *  frost every beacon, then warp through the now-open stair door. Returns the
 *  exit position so callers can witness the fresh spawn against it. */
async function clearFloorOne(page: Page, seed: string): Promise<{ x: number; z: number }> {
  await page.goto(`/?seed=${seed}`);
  await ready(page);
  // the clear check needs a started run — one step starts the clock
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyW');
  while (
    (await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.beaconsLeft();
    })) > 0
  ) {
    await captureNextBeacon(page);
  }
  const exit = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.exitPos();
  });
  await page.evaluate((e: { x: number; z: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(e.x, e.z);
  }, exit);
  await expect(page.locator('#mh-cleared')).toBeVisible({ timeout: 5000 });
  return exit;
}

test('m4: descend to floor 2', async ({ page }) => {
  const errors = collectErrors(page);
  const exit = await clearFloorOne(page, 'DESCEND');

  // the 0.8s `descending…` hold elapses and floor 2 arms (buildFloor rebuilds)
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.campaign()
        .floor === 2,
  );
  const after = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      seed: h.seed,
      visited: h.visitedCount(),
      pending: h.house().pendingShards,
      beacons: h.house().beacons,
      player: h.getPlayer(),
    };
  });
  expect(after.seed).toBe('DESCEND:2'); // a fresh maze, one floor deeper
  expect(after.visited).toBe(1); // only the new floor's spawn cell is explored
  expect(after.pending).toBe(0); // the new floor stakes nothing yet
  expect(after.beacons.captured).toBe(0);
  expect(Math.hypot(after.player.x - exit.x, after.player.y - exit.z)).toBeGreaterThan(1); // a fresh spawn, not the old stair door
  await expect(page.locator('#mh-floor')).toHaveText('L02');
  await expect(page.locator('#mh-descend')).toBeHidden(); // the banner died with floor 1
  expect(errors).toEqual([]);
});

test('m4: save round-trip persists progress', async ({ page }) => {
  const errors = collectErrors(page);
  await clearFloorOne(page, 'ROUNDTRIP');
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.campaign()
        .floor === 2,
  );

  // The descend flushed with persist(true), but idbPut is async (open → tx →
  // commit) and fire-and-forget by design — this page's FIRST ever write must
  // even build the store. Wait for the store itself to show floor 2 before
  // leaving, or the reload could beat the commit and boot a fresh default.
  await page.waitForFunction(() =>
    new Promise<boolean>((resolve) => {
      const req = indexedDB.open('mirror-house', 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('save')) {
          db.close();
          return resolve(false);
        }
        const get = db.transaction('save', 'readonly').objectStore('save').get('main');
        get.onsuccess = () => {
          const row = get.result as { progress?: { floor?: number } } | undefined;
          db.close();
          resolve(row?.progress?.floor === 2);
        };
        get.onerror = () => {
          db.close();
          resolve(false);
        };
      };
      req.onerror = () => resolve(false);
    }),
  );

  // a fresh load WITHOUT any URL seed — the campaign must resume from IDB
  // (a seed in the URL would win the boot race and drag the player to floor 1)
  await page.goto('/');
  await ready(page);
  const resumed = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { campaign: h.campaign(), seed: h.seed, pending: h.house().pendingShards };
  });
  expect(resumed.campaign).toEqual({ base: 'ROUNDTRIP', floor: 2, tierComplete: false });
  expect(resumed.seed).toBe('ROUNDTRIP:2'); // floor 2 of the same base, rebuilt
  expect(resumed.pending).toBe(0);
  await expect(page.locator('#mh-floor')).toHaveText('L02');
  expect(errors).toEqual([]);
});

test('m4: hindi chrome via ?lang=hi', async ({ page }) => {
  const errors = collectErrors(page);
  // hi: the URL names it — mode buttons and chips render Devanagari
  await page.goto('/?lang=hi&seed=HINDII');
  await ready(page);
  expect(
    await page.evaluate(
      () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.lang(),
    ),
  ).toBe('hi');
  await expect(page.locator('#hud button[data-mode="hybrid"]')).toContainText('दोनों');
  await expect(page.locator('#mh-floor')).toContainText('स्तर');
  await expect(page.locator('#mh-shards')).toContainText('शार्ड');
  await expect(page.locator('#overhead')).toBeHidden(); // chrome only — the game boots in focus

  // en: the URL beats the now-saved hi — the default English chrome is intact
  await page.goto('/?seed=HINDII&lang=en');
  await ready(page);
  expect(
    await page.evaluate(
      () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.lang(),
    ),
  ).toBe('en');
  await expect(page.locator('#hud button[data-mode="hybrid"]')).toHaveText('⌨+🖱 Both');
  await expect(page.locator('#mh-floor')).toHaveText('L01');
  expect(errors).toEqual([]);
});
