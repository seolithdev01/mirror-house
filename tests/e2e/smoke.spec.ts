// SPDX-License-Identifier: Apache-2.0
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

interface DebugHook {
  getPlayer(): { x: number; y: number; heading: number };
  seed: string;
  look(): string;
  mode(): string;
  mirrors(): { total: number; fogged: number; captured: number; portraits: number };
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
  // T2/T4 — the tier the stage is dressed in (venue side-floors read 1)
  tier(): 1 | 2 | 3;
  // T2/T4 — the Sentinel's exact spot for warps (null off his floors)
  taalPos(): { x: number; y: number } | null;
  // M6/T1 — the venue side-floor: which pack is live (null id = campaign
  // floor) and its floor's beacon total (the pack's own count).
  venue(): { active: boolean; id: string | null; beacons: number };
  // M4/T6 — the live UI language (the ?lang=hi e2e reads it)
  lang(): string;
  // M5/T1 — the live a11y block (the ⚙ overlay's writes land here for e2e)
  a11y(): {
    reducedFlash: boolean;
    captions: boolean;
    textScale: number;
    keyMap: Record<string, string>;
  };
  // M5/T3 — the live caption feed behind the bottom bar
  captions(): Array<{ id: string; text: string }>;
  // M5/T4 — the quality state: the ?perf= e2e reads preset + the RT census
  perf(): {
    choice: string;
    preset: string;
    profile: { pixelRatioCap: number; heroRt: boolean; heroRtSize: number; chhayaBob: boolean };
    fpsAvg: number | null;
    pixelRatio: number;
    heroRt: number;
    trueRt: number;
  };
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

test('step003: FAQ opens with 31 entries and H toggles', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=FAQ');
  await ready(page);
  await page.locator('#mh-faq').click();
  await expect(page.locator('#mh-faq-box details')).toHaveCount(31);
  await page.keyboard.press('KeyH'); // closes
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await page.keyboard.press('KeyH'); // reopens
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

// step007/T1 — the About panel: the small ⓘ beside 🌐 opens it (and the ⚙
// entry stacks it on top of Settings — Escape peels exactly that layer, the
// M6/T4 stack contract holding with the new overlay in it). The version line
// carries the vite-injected package version (never a raw {v} token), and the
// four launch links are absolute https URLs to the public repo.
test('beta: About opens via ⓘ beside 🌐, shows version + links, stacks over ⚙', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=ABOUTPNL');
  await ready(page);

  // the ⓘ sits beside 🌐 and opens the panel
  await expect(page.locator('#mh-lang + #mh-about')).toHaveCount(1);
  await page.locator('#mh-about').click();
  await expect(page.locator('#mh-about-overlay')).toBeVisible();

  // version (vite define → package.json's version; never the raw token)
  await expect(page.locator('#mh-about-version')).toContainText(/Version \S+/);
  await expect(page.locator('#mh-about-version')).not.toContainText('{v}');

  // the four launch links, absolute and direct
  const hrefs = await page
    .locator('#mh-about-links a')
    .evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
  expect(hrefs).toEqual([
    'https://github.com/seolithdev01/mirror-house',
    'https://github.com/seolithdev01/mirror-house/blob/main/PRIVACY.md',
    'https://github.com/seolithdev01/mirror-house/blob/main/PROVENANCE.md',
    'https://github.com/seolithdev01/mirror-house/blob/main/LICENSE',
  ]);

  // Escape closes (the trap); the ⚙ entry opens it AGAIN — stacked on ⚙
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-about-overlay')).toBeHidden();
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  await page.locator('#mh-settings-about').click();
  await expect(page.locator('#mh-about-overlay')).toBeVisible();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();

  // one Escape peels only About; the next unwinds ⚙
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-about-overlay')).toBeHidden();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-settings-overlay')).toBeHidden();
  expect(errors).toEqual([]);
});

// step007/T2 — the 📮 feedback composer: opens from the HUD button beside ⓘ
// with the diagnostics block already IN the textarea (the seed line above
// all — the player reviews exactly what will be sent), the GitHub exit is a
// real anchor whose href is the repo's new-issue URL with the template and
// the URL-encoded body (newlines as %0A), the email exit is the mailto
// fallback to the support alias, typing retargets the hrefs live, the floor
// pauses behind the composer (an FAQ-class pause), and Escape peels it.
test('beta: 📮 composer opens with diagnostics prefilled; GitHub/mailto hrefs composed and encoded', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=FEEDBCK');
  await ready(page);

  // 📮 sits beside ⓘ and opens the composer
  await expect(page.locator('#mh-about + #mh-feedback')).toHaveCount(1);
  await page.locator('#mh-feedback').click();
  await expect(page.locator('#mh-feedback-overlay')).toBeVisible();

  // the textarea IS the message: prompt + diagnostics with the seed line
  const body = await page.locator('#mh-feedback-body').inputValue();
  expect(body).toContain('seed: FEEDBCK:1');
  expect(body).toContain('game: Mirror House v');
  expect(body).toContain('userAgent: ');

  // the GitHub exit: repo new-issue URL, the bug template, from-game label,
  // and the body URL-encoded (raw %0A) and decodable back to the textarea
  const gh = await page.locator('#mh-feedback-github').getAttribute('href');
  expect(gh!.startsWith('https://github.com/seolithdev01/mirror-house/issues/new?')).toBe(true);
  expect(gh).toContain('%0A'); // encoded, never bare newlines
  const ghParams = new URLSearchParams(gh!.slice(gh!.indexOf('?') + 1));
  expect(ghParams.get('template')).toBe('bug_report.md');
  expect(ghParams.get('labels')).toBe('from-game,feedback');
  expect(ghParams.get('body')).toContain('seed: FEEDBCK:1');

  // the email exit: mailto the support alias with the same body
  const mail = await page.locator('#mh-feedback-email').getAttribute('href');
  expect(mail!.startsWith('mailto:itsupport01@seolith.com?')).toBe(true);
  const mailParams = new URLSearchParams(mail!.slice(mail!.indexOf('?') + 1));
  expect(mailParams.get('body')).toContain('seed: FEEDBCK:1');

  // typing retargets the exits live: a title lands in the issue title param —
  // and the title deliberately presses game keys (T-h-e …: T is tactical, H
  // is FAQ, M is mute, V is view) while focused in the text field: the
  // dispatch's text-field guard must eat them all, or the FAQ would now be
  // open over the composer.
  await page.locator('#mh-feedback-summary').fill('The stair door never unlocked');
  const gh2 = await page.locator('#mh-feedback-github').getAttribute('href');
  expect(new URLSearchParams(gh2!.slice(gh2!.indexOf('?') + 1)).get('title')).toBe(
    'The stair door never unlocked',
  );
  expect(page.locator('#mh-faq-overlay')).toBeHidden(); // H was eaten by the guard
  await expect(page.locator('#mh-feedback-overlay')).toBeVisible(); // still the top layer

  // the floor pauses behind the composer — a held W moves nobody
  const pos = () =>
    page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.getPlayer(),
    );
  const frozenAt = await pos();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  const during = await pos();
  expect(Math.hypot(during.x - frozenAt.x, during.y - frozenAt.y)).toBeLessThan(0.05);

  // Escape peels the composer (the dialog trap)
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-feedback-overlay')).toBeHidden();

  // and the ⚙ entry is the second door: stacked on top of ⚙
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  await page.locator('#mh-settings-feedback').click();
  await expect(page.locator('#mh-feedback-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

// step007/T3 — tester mode: `?test=1` unlocks the TESTER chip + the one-time
// banner (and the diagnostics hook in PROD — this dev-level suite always has
// the hook, so the PROD exposure is proven by the task report's preview
// probe; here the assertion is the tester SURFACES plus the chip's text
// agreeing with the hook's seed getter). A default load and the explicit
// `?test=0` reset carry NEITHER element — the tester surfaces must never
// leak into the default experience.
test('beta: ?test=1 shows the TESTER chip + banner; default and ?test=0 carry neither', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=TESTMO&test=1');
  await ready(page);

  // the chip names the mode, the live fps, and the seed — which already
  // encodes base:floor (TESTMO:1) — and the hook's seed getter agrees
  const chip = page.locator('#mh-tester');
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('TESTER');
  await expect(chip).toContainText('TESTMO:1');
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.seed,
    ),
  ).toBe('TESTMO:1');

  // the one-time banner says what just unlocked
  await expect(page.locator('#mh-tester-banner')).toBeVisible();
  await expect(page.locator('#mh-tester-banner')).toContainText('TESTER MODE');

  // a default load: no chip, no banner — the elements do not exist at all
  await page.goto('/?seed=TESTMO');
  await ready(page);
  await expect(page.locator('#mh-tester')).toHaveCount(0);
  await expect(page.locator('#mh-tester-banner')).toHaveCount(0);

  // ?test=0 is the explicit reset — still nothing
  await page.goto('/?seed=TESTMO&test=0');
  await ready(page);
  await expect(page.locator('#mh-tester')).toHaveCount(0);
  await expect(page.locator('#mh-tester-banner')).toHaveCount(0);
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

  // open her panel ([I] — M5/T1 moved her off Q; Q/E are pure turning) and go
  // to the Hint tab
  await page.keyboard.press('KeyI');
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
  await page.waitForFunction(
    () =>
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

test('m5: rebind forward to P through the settings overlay', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=REBINDP');
  await ready(page);
  const pos = () =>
    page.evaluate(() =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.getPlayer(),
    );

  // ⚙ → Controls: click the forward row → the capture arms ("press a key…") →
  // the next keydown (P) is taken by the rebind, never by the game
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  await page.locator('.mh-key-btn[data-action="forward"]').click();
  await expect(page.locator('.mh-key-btn[data-action="forward"]')).toHaveText(/press a key/i);
  await page.keyboard.press('KeyP');
  await expect(page.locator('.mh-key-btn[data-action="forward"]')).toHaveText('P');
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.a11y()
          .keyMap.forward,
    ),
  ).toBe('KeyP'); // the live map carries the rebind
  await page.locator('#mh-settings-close').click();
  await expect(page.locator('#mh-settings-overlay')).toBeHidden();

  // P now walks; the abandoned default W is dead
  const before = await pos();
  await page.keyboard.down('KeyP');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyP');
  const afterP = await pos();
  expect(Math.hypot(afterP.x - before.x, afterP.y - before.y)).toBeGreaterThan(0.5);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyW');
  const afterW = await pos();
  expect(Math.hypot(afterW.x - afterP.x, afterW.y - afterP.y)).toBeLessThan(0.05);
  expect(errors).toEqual([]);
});

// M5 final review — the merge-gate proof: a focused dialog control owns its
// activation keys. Opening ⚙ lands focus on the first control (the trap), Tab
// walks to the reduced-flash checkbox, and Space must TOGGLE it — the step
// key's dispatch (and its preventDefault) stands down for the focused control.
test('m5: Space toggles the focused checkbox in ⚙ (dialog keys stand down)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=KBDTOG');
  await ready(page);
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  const box = page.locator('#mh-settings-reduced-flash');
  await expect(box).not.toBeChecked(); // a fresh save boots with it off
  // the trap focuses the first control (the 100% text-scale radio); ONE Tab
  // reaches the checkbox — the unchecked scale radios are skipped (a radio
  // group's checked member is its only tab stop)
  await page.keyboard.press('Tab');
  await expect(box).toBeFocused();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked(); // the checkbox owns the key — proof
  expect(errors).toEqual([]);
});

test('m4: hindi chrome via ?lang=hi', async ({ page }) => {
  const errors = collectErrors(page);
  // hi: the URL names it — mode buttons and chips render Devanagari
  await page.goto('/?lang=hi&seed=HINDII');
  await ready(page);
  expect(
    await page.evaluate(() =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.lang(),
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
    await page.evaluate(() =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.lang(),
    ),
  ).toBe('en');
  await expect(page.locator('#hud button[data-mode="hybrid"]')).toHaveText('⌨+🖱 Both');
  await expect(page.locator('#mh-floor')).toHaveText('L01');
  expect(errors).toEqual([]);
});

test('m5: ?perf=low boots the low path — preset low, hero RT off, mirrors render, no crash', async ({
  page,
}) => {
  const errors = collectErrors(page);
  // The DEV ?perf= param pins the low preset for this visit: the hook reports
  // it, the hero mirrors took the no-RT path (heroRt 0 — the entrance/exit
  // stand-ins render the fake reflective material), the ratio is capped at 1,
  // and the game keeps running clean on the low-end path.
  await page.goto('/?perf=low&seed=PERFLOW');
  await ready(page);
  const perf = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.perf(),
  );
  expect(perf.preset).toBe('low');
  expect(perf.choice).toBe('low'); // the override is the live choice
  expect(perf.profile).toEqual({
    pixelRatioCap: 1,
    heroRt: false,
    heroRtSize: 256,
    chhayaBob: false,
  });
  expect(perf.heroRt).toBe(0); // no hero render targets — the stand-in witness
  expect(perf.pixelRatio).toBeLessThanOrEqual(1); // cap 1: min(dpr, 1)

  // the floor still dresses itself — the two hero spots stand as mirrors and
  // the frame loop renders on without a crash
  const mirrors = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.mirrors(),
  );
  expect(mirrors.total).toBeGreaterThanOrEqual(2); // the hero spots at minimum
  await page.waitForTimeout(700); // a stretch of low-preset frames
  expect(errors).toEqual([]);
});

// M5/T6 — the save round-trip through the REAL file system: 💾 takes the
// <a download> fallback (a Playwright download event carries the file to
// disk), the JSON on disk is validated against the save v2 shape, then a
// rewritten copy with a DISTINCT campaign + purse comes back through 📂's
// hidden <input type=file> fallback (a filechooser we feed directly — the
// FS Access picker path cannot be driven programmatically). The import
// reloads to the bare path and the boot chain resumes the imported campaign.
test('m5: export/import round-trip through a real file', async ({ page }) => {
  const errors = collectErrors(page);
  // Shadow both File System Access pickers with own undefined properties —
  // `typeof picker === 'function'` goes false and both flows take the
  // fallbacks Playwright can see (delete would not: they live on the
  // prototype).
  await page.addInitScript(() => {
    for (const name of ['showSaveFilePicker', 'showOpenFilePicker'])
      Object.defineProperty(window, name, { value: undefined, configurable: true });
  });
  await page.goto('/?seed=EXPIMP');
  await ready(page);

  // 💾 → the download event lands the save file on disk
  const dlPromise = page.waitForEvent('download');
  await page.locator('#mh-export').click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toBe('mirror-house-save.json');
  const onDisk = await dl.path();
  expect(onDisk, 'the browser wrote the file').not.toBeNull();
  const exported = JSON.parse(readFileSync(onDisk!, 'utf8')) as Record<string, unknown>;

  // the file is gameplay data only, in the exact save v2 shape. The campaign
  // record keeps the SAVE's base (a ?seed= URL visit never rewrites it), so
  // assert the shape and the seed alphabet, not the visit's code.
  expect(exported.v).toBe(2);
  expect(exported.progress).toMatchObject({ floor: 1, tierComplete: false });
  expect(String((exported.progress as Record<string, unknown>).seedBase)).toMatch(
    /^[A-Z2-9]{1,16}$/,
  );
  for (const key of [
    'lookName',
    'mode',
    'muted',
    'lang',
    'shards',
    'best',
    'streak',
    'a11y',
    'perf',
  ])
    expect(exported[key], `save field ${key}`).toBeDefined();

  // rewrite: a distinct campaign (base IMPRT2, floor 3) and a distinct purse
  const imported = structuredClone(exported);
  imported.progress = { seedBase: 'IMPRT2', floor: 3, tierComplete: false };
  imported.shards = 777;
  const tmp = join(tmpdir(), `mh-roundtrip-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify(imported));
  try {
    // 📂 → the fallback input's filechooser takes the rewritten file
    const fcPromise = page.waitForEvent('filechooser');
    await page.locator('#mh-import').click();
    const fc = await fcPromise;
    await fc.setFiles(tmp);

    // the import reloads to the bare path (M5/T5) and boots the imported save
    await page.waitForURL((u) => !u.href.includes('seed='));
    await ready(page);
    const after = await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return { campaign: h.campaign(), shards: h.shards(), seed: h.seed };
    });
    expect(after.campaign).toEqual({ base: 'IMPRT2', floor: 3, tierComplete: false });
    expect(after.shards).toBe(777); // the distinct purse proves the import landed
    expect(after.seed).toBe('IMPRT2:3'); // floor 3 of the imported base, rebuilt
    await expect(page.locator('#mh-floor')).toHaveText('L03');
  } finally {
    rmSync(tmp, { force: true });
  }
  expect(errors).toEqual([]);
});

// M5/T6 — restart timing: warp onto an Echo (contact), then measure wall
// clock until the player stands back at the spawn with the floor re-armed.
// The budget is ≤ 2000ms: FAIL_FREEZE_MS holds input 1200ms and the frame
// loop's failing-phase check re-arms on the first frame past resetAt.
// M6/T1 — the venue SIDE-FLOOR end to end: `?venue=` boots the DEMO pack's
// floor (banner names the pack, the hook carries its beacon count, the seed
// is the pack's daily code), clearing it banks NOTHING (the campaign-
// isolation invariant), and the return rebuilds the campaign floor at the
// exact floor it left — campaign(), seed, and chip restored. The ⚙ Floors
// section's single button then plays the demo floor and returns, both ways.
test('m6: venue demo floor loads and returns', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=VENUEDMO&venue=demo-glasshouse-cafe');
  await ready(page); // boot fetches + validates the pack before the hook lands

  // the banner names the pack; the hook carries the pack's shape
  await expect(page.locator('#mh-venue')).toBeVisible();
  await expect(page.locator('#mh-venue')).toContainText('Glasshouse Café');
  const v0 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { venue: h.venue(), campaign: h.campaign(), seed: h.seed };
  });
  expect(v0.venue).toEqual({ active: true, id: 'demo-glasshouse-cafe', beacons: 2 });
  expect(v0.campaign.floor).toBe(1); // the campaign spine is untouched underneath
  expect(v0.seed).toMatch(/^[A-Z2-9]{8}$/); // the pack's daily code, charset-valid

  // clear the side-floor the scripted way — start the run, frost the 2
  // beacons, walk through the now-open door
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyW');
  const shardsBefore = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.shards();
  });
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
  await expect(page.locator('#mh-cleared')).toContainText('return via ⚙');

  // the isolation invariant: a cleared sponsored floor banked nothing — no
  // shards, no best for the venue seed, no campaign motion
  const cleared = await page.evaluate((s: string) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { shards: h.shards(), best: h.bestFor(s), campaign: h.campaign() };
  }, v0.seed);
  expect(cleared.shards).toBe(shardsBefore);
  expect(cleared.best).toBeNull();
  expect(cleared.campaign.floor).toBe(1);

  // the banner's return: the campaign floor REBUILDS at the same floor number
  await page.locator('#mh-venue-return').click();
  await expect(page.locator('#mh-venue')).toBeHidden();
  const back = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { venue: h.venue(), campaign: h.campaign(), seed: h.seed };
  });
  expect(back.venue).toEqual({ active: false, id: null, beacons: 0 });
  expect(back.campaign).toEqual({ base: 'VENUEDMO', floor: 1, tierComplete: false });
  expect(back.seed).toBe('VENUEDMO:1');
  await expect(page.locator('#mh-floor')).toHaveText('L01');

  // the ⚙ Floors button plays the demo floor… and returns — both ways
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  await expect(page.locator('#mh-settings-venue')).toContainText(/play/i);
  await page.locator('#mh-settings-venue').click();
  await page.locator('#mh-settings-close').click();
  await expect(page.locator('#mh-venue')).toBeVisible();
  expect(
    (
      await page.evaluate(() => {
        const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
          .__MIRROR_HOUSE_DEBUG__;
        return h.venue();
      })
    ).active,
  ).toBe(true);
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-venue')).toContainText(/return/i);
  await page.locator('#mh-settings-venue').click();
  await page.locator('#mh-settings-close').click();
  await expect(page.locator('#mh-venue')).toBeHidden();
  expect(
    await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.venue().active;
    }),
  ).toBe(false);
  expect(errors).toEqual([]);
});

// M5/T6 — restart timing: warp onto an Echo (contact), then measure wall
// clock until the player stands back at the spawn with the floor re-armed.
// The budget is ≤ 2000ms: FAIL_FREEZE_MS holds input 1200ms and the frame
// loop's failing-phase check re-arms on the first frame past resetAt.
test('m5: warp-caught restart returns the player to spawn within 2000ms', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=RESTART');
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
  const echo = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.enemyPos(0);
  });
  expect(echo).not.toBeNull();

  // CONTACT — warp straight onto the Echo; the next fixed step fails the run
  await page.evaluate((p: { x: number; y: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(p.x, p.y);
  }, echo!);
  const t0 = Date.now();
  // the catch itself must land promptly (a fixed step is 50ms) — the fail
  // banner rises while the freeze holds
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.house()
        .failed,
    null,
    { timeout: 1000 },
  );
  await expect(page.locator('#mh-fail')).toBeVisible();

  // …then the freeze ends, resetFloor re-arms, and the player is back at the
  // spawn (position AND heading), polled every animation frame
  await page.waitForFunction(
    (s: { x: number; y: number; heading: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      const p = h.getPlayer();
      return (
        !h.house().failed &&
        Math.hypot(p.x - s.x, p.y - s.y) < 0.01 &&
        Math.abs(p.heading - s.heading) < 0.01
      );
    },
    spawn,
    { timeout: 2500 },
  );
  const restartMs = Date.now() - t0;
  const after = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { attempts: h.attempts(), failed: h.house().failed };
  });
  expect(after.attempts).toBe(1);
  expect(after.failed).toBe(false);
  expect(restartMs, 'contact → back at spawn').toBeLessThanOrEqual(2000);
  expect(errors).toEqual([]);
});

// M6/T4 — the M5 carried minors, together (both live on the ⚙ overlay):
// (a) dialogs stack — ⚙ open, then H opens the FAQ on top of it — and one
// Escape peels exactly the TOPMOST layer, leaving the dialog under it open;
// the next press unwinds the next. (b) while ⚙ is open its radios own the
// arrows natively (a focused radio walks its group on Arrow*), so the
// hardwired arrow alternates leave the movement snapshot — the player stands
// down — and walking returns the moment the overlay closes.
test('m6: Escape closes only the topmost dialog; arrows stand down while ⚙ is open', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=DIALOGS');
  await ready(page);
  const pos = () =>
    page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.getPlayer();
    });

  // (a) the stack: ⚙ open, then H opens the FAQ above it — both live at once
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  await page.keyboard.press('KeyH');
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();

  // one Escape peels ONLY the topmost (the FAQ); ⚙ survives underneath
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();

  // the second press unwinds the next layer — the stack empties in order
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-settings-overlay')).toBeHidden();

  // (b) arrows: ⚙ open (focus on its first radio) → the radios own Arrow*,
  // the player stands down even with the key held
  await page.locator('#mh-settings').click();
  await expect(page.locator('#mh-settings-overlay')).toBeVisible();
  const before = await pos();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowUp');
  const during = await pos();
  expect(Math.hypot(during.x - before.x, during.y - before.y)).toBeLessThan(0.05);

  // close (✕) — the hardwired arrows move the player again
  await page.locator('#mh-settings-close').click();
  await expect(page.locator('#mh-settings-overlay')).toBeHidden();
  const beforeWalk = await pos();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowUp');
  const afterWalk = await pos();
  expect(Math.hypot(afterWalk.x - beforeWalk.x, afterWalk.y - beforeWalk.y)).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

// M6/T4 (T1 adjudication) — Aaina stays in the campaign: on a venue floor the
// hint sale is refused outright — the purse untouched, no purchased line, no
// price growth — and the toast names the way back to her.
test('m6: aaina refuses hint sales on a venue floor', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=VENUHINT&venue=demo-glasshouse-cafe');
  await ready(page);
  await page.evaluate((n: number) => {
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.grantShards(
      n,
    );
  }, 20);

  // her panel opens on the sponsored floor and the Hint tab offers the usual
  // first sale — the window is honest, the till is not
  await page.keyboard.press('KeyI');
  await expect(page.locator('#mh-aaina-overlay')).toBeVisible();
  await page.locator('#mh-aaina-tab-hint').click();
  const offered = await page.evaluate(() =>
    (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.aaina(),
  );
  expect(offered.hintCost).toBe(5);
  expect(offered.lastHint).toBeNull();

  // the buy is a refusal: toast says the way back, nothing else moves
  await expect(page.locator('#mh-aaina-buy')).toBeEnabled();
  await page.locator('#mh-aaina-buy').click();
  await expect(page.locator('#mh-toast')).toBeVisible();
  await expect(page.locator('#mh-toast')).toContainText('Return to your campaign');
  const after = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { shards: h.metaShards(), panel: h.aaina() };
  });
  expect(after.shards).toBe(20); // the purse never opened
  expect(after.panel.lastHint).toBeNull(); // no line was sold
  expect(after.panel.hintCost).toBe(5); // hintsUsed never moved
  expect(errors).toEqual([]);
});

// T2/T4 — the Hall of Ancestors end to end. `?floor=N` is the DEV-only jump
// and needs a valid `?seed=` beside it to win the save-boot race (a bare
// ?floor= boots the saved campaign instead). Floor 11: the hook's tier reads
// 2, the chip carries the `· T2` suffix, Taal walks the beat, and the
// ancestor portraits hang in the mirrors() census.
test('t2: floor 11 loads tier two', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T2RUN&floor=11');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { tier: h.tier(), floor: h.campaign().floor, taal: h.taalPos(), mirrors: h.mirrors() };
  });
  expect(snap.tier).toBe(2);
  expect(snap.floor).toBe(11);
  expect(snap.taal, 'the Sentinel walks every tier-2 floor').not.toBeNull();
  expect(snap.mirrors.portraits, '2-3 ancestor portraits per tier-2 floor').toBeGreaterThanOrEqual(
    2,
  );
  await expect(page.locator('#mh-floor')).toHaveText('L11 · T2');

  // T3/T1 — the tier-three leg of the same census: the Gardens carry tier 3,
  // the `· T3` chip suffix, and ZERO portraits (the placement gate is
  // tier === 2 — the Gardens hang water, not ancestors). Taal stays home too:
  // his beat is tier-2 only until Gher arrives.
  await page.goto('/?seed=T3RUN&floor=21');
  await ready(page);
  const snap3 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { tier: h.tier(), floor: h.campaign().floor, mirrors: h.mirrors(), taal: h.taalPos() };
  });
  expect(snap3.tier).toBe(3);
  expect(snap3.floor).toBe(21);
  expect(snap3.mirrors.portraits, 'portraits are tier-2-only — the Gardens hang none').toBe(0);
  expect(snap3.taal, 'the Sentinel’s beat is tier-2 only').toBeNull();
  await expect(page.locator('#mh-floor')).toHaveText('L21 · T3');

  // Dwaar III — floor 30 builds the hand-authored garden hall and names it.
  await page.goto('/?seed=T3RUN&floor=30');
  await ready(page);
  const snap30 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { tier: h.tier(), floor: h.campaign().floor, mirrors: h.mirrors() };
  });
  expect(snap30.tier).toBe(3);
  expect(snap30.floor).toBe(30);
  expect(snap30.mirrors.portraits).toBe(0);
  expect(snap30.mirrors.total, 'the garden hall hangs its glass').toBeGreaterThan(0);
  await expect(page.locator('#mh-floor')).toHaveText('L30 · DWAAR III ✦');
  expect(errors).toEqual([]);
});

// T2/T4 — the Sentinel's touch is the standard caught fail: warp onto
// taalPos() and the run fails — house().failed observed DURING the 1200ms
// freeze (the attempt banks only at the reset past it, so attempts is never
// read too early). Then the floor-5 cameo sanity: the same warp on his
// cameo floor raises the house's anger and never catches.
test('t2: sentinel taal catches; floor-5 cameo stays anger-only', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T2RUN&floor=11');
  await ready(page);
  const taal = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.taalPos();
  });
  expect(taal, 'the Sentinel is live on floor 11').not.toBeNull();
  await page.evaluate((p: { x: number; y: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(p.x, p.y);
  }, taal!);
  // the freeze window: failed rises on the next fixed step (50ms) and holds
  // through FAIL_FREEZE_MS — poll fast to see it true (post-reset it is false)
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.house()
        .failed,
    null,
    { timeout: 2000 },
  );
  await expect(page.locator('#mh-fail')).toHaveText('Caught by the glass');
  // the tally banks at the reset AFTER the freeze — poll for it, never a
  // blind read inside the window
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.attempts() === 1,
    null,
    { timeout: 2500 },
  );

  // floor 5 — the cameo is anger-only: same beat-walker, same warp, but the
  // touch feeds the house's anger and the run stands
  await page.goto('/?seed=T2RUN&floor=5');
  await ready(page);
  expect(
    await page.evaluate(() => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.taalPos();
    }),
    'the cameo still walks floor 5',
  ).not.toBeNull();
  // warp only once the beat-walker is clear of the echoes — a coincidental
  // echo contact would fail this leg for the wrong reason
  await page.waitForFunction(
    () => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      const t = h.taalPos();
      if (t === null) return false;
      for (let i = 0; i < h.enemyCount(); i++) {
        const e = h.enemyPos(i);
        if (e !== null && Math.hypot(e.x - t.x, e.y - t.y) < 3) return false;
      }
      return true;
    },
    null,
    { timeout: 5000 },
  );
  const cameo = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { taal: h.taalPos(), attempts: h.attempts(), anger: h.anger() };
  });
  await page.evaluate((p: { x: number; y: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(p.x, p.y);
  }, cameo.taal!);
  // the touch lands on the next fixed step: +TAAL_TOUCH_ANGER, no catch
  await page.waitForFunction(
    (a: number) =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.anger() >
      a,
    cameo.anger,
    { timeout: 2000 },
  );
  const after = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { attempts: h.attempts(), failed: h.house().failed, anger: h.anger() };
  });
  expect(after.attempts, 'the cameo never catches').toBe(cameo.attempts);
  expect(after.failed).toBe(false);
  expect(after.anger).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
