// SPDX-License-Identifier: Apache-2.0
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
// t4 minor (rides t5/T5) — the distortion lie is exact delta·CELL_SIZE, so the
// assertion reads the engine's constant, not a literal that could drift.
// T6/T4 — the furnace's fog leg reads FOG_DURATION_MS the same way.
import { CELL_SIZE, FOG_DURATION_MS } from '../../src/engine/constants';

interface DebugHook {
  getPlayer(): { x: number; y: number; heading: number };
  seed: string;
  look(): string;
  mode(): string;
  mirrors(): {
    total: number;
    fogged: number;
    captured: number;
    // T8/T3 — the Atrium's state census: the spawn ice and the thawed panes
    frozen: number;
    thawed: number;
    portraits: number;
    water: number;
    distort: number;
  };
  // T8/T3 — one pane's single sight/display state by id
  // (frost.mirrorVisual: 'clear' | 'fogged' | 'captured' | 'frozen'; null
  // past the board) — the thaw leg's witness.
  mirrorState(
    id: number,
  ): 'clear' | 'fogged' | 'captured' | 'frozen' | null;
  // T8/T3 — the grid LOS read-out (the same DDA the echo senses use)
  los(x1: number, y1: number, x2: number, y2: number): boolean;
  // T4/T3 — where the house says the player stands (the distort lie's read-out)
  apparentPlayer(): { x: number; y: number };
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
  mirrorRefs(): Array<{
    id: number;
    kind: string;
    x: number;
    z: number;
    cellX: number;
    cellY: number;
  }>;
  mirrorRuntime(): Array<{
    id: number;
    kind: string;
    captured: boolean;
    frozen: boolean;
    thawed: boolean;
  }>;
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
  audioState(): {
    started: boolean;
    muted: boolean;
    intensity: number;
    scale: number[];
    voice: string;
  };
  grantShards(n: number): void;
  aaina(): { open: boolean; hintCost: number; lastHint: string | null };
  visitedCount(): number;
  // M4/T2 — the campaign spine (base seed, current floor, tier flag)
  campaign(): { base: string; floor: number; tierComplete: boolean };
  // T2/T4 — the tier the stage is dressed in (venue side-floors read 1;
  // T7/T3 — the Whisper Library reads 7; T8/T1 — the Frozen Atrium reads 8)
  tier(): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  // T7/T3 — the live noise ring's size (pings hearable right now; the
  // economy's fuel gauge — rises under a sprint, decays on silence)
  noise(): number;
  // T7/T3 — echo i's live mode ('patrol' | 'chase' | 'confused'; null past
  // the board): the ears-witness for the hearing leg
  echoMode(i: number): string | null;
  // T2/T4 — the Sentinel's exact spot for warps (null off his floors)
  taalPos(): { x: number; y: number } | null;
  // T3/T4 — the Encircler's exact spot for e2e warps (null off tier 3)
  gherPos(): { x: number; y: number } | null;
  // T6/T3 — the Encircler's ADOPTED seal cell (null while he holds — the
  // feint). The live witness for the decoy ward: the seal ON a copy's cell.
  gherSeal(): { x: number; y: number } | null;
  // T6/T4 — the Furnace's derived modifier read-out (on / fogMs / crackAnger;
  // heat.ts owns the math — this is its live view through the faucet).
  heat(): { on: boolean; fogMs: number; crackAnger: number };
  // T4/T4 — the Ambusher's exact spot for e2e warps (null off tier 4)
  avartPos(): { x: number; y: number } | null;
  // T5/T2 — the LIVE mirror-you copies (unshattered only; empty off 41–50)
  decoys(): Array<{ x: number; y: number }>;
  // T5/T4 dev faucet — force one copy spawn now (the same spawnOneDecoy path
  // the jittered ~45s clock takes; null when a gate held or off the Flood
  // Halls). The game path stays the honest timer — the e2e rides this.
  forceDecoy(): { x: number; y: number } | null;
  // T5/T3 — the live water depth in meters (derived from the run clock; 0
  // off the Flood Halls and before the first input)
  waterLevel(): number;
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

test('step003: FAQ opens with 44 entries and H toggles', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=FAQ');
  await ready(page);
  await page.locator('#mh-faq').click();
  // 44 since t7/T4 — the Library pair joined the t6 Furnace + Taal-rest pair
  await expect(page.locator('#mh-faq-box details')).toHaveCount(44);
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
  // tier === 2 — the Gardens hang water, not ancestors). T3/T4 — the ladder
  // ACCUMULATES Sentinels (spec §4.4): Gher joins tier 3, Taal STAYS — his
  // spawn gate widened from "tier-2 floors" to every floor from
  // TAAL_SENTINEL_FLOOR (11) up, so he walks the Gardens beside Gher.
  await page.goto('/?seed=T3RUN&floor=21');
  await ready(page);
  const snap3 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { tier: h.tier(), floor: h.campaign().floor, mirrors: h.mirrors(), taal: h.taalPos() };
  });
  expect(snap3.tier).toBe(3);
  expect(snap3.floor).toBe(21);
  expect(snap3.mirrors.portraits, 'portraits are tier-2-only — the Gardens hang none').toBe(0);
  expect(snap3.taal, 'the ladder accumulates — Taal walks tier 3 beside Gher').not.toBeNull();
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

  // T4/T1 — the tier-four leg of the same census: the Carnival of Faces
  // carries tier 4, the `· T4` chip suffix, and ZERO portraits AND ZERO
  // water (the placement gates stay `tier === 2` / `tier === 3` — the
  // portraits are the Ancestors' alone, the pools the Gardens' alone, and
  // the tier-4 rng streams stay clean until the distorting mirrors land).
  await page.goto('/?seed=T4RUN&floor=31');
  await ready(page);
  const snap4 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { tier: h.tier(), floor: h.campaign().floor, mirrors: h.mirrors() };
  });
  expect(snap4.tier).toBe(4);
  expect(snap4.floor).toBe(31);
  expect(snap4.mirrors.portraits, 'portraits are tier-2-only — the Carnival hangs none').toBe(0);
  expect(snap4.mirrors.water, 'water is tier-3-only — the Carnival pools none').toBe(0);
  await expect(page.locator('#mh-floor')).toHaveText('L31 · T4');

  // Dwaar IV — floor 40 builds the hand-authored funhouse hall and names it;
  // Act I's threshold (the act screen itself is a clear-flow overlay, pinned
  // by the campaign/save unit suites).
  await page.goto('/?seed=T4RUN&floor=40');
  await ready(page);
  const snap40 = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { tier: h.tier(), floor: h.campaign().floor, mirrors: h.mirrors() };
  });
  expect(snap40.tier).toBe(4);
  expect(snap40.floor).toBe(40);
  expect(snap40.mirrors.portraits).toBe(0);
  expect(snap40.mirrors.water).toBe(0);
  expect(snap40.mirrors.total, 'the funhouse hall hangs its glass').toBeGreaterThan(0);
  await expect(page.locator('#mh-floor')).toHaveText('L40 · DWAAR IV ✦');
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

// T3/T4 — the Reflecting Gardens end to end. Floor 21 dresses tier 3: the
// hook's tier reads 3, the chip carries the `· T3` suffix, Gher walks his
// encirclement, the standing water hangs 2–4 pools, and — the ladder
// ACCUMULATES (spec §4.4) — Taal keeps his Sentinel beat beside Gher.
test('t3: floor 21 loads the gardens', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T3RUN&floor=21');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      gher: h.gherPos(),
      taal: h.taalPos(),
      mirrors: h.mirrors(),
      audio: h.audioState(),
    };
  });
  expect(snap.tier).toBe(3);
  expect(snap.floor).toBe(21);
  expect(snap.gher, 'the Encircler walks every tier-3 floor').not.toBeNull();
  expect(snap.taal, 'the ladder accumulates — Taal stays on tier 3').not.toBeNull();
  expect(snap.mirrors.water, '2-4 standing pools per tier-3 floor').toBeGreaterThanOrEqual(2);
  // the flute leads tier 3: the walker carries the pastoral set and the sine
  // voice (the seam tracks both from buildFloor, gesture or not)
  expect(snap.audio.scale).toEqual([0, 2, 5, 7, 9]);
  expect(snap.audio.voice).toBe('sine');
  await expect(page.locator('#mh-floor')).toHaveText('L21 · T3');
  expect(errors).toEqual([]);
});

// T3/T4 — the Encircler's touch is the standard caught fail: warp onto
// gherPos() and the run fails — house().failed observed DURING the 1200ms
// freeze (the attempt banks only at the reset past it, so attempts is never
// read too early). T2's polling pattern, no anger detour for this Sentinel.
test('t3: gher catches on contact', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T3RUN&floor=21');
  await ready(page);
  const gher = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.gherPos();
  });
  expect(gher, 'the Encircler is live on floor 21').not.toBeNull();
  await page.evaluate((p: { x: number; y: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(p.x, p.y);
  }, gher!);
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
  expect(errors).toEqual([]);
});

// T4/T4 — the Carnival of Faces end to end. Floor 31 dresses tier 4: the
// hook's tier reads 4, the chip carries the `· T4` suffix, the mischievous
// fourth scale + the triangle voice, the distorting panes hang 2–3, and —
// the ladder ACCUMULATES (spec §4.4) — ALL THREE Sentinels walk the carnival
// (Taal the beat, Gher the ring, Aavart the ambush).
test('t4: floor 31 loads the carnival', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T4RUN&floor=31');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      aavart: h.avartPos(),
      gher: h.gherPos(),
      taal: h.taalPos(),
      mirrors: h.mirrors(),
      audio: h.audioState(),
    };
  });
  expect(snap.tier).toBe(4);
  expect(snap.floor).toBe(31);
  expect(snap.aavart, 'the Ambusher walks every tier-4 floor').not.toBeNull();
  expect(snap.gher, 'the ladder accumulates — Gher stays on tier 4').not.toBeNull();
  expect(snap.taal, 'the ladder accumulates — Taal stays on tier 4').not.toBeNull();
  expect(snap.mirrors.distort, '2-3 distorting panes per tier-4 floor').toBeGreaterThanOrEqual(2);
  // the mischievous groove: the walker carries the fourth scale back on the
  // triangle (the seam tracks both from buildFloor, gesture or not)
  expect(snap.audio.scale).toEqual([0, 2, 3, 7, 9]);
  expect(snap.audio.voice).toBe('triangle');
  await expect(page.locator('#mh-floor')).toHaveText('L31 · T4');
  expect(errors).toEqual([]);
});

// T4/T4 — two pinned mechanics on one deterministic floor. Leg 1, the
// Ambusher's touch is the standard caught fail: warp onto avartPos() and the
// run fails (read+warp in ONE evaluate — he runs at 2.4 m/s, no round-trip
// lag); the tally banks at the reset past the freeze. Leg 2, the carnival
// glass lies: stand where a pane sees you and apparentPlayer() reads the
// pane's displaced position (≠ the player, exactly delta·CELL); fog that
// pane (the standing-glass geometry: 1 m off the glass, facing it, F) and
// the house tells the truth again.
test('t4: aavart catches + distortion displaces', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T4RUN&floor=31');
  await ready(page);
  const live = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.avartPos();
  });
  expect(live, 'the Ambusher is live on floor 31').not.toBeNull();
  await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    const p = h.avartPos();
    if (p !== null) h.warp(p.x, p.y);
  });
  // the freeze window: failed rises on the next fixed step (50ms) and holds
  // through FAIL_FREEZE_MS — poll to see it true (post-reset it is false)
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.house()
        .failed,
    null,
    { timeout: 2000 },
  );
  await expect(page.locator('#mh-fail')).toHaveText('Caught by the glass');
  // the tally banks at the reset AFTER the freeze — poll for it
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.attempts() === 1,
    null,
    { timeout: 2500 },
  );

  // leg 2 — a clean running floor for the lie (the rebuild is deterministic:
  // the same panes hang in the same spots)
  await page.goto('/?seed=T4RUN&floor=31');
  await ready(page);
  const dm = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    const m = h.mirrorAt('distort');
    const ref = (
      h.mirrorRefs() as Array<{ id: number; distortDx?: number; distortDy?: number }>
    ).find((r) => r.id === m?.id);
    return { m, dx: ref?.distortDx ?? 0, dy: ref?.distortDy ?? 0 };
  });
  expect(dm.m, 'a distorting pane hangs on the carnival floor').not.toBeNull();
  // stand at the pane's own cell center: same cell as the glass, LOS trivially
  // clear, well inside SENSE_RANGE — the pane cannot help but see you
  await page.evaluate((c: { cx: number; cy: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(c.cx, c.cy);
  }, dm.m!);
  await page.waitForFunction(
    () => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      const p = h.getPlayer();
      const ap = h.apparentPlayer();
      return Math.hypot(ap.x - p.x, ap.y - p.y) > 0.01;
    },
    null,
    { timeout: 2000 },
  );
  const seen = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { p: h.getPlayer(), ap: h.apparentPlayer() };
  });
  // the lie is exact: the pane's stored delta, cells to meters
  expect(seen.ap).toEqual({
    x: seen.p.x + dm.dx * CELL_SIZE,
    y: seen.p.y + dm.dy * CELL_SIZE,
  });

  // fog the pane — the standing-glass capture geometry, 1 m off the glass
  const d = Math.hypot(dm.m!.cx - dm.m!.x, dm.m!.cy - dm.m!.z); // cell center → wall
  const sx = dm.m!.x + ((dm.m!.cx - dm.m!.x) / d) * 1.0;
  const sz = dm.m!.z + ((dm.m!.cy - dm.m!.z) / d) * 1.0;
  const heading = Math.atan2(dm.m!.x - sx, -(dm.m!.z - sz)); // heading 0 = north (−z)
  await page.evaluate(
    ({ sx, sz, heading }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      h.warp(sx, sz, heading);
    },
    { sx, sz, heading },
  );
  await page.waitForFunction(
    (id: number) =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.fogTarget() === id,
    dm.m!.id,
    { timeout: 4000 },
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.breath() >= 0.34,
    null,
    { timeout: 10000 },
  );
  await page.keyboard.press('KeyF');
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.mirrors()
        .fogged === 1,
    null,
    { timeout: 4000 },
  );
  // fogged carnival glass lies about nothing: the truth returns (and the pane
  // was fogged, never captured — it is not a beacon). apparentPlayer carries
  // x/y only — compare the spot, not the heading getPlayer also reports.
  const truth = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { p: h.getPlayer(), ap: h.apparentPlayer(), mirrors: h.mirrors() };
  });
  expect(truth.ap).toEqual({ x: truth.p.x, y: truth.p.y });
  expect(truth.mirrors.captured).toBe(0);
  expect(errors).toEqual([]);
});

// T5/T4 — Act II opens end to end. Floor 41 dresses tier 5 in the Flood
// Halls' drowned indigo-green (the Carnival stand-in retires — its census is
// pinned absent here), hums the dark pentatonic back on the triangle, and
// the Act II banner rises on the first floor-41 build (its 3s clock hides
// it). The rotation BEGINS: Gher and Aavart rest on 41–49, Taal walks alone.
test('t5: floor 41 opens act two', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T5RUN&floor=41');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      gher: h.gherPos(),
      avart: h.avartPos(),
      taal: h.taalPos(),
      decoys: h.decoys(),
      mirrors: h.mirrors(),
      audio: h.audioState(),
    };
  });
  expect(snap.tier).toBe(5);
  expect(snap.floor).toBe(41);
  expect(snap.gher, 'the rotation begins — the Encircler rests on 41–49').toBeNull();
  expect(snap.avart, 'the rotation begins — the Ambusher rests on 41–49').toBeNull();
  expect(snap.taal, 'the ladder accumulates — Taal walks the Flood Halls').not.toBeNull();
  expect(snap.mirrors.distort, 'the distorting panes stay tier-4-only').toBe(0);
  expect(snap.mirrors.portraits, 'the ancestor portraits stay tier-2-only').toBe(0);
  expect(snap.decoys, 'no copy in the first seconds — the ~45s clock has not fired').toEqual([]);
  // the dark pentatonic on the triangle (the seam tracks both from
  // buildFloor, gesture or not)
  expect(snap.audio.scale).toEqual([0, 3, 5, 7, 10]);
  expect(snap.audio.voice).toBe('triangle');
  // the Act II banner: up on THIS build, then gone when its clock expires
  await expect(page.locator('#mh-act')).toBeVisible();
  await expect(page.locator('#mh-act-title')).toHaveText('ACT II — THE DECEPTION');
  await expect(page.locator('#mh-act-note')).toHaveText('The house has begun copying you.');
  await expect(page.locator('#mh-act')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#mh-floor')).toHaveText('L41 · T5');
  expect(errors).toEqual([]);
});

// T5/T4 — the flood and the copies on one running floor. Leg 1: one step
// arms the run clock and the derived level leaves 0 — then keeps climbing
// (two reads 2s apart, strictly rising; the brief's 15s horizon proven live
// instead of slept). Leg 2: the DEV faucet forces one copy (the honest ~45s
// jittered clock stays the game path — forceDecoy runs the same
// spawnOneDecoy the sim clock does), the copy WALKS the flow field, and a
// warp onto it shatters it — +5 banked pending, exactly once (the live list
// empties; a second pass pays nothing).
test('t5: water rises and decoy walks', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T5RUN&floor=41');
  await ready(page);
  // leg 1 — one step starts the run; the flood is derived from its clock
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyW');
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.waterLevel() >
      0,
    null,
    { timeout: 20000 },
  );
  const l1 = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.waterLevel(),
  );
  await page.waitForTimeout(2000);
  const l2 = await page.evaluate(
    () => (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.waterLevel(),
  );
  expect(l1, 'the flood rises the moment the run begins').toBeGreaterThan(0);
  expect(l2, 'the flood keeps climbing').toBeGreaterThan(l1);

  // leg 2 — the copy: forced, walking, worth 5 shards, shatterable once
  const spot = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.forceDecoy();
  });
  expect(spot, 'the faucet spawns a copy on the Flood Halls').not.toBeNull();
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.decoys()
        .length >= 1,
    null,
    { timeout: 2000 },
  );
  await page.waitForTimeout(700); // the copy strides at DECOY_SPEED — let it move
  const walk = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    const ds = h.decoys();
    return ds.length > 0 ? ds[0]! : null;
  });
  expect(walk, 'the live copy is on the board').not.toBeNull();
  expect(
    walk!.x !== spot!.x || walk!.y !== spot!.y,
    'the copy has walked off its spawn cell toward the exit',
  ).toBe(true);
  await page.evaluate((p: { x: number; y: number }) => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    h.warp(p.x, p.y);
  }, walk!);
  // the touch: +DECOY_SHARD banked pending on the next fixed step (50ms),
  // and the shattered copy leaves the live list — the once-gate holds
  await page.waitForFunction(
    () => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      return h.house().pendingShards === 5 && h.decoys().length === 0;
    },
    null,
    { timeout: 2500 },
  );
  expect(errors).toEqual([]);
});

// T6/T4 — the Furnace opens end to end. Floor 51 dresses tier 6 in the
// Furnace Wings' ember/copper-on-charcoal (the Flood stand-in retires — its
// census is pinned absent here), hums the urgent Phrygian-adjacent
// pentatonic still on the triangle (the reed endures the heat), and the
// rotation's first REST lands: Taal sits out 51–59 while Gher and Aavart
// walk the Furnace. Heat() reads hot: a fog evaporates in half the time and
// every sprint-crack costs 25 — the e2e reads both through the faucet (the
// crack leg proves the 25 in anger, not just the read-out).
test('t6: floor 51 loads the furnace', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T6RUN&floor=51');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      gher: h.gherPos(),
      avart: h.avartPos(),
      taal: h.taalPos(),
      heat: h.heat(),
      decoys: h.decoys(),
      mirrors: h.mirrors(),
      audio: h.audioState(),
    };
  });
  expect(snap.tier).toBe(6);
  expect(snap.floor).toBe(51);
  expect(snap.taal, 'the rotation rests — Taal sits out 51–59 (his beat was the Flood pairing)').toBeNull();
  expect(snap.gher, 'the Furnace is Gher/Aavart\u2019s home — the Encircler walks').not.toBeNull();
  expect(snap.avart, 'the Ambusher walks the crucible too').not.toBeNull();
  expect(snap.heat.on, 'the furnace breathes on 51').toBe(true);
  expect(snap.heat.fogMs, 'frost utility halves — a fog evaporates in 12.5s').toBe(
    FOG_DURATION_MS / 2,
  );
  expect(snap.heat.crackAnger, 'cracks burn wider — 25 a crack, not 15').toBe(25);
  expect(snap.mirrors.distort, 'the distorting panes stay tier-4-only').toBe(0);
  expect(snap.mirrors.portraits, 'the ancestor portraits stay tier-2-only').toBe(0);
  expect(snap.mirrors.water, 'the standing pools stay tier-3-only').toBe(0);
  expect(snap.decoys, 'no copy in the first seconds — the ~45s clock has not fired').toEqual([]);
  // the urgent pentatonic on the triangle (the seam tracks both from
  // buildFloor, gesture or not)
  expect(snap.audio.scale).toEqual([0, 1, 5, 7, 8]);
  expect(snap.audio.voice).toBe('triangle');
  await expect(page.locator('#mh-floor')).toHaveText('L51 · T6');
  expect(errors).toEqual([]);
});

// T6/T4 — heat on the body, the warden on the copy. Leg 1: a sprint-crack in
// the Furnace costs 25 anger (the cool floors' 15) — warp a lunge from a
// standing pane, hold the sprint key for a few fixed steps, and watch the
// house jump by HEAT_CRACK_ANGER exactly. Leg 2: the decoy ward end to end —
// force one copy (the honest clock's own path), park the player one walkable
// cell off its CURRENT cell facing it (self-correcting: the copy strides, so
// every poll re-parks), and the copy's cell becomes the nearest road: the
// seal lands ON it and gherSeal() witnesses the ward the game speaks of.
test('t6: heat cracks burn wider + gher guards the copy', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T6RUN&floor=51');
  await ready(page);
  // leg 1 — the expensive crack
  const m = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrorAt('standing');
  });
  expect(m, 'a standing pane hangs in the Furnace').not.toBeNull();
  const d = Math.hypot(m!.cx - m!.x, m!.cy - m!.z); // mount offset: cell center → wall
  const sx = m!.x + ((m!.cx - m!.x) / d) * 0.85; // a lunge inside CRACK_RANGE (1.0 m)
  const sz = m!.z + ((m!.cy - m!.z) / d) * 0.85;
  const heading = Math.atan2(m!.x - sx, -(m!.z - sz)); // heading 0 = north (−z)
  await page.evaluate(
    ({ sx, sz, heading }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      h.warp(sx, sz, heading);
    },
    { sx, sz, heading },
  );
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.house()
        .crackedAny,
    null,
    { timeout: 4000 },
  );
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  const anger = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.anger();
  });
  expect(anger, 'one furnace crack — 25, not the cool floors\u2019 15').toBe(25);

  // leg 2 — the warden guards the copy
  const spot = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.forceDecoy();
  });
  expect(spot, 'the faucet spawns a copy in the Furnace (copies walk 41–60)').not.toBeNull();
  // solve the grid's width/height from any mirror's cell index ↔ center-meters
  // pair (cellCenter: (i − (W−1)/2)·CELL), then the decoy's cell reads out
  // exactly as grid.cellAt maps it.
  const CELL = CELL_SIZE;
  const grid = await page.evaluate(
    (cell: number) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
      const m = h.mirrorAt('standing')!;
      return {
        w: Math.round(2 * (m.cellX - m.cx / cell) + 1),
        h: Math.round(2 * (m.cellY - m.cy / cell) + 1),
      };
    },
    CELL,
  );
  // N/E/S/W step vectors, Dir order (grid.ts DIR_VECTOR)
  const dirs = [
    { d: 0, dx: 0, dy: -1 },
    { d: 1, dx: 1, dy: 0 },
    { d: 2, dx: 0, dy: 1 },
    { d: 3, dx: -1, dy: 0 },
  ];
  await page.waitForFunction(
    ({
      cell,
      w,
      h: gh,
      dirs,
    }: {
      cell: number;
      w: number;
      h: number;
      dirs: Array<{ d: number; dx: number; dy: number }>;
    }) => {
      const hook = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      const copy = hook.decoys()[0];
      if (copy === undefined) {
        // self-heal: a copy that walked into us (exit on the far side) is
        // gone — force another. The +5 pending shards are not asserted here.
        hook.forceDecoy();
        return false;
      }
      // the copy's cell, exactly as grid.cellAt maps meters → indices
      const ccx = Math.floor(copy.x / cell + w / 2);
      const ccy = Math.floor(copy.y / cell + gh / 2);
      // canWalk takes CELL indices (grid.ts) — pick the walkable neighbor
      // FARTHEST from the exit's bearing: the copy flow-walks toward the
      // exit, so parking on the far side keeps it striding away from us
      // (a walk-through would shatter it and empty the board).
      const exit = hook.exitPos();
      const ax = copy.x - exit.x;
      const ay = copy.y - exit.z;
      const al = Math.hypot(ax, ay) || 1;
      let best: { v: { d: number; dx: number; dy: number }; score: number } | null = null;
      for (const v of dirs) {
        if (!hook.canWalk(ccx, ccy, v.d)) continue;
        const score = (v.dx * ax + v.dy * ay) / al;
        if (best === null || score > best.score) best = { v, score };
      }
      if (best === null) return false;
      const px = copy.x + best.v.dx * cell;
      const py = copy.y + best.v.dy * cell;
      hook.warp(px, py, Math.atan2(copy.x - px, -(copy.y - py)));
      // the adopted seal must stand ON the copy's cell (the ward witnessed)
      const seal = hook.gherSeal();
      return seal !== null && seal.x === ccx && seal.y === ccy;
    },
    { cell: CELL, w: grid.w, h: grid.h, dirs },
    { timeout: 15000 },
  );
  const sealed = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return { seal: h.gherSeal(), copy: h.decoys()[0] ?? null };
  });
  expect(sealed.seal, 'the Encircler\u2019s adopted seal sits on the copy\u2019s cell').not.toBeNull();
  expect(sealed.copy, 'the copy is still alive under the ward').not.toBeNull();
  expect(errors).toEqual([]);
});

// T7/T3 — the Whisper Library loads. Floor 61 dresses tier 7 (the Furnace
// stand-in retired): the hook reads 7, the chip carries `· T7`, and the
// rotation RESTS — Taal sits out until his 66 return, Gher joins only at
// Dwaar VII (70), Aavart rests the whole tier. The stage is moonlit (the
// palette pins live in the unit suite; the streams pin here: no portraits,
// pools, distort panes, or flood — the tier-2/3/4/5 draws stay home). The
// whisper carries the walk: the seventh scale on the sine flute, and the
// calm 0.2 intensity hushed to 0.11 by the ×0.55 whisper ceiling — the
// disclosed method, witnessed through the audio seam. And the economy's
// fuel flows: a sprint rings the noise hook while it lasts.
test('t7: floor 61 loads the library', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T7RUN&floor=61');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      taal: h.taalPos(),
      gher: h.gherPos(),
      avart: h.avartPos(),
      echoes: h.enemyCount(),
      mirrors: h.mirrors(),
      decoys: h.decoys(),
      audio: h.audioState(),
    };
  });
  expect(snap.tier).toBe(7);
  expect(snap.floor).toBe(61);
  expect(snap.taal, 'the rotation rests — Taal returns only at 66').toBeNull();
  expect(snap.gher, 'Gher joins only at Dwaar VII (70)').toBeNull();
  expect(snap.avart, 'the Ambusher rests the whole tier').toBeNull();
  expect(snap.echoes, 'the stacks are guarded — 4 wardens on a tier-7 floor').toBe(4);
  expect(snap.mirrors.distort, 'the distorting panes stay tier-4-only').toBe(0);
  expect(snap.mirrors.portraits, 'the ancestor portraits stay tier-2-only').toBe(0);
  expect(snap.mirrors.water, 'the standing pools stay tier-3-only').toBe(0);
  expect(snap.decoys, 'no copy in the first seconds — the ~45s clock has not fired').toEqual([]);
  // the whispered pair: the seventh scale on the sine flute (the seam tracks
  // both from buildFloor, gesture or not), and the calm floor's intensity
  // hushed 0.2 → 0.11 by the ceiling multiply
  expect(snap.audio.scale).toEqual([0, 2, 3, 7, 8]);
  expect(snap.audio.voice).toBe('sine');
  expect(snap.audio.intensity).toBeCloseTo(0.11, 5);
  await expect(page.locator('#mh-floor')).toHaveText('L61 · T7');
  // the fuel: a held sprint rings the noise hook within the first steps
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.noise() >
      0,
    null,
    { timeout: 4000 },
  );
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  expect(errors).toEqual([]);
});

// T7/T3 — Taal's return + the ears end to end. Leg 1: floor 66 pins the
// rotation — the Sentinel walks the stacks again (his first beat since 50;
// he rests 51–65), while Gher and Aavart still sit out. Leg 2: the hearing
// economy — pick the warden FARTHEST from Taal (his beat rings sprint-sized
// pings that would out-shout ours near him), park one cell off its shoulder
// (~5.7 m — inside the 7 m sprint ring) facing down an open road away from
// it, and sprint: noise() rises, and within a sense tick (250 ms) the echo
// flips patrol → chase — the hearing proof, since glass never runs on
// tier 7. Then stand still — the creep's silence — and the ring decays
// (TTL 1.2 s) while the memory lapses (2 s): the warden returns to patrol.
test('t7: taal returns at 66 + echoes hear noise', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T7RUN&floor=66');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      taal: h.taalPos(),
      gher: h.gherPos(),
      avart: h.avartPos(),
    };
  });
  expect(snap.tier).toBe(7);
  expect(snap.floor).toBe(66);
  expect(snap.taal, 'Taal returns mid-tier — 66 is his first beat since 50').not.toBeNull();
  expect(snap.gher, 'Gher joins only at Dwaar VII').toBeNull();
  expect(snap.avart, 'the Ambusher rests all tier 7').toBeNull();
  await expect(page.locator('#mh-floor')).toHaveText('L66 · T7');

  // leg 2 — pick the runway warden and the sprint-away spot in ONE in-page
  // pass (he patrols while we compute; no round-trip lag). Geometry mirrors
  // the t6 ward leg: cell indices ↔ meters via the derived W/H, CELL = 4 m.
  const CELL = CELL_SIZE;
  const target = await page.evaluate(
    (cell: number) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      const taal = h.taalPos();
      // the warden farthest from the beat (his pings never reach past 7 m)
      // that is ALSO patrolling right now — an echo already chasing a stale
      // Taal ping cannot witness our sprint leg cleanly
      let best = -1;
      let bestD = -1;
      for (let i = 0; i < h.enemyCount(); i++) {
        if (h.echoMode(i) !== 'patrol') continue;
        const p = h.enemyPos(i);
        if (p === null) continue;
        const d = taal === null ? Infinity : Math.hypot(p.x - taal.x, p.y - taal.y);
        if (d > bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0 || bestD < 9) return null; // no warden clear of the beat
      const e = h.enemyPos(best)!;
      // derive the grid's width/height from a standing mirror's cell↔meters pair
      const m = h.mirrorAt('standing');
      if (m === null) return null;
      const w = Math.round(2 * (m.cellX - m.cx / cell) + 1);
      const gh = Math.round(2 * (m.cellY - m.cy / cell) + 1);
      const ecx = Math.floor(e.x / cell + w / 2);
      const ecy = Math.floor(e.y / cell + gh / 2);
      // N/E/S/W step vectors, Dir order (grid.ts DIR_VECTOR)
      const dirs = [
        { d: 0, dx: 0, dy: -1 },
        { d: 1, dx: 1, dy: 0 },
        { d: 2, dx: 0, dy: 1 },
        { d: 3, dx: -1, dy: 0 },
      ];
      // a stand cell 1 diagonal step off the warden (√2·4 ≈ 5.7 m — inside
      // the 7 m ring, far enough that his arrival cell ≠ our cell), with an
      // open road pointing AWAY from him: sprint down it and the trail's
      // nearest ping stays at our back while we gain 3.6 m of head start.
      let pick: {
        i: number;
        px: number;
        py: number;
        heading: number;
        patrol: string | null;
      } | null = null;
      let bestDot = 0.4; // roughly-away or better
      for (const o of [
        { dx: 1, dy: 1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 1 },
        { dx: -1, dy: -1 },
      ]) {
        const sx = ecx + o.dx;
        const sy = ecy + o.dy;
        if (sx < 0 || sy < 0 || sx >= w || sy >= gh) continue;
        // away unit vector (from the stand cell, pointing off the warden)
        const al = Math.hypot(o.dx, o.dy);
        let road: { v: { d: number; dx: number; dy: number }; dot: number } | null = null;
        for (const v of dirs) {
          if (!h.canWalk(sx, sy, v.d)) continue;
          const dot = (v.dx * o.dx + v.dy * o.dy) / al;
          if (road === null || dot > road.dot) road = { v, dot };
        }
        if (road === null || road.dot <= bestDot) continue;
        bestDot = road.dot;
        const cx = (sx + 0.5 - w / 2) * cell;
        const cy = (sy + 0.5 - gh / 2) * cell;
        pick = {
          i: best,
          px: cx,
          py: cy,
          heading: Math.atan2(road.v.dx, -road.v.dy), // heading 0 = north (−z)
          patrol: h.echoMode(best),
        };
      }
      return pick;
    },
    CELL,
  );
  expect(target, 'a warden with an away-road off the beat exists').not.toBeNull();
  expect(
    target!.patrol,
    'the warden patrols before the noise (pre-check)',
  ).toBe('patrol');
  await page.evaluate(
    ({ px, py, heading }: { px: number; py: number; heading: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      h.warp(px, py, heading);
    },
    { px: target!.px, py: target!.py, heading: target!.heading },
  );
  // the roar: sprint down the away-road — the ring fills, the warden's ears
  // catch it on its next sense tick, the mode flips
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    (i: number) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      return h.noise() > 0 && h.echoMode(i) === 'chase';
    },
    target!.i,
    { timeout: 4000 },
  );
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  // the creep's silence: stand still — the pings decay (TTL 1.2 s), the
  // memory lapses (2 s past the last heard tick), the warden goes back to
  // its patrol
  await page.waitForFunction(
    (i: number) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      return h.echoMode(i) === 'patrol';
    },
    target!.i,
    { timeout: 9000 },
  );
  expect(errors).toEqual([]);
});

// T8/T3 — the Frozen Atrium loads END TO END. Floor 71 dresses tier 8 (the
// tier-one stand-in retired): the hook reads 8, the chip carries `· T8`, the
// rotation rests its pair (the Ambusher walks 71–79; Taal and Gher sit out
// until Dwaar VIII), every fogable pane arrives FROZEN (the standing glass
// plus the heroes — ≥ 4; the beacons and the true pair stay live glass), and
// the austere suspended pentatonic hums through the cold strings (sawtooth).
// Then the inversion, played for real: the F verb on ice THAWS it — the pane
// reads 'clear' and the thawed census ticks — and a warden drawn within the
// lure radius WALKS to the thawed pane and stands watching it. The pick runs
// in ONE in-page pass over the real refs, re-polled inside the wait (the
// wardens patrol — at load none stands within the radius): it fires when one
// passes 3–6 m off a pane with NO sight line to it (a wall blocks the
// reflection — the thawed glass can never become that warden's eye, so the
// lure cannot be eaten by a chase), no live pane (beacon/true) co-watches
// the stand spot with ANY warden (waiting at the glass for the frost cannot
// start one either), and no beacon/exit cell sits where the player waits.
// The retreat itself rides the thaw poll — the same in-page turn the thaw is
// seen, before any sense tick can read a player 1 m from a live eye. No
// movement key is ever pressed: the phase stays 'ready', the path stays
// empty, and Chhaya stays hidden. Frost again and the pane cold-fogs:
// 'fogged' — blind again, the thaw spent.
test('t8: floor 71 loads the atrium frozen', async ({ page }) => {
  test.setTimeout(90_000); // the pick waits out the wardens' patrol; the lure walk paths around walls
  const errors = collectErrors(page);
  await page.goto('/?seed=T8RUN&floor=71');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      taal: h.taalPos(),
      gher: h.gherPos(),
      avart: h.avartPos(),
      echoes: h.enemyCount(),
      mirrors: h.mirrors(),
      audio: h.audioState(),
    };
  });
  expect(snap.tier).toBe(8);
  expect(snap.floor).toBe(71);
  expect(snap.taal, 'the Sentinel rests the whole Atrium (71–79)').toBeNull();
  expect(snap.gher, 'the Encircler joins only at Dwaar VIII').toBeNull();
  expect(snap.avart, 'the Ambusher returns — Chhaya + Aavart walk 71–79').not.toBeNull();
  expect(snap.echoes, 'the atrium is guarded — 4 wardens on a tier-8 floor').toBe(4);
  expect(snap.mirrors.frozen, 'the fogable glass arrives encased').toBeGreaterThanOrEqual(4);
  expect(snap.mirrors.captured, 'the ice is not a capture').toBe(0);
  expect(snap.mirrors.thawed, 'nothing is thawed at spawn').toBe(0);
  // the suspended pair: the eighth scale on the cold strings (the seam
  // tracks both from buildFloor, gesture or not)
  expect(snap.audio.scale).toEqual([0, 2, 5, 7, 10]);
  expect(snap.audio.voice).toBe('sawtooth');
  await expect(page.locator('#mh-floor')).toHaveText('L71 · T8');

  // leg 2 — the pick: pane, warden, stand spots, retreat, all decided in-page
  // against the live board (geometry mirrors the t6 ward leg: cells ↔ meters
  // via the derived W/H, CELL = 4 m). The wardens PATROL — at load none stands
  // within the lure radius of any pane — so the matcher re-runs inside the
  // wait loop and fires when one passes within 3–6 m of a pane it cannot see.
  // Alongside the pair it solves two safe spots: S (0.85 m off the glass, the
  // frost stand) and R (a walkable cell 2–10 m out that the thawed pane can
  // NOT see — a wall blocks the reflection — no live pane co-watches with any
  // warden, and no beacon or exit claims it), where the player waits out the
  // lure walk untouchable.
  const CELL = CELL_SIZE;
  type Pick = {
    id: number;
    i: number;
    sx: number;
    sz: number;
    heading: number;
    s3x: number;
    s3z: number;
    pcx: number;
    pcy: number;
    rx: number;
    ry: number;
    dEP: number;
  };
  const stash = '__t8pick'; // the matcher's answer, stashed in-page per poll
  await page.waitForFunction(
    (cellAndStash: { cell: number; stash: string }) => {
      const w = window as unknown as Record<string, unknown>;
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      const cell = cellAndStash.cell;
      const rt = h.mirrorRuntime();
      const frozenById = new Map(rt.map((r) => [r.id, r]));
      const any = h.mirrorAt('standing');
      if (any === null) return false;
      const gw = Math.round(2 * (any.cellX - any.cx / cell) + 1);
      const gh = Math.round(2 * (any.cellY - any.cy / cell) + 1);
      const cc = (ix: number, iy: number) => ({
        x: (ix + 0.5 - gw / 2) * cell,
        y: (iy + 0.5 - gh / 2) * cell,
      });
      const refs = h.mirrorRefs();
      const panes = refs.filter((m) => m.kind === 'standing' && frozenById.get(m.id)?.frozen);
      const live = refs.filter((m) => m.kind === 'beacon' || m.kind === 'true'); // the sighted glass
      const n = h.enemyCount();
      const echoAt = (j: number) => h.enemyPos(j);
      // co-watch: some live pane and some warden stand in the same reflection
      // of spot p (both legs ≤ 13 m, both LOS clear)
      const cowatch = (px: number, py: number): boolean => {
        for (const L of live) {
          if (Math.hypot(L.x - px, L.z - py) > 13 || !h.los(px, py, L.x, L.z)) continue;
          for (let j = 0; j < n; j++) {
            const e2 = echoAt(j);
            if (e2 === null) continue;
            if (Math.hypot(L.x - e2.x, L.z - e2.y) <= 13 && h.los(e2.x, e2.y, L.x, L.z)) {
              return true;
            }
          }
        }
        return false;
      };
      // the safe retreat: a walkable cell 2–10 m off the pane that the pane
      // cannot see (walls block) and no live pane co-watches — never a
      // beacon's or the exit's cell, which the Ambusher ambushes (he would
      // walk straight to the player parked there and touch)
      const exitC = h.exitPos();
      const goals = refs
        .filter((m) => m.kind === 'beacon')
        .map((m) => ({ x: m.cellX, y: m.cellY }));
      goals.push({
        x: Math.floor(exitC.x / cell + gw / 2),
        y: Math.floor(exitC.z / cell + gh / 2),
      });
      const retreatFor = (px: number, pz: number): { x: number; y: number } | null => {
        for (let ix = 0; ix < gw; ix++) {
          for (let iy = 0; iy < gh; iy++) {
            if (goals.some((g) => g.x === ix && g.y === iy)) continue;
            const open =
              h.canWalk(ix, iy, 0) ||
              h.canWalk(ix, iy, 1) ||
              h.canWalk(ix, iy, 2) ||
              h.canWalk(ix, iy, 3);
            if (!open) continue;
            const c = cc(ix, iy);
            const d = Math.hypot(c.x - px, c.y - pz);
            if (d < 2 || d > 10) continue;
            if (h.los(px, pz, c.x, c.y)) continue; // the thawed pane cannot see R
            if (cowatch(c.x, c.y)) continue;
            return c;
          }
        }
        return null;
      };
      let best: Pick | null = null;
      for (const P of panes) {
        const c = cc(P.cellX, P.cellY);
        const d = Math.hypot(c.x - P.x, c.y - P.z); // mount offset: glass on the cell's wall
        const ux = (c.x - P.x) / d; // glass → cell center unit vector
        const uy = (c.y - P.z) / d;
        const sx = P.x + ux * 0.85; // stand 0.85 m off the glass, inside the room
        const sz = P.z + uy * 0.85;
        const heading = Math.atan2(P.x - sx, -(P.z - sz)); // heading 0 = north (−z)
        const s3x = P.x + ux * 3.5; // the re-frost stand: far enough that the
        const s3z = P.z + uy * 3.5; // lingering warden at the cell center cannot touch
        const r = retreatFor(P.x, P.z);
        if (r === null) continue;
        for (let i = 0; i < n; i++) {
          if (h.echoMode(i) !== 'patrol') continue;
          const e = echoAt(i);
          if (e === null) continue;
          const dEP = Math.hypot(P.x - e.x, P.z - e.y);
          if (dEP < 3 || dEP > 6) continue; // inside the lure, drift left to witness
          if (h.los(e.x, e.y, P.x, P.z)) continue; // wall between: the thawed pane is not this warden's eye
          if (cowatch(sx, sz)) continue; // no live pane co-watches the frost stand
          if (best === null || dEP < best.dEP) {
            best = { id: P.id, i, sx, sz, heading, s3x, s3z, pcx: c.x, pcy: c.y, rx: r.x, ry: r.y, dEP };
          }
        }
      }
      w[cellAndStash.stash] = best; // the wait resolves when a pass succeeds
      return best !== null;
    },
    { cell: CELL, stash },
    { timeout: 30000, polling: 200 },
  );
  const pick = (await page.evaluate(
    (s: string) => (window as unknown as Record<string, Pick | null>)[s] ?? null,
    stash,
  )) as Pick | null;
  expect(pick, 'a warden patrols within the lure radius of a blind pane').not.toBeNull();

  // the thaw: warp to the glass, wait for the target and the breath, press F
  await page.evaluate(
    (p: { sx: number; sz: number; heading: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      h.warp(p.sx, p.sz, p.heading);
    },
    pick!,
  );
  await page.waitForFunction(
    (id: number) =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.fogTarget() === id,
    pick!.id,
    { timeout: 4000 },
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.breath() >= 0.34,
    null,
    { timeout: 10000 },
  );
  const frozenBefore = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrors().frozen;
  });
  await page.keyboard.press('KeyF');
  // the thaw lands: the pane reads 'clear' (thawed) and the census ticks —
  // and the SAME in-page turn retreats the player to the warden-blind spot R,
  // before any sense tick can read a player 1 m from a freshly-woken eye
  await page.waitForFunction(
    (p: { id: number; rx: number; ry: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      const ok = h.mirrorState(p.id) === 'clear' && h.mirrors().thawed >= 1;
      if (ok) h.warp(p.rx, p.ry);
      return ok;
    },
    pick!,
    { timeout: 4000 },
  );
  const afterThaw = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrors();
  });
  expect(afterThaw.frozen, 'the thawed pane leaves the ice census').toBe(frozenBefore - 1);
  expect(afterThaw.thawed).toBe(1);

  // the lure: the chosen warden walks to the thawed pane's cell and lingers —
  // the path runs around walls, so the euclidean read-out can wander before
  // it plunges; 30 s covers the long way round at a warden's 2.2 m/s
  await page.waitForFunction(
    (p: { i: number; pcx: number; pcy: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      const e = h.enemyPos(p.i);
      return e !== null && Math.hypot(e.x - p.pcx, e.y - p.pcy) <= 0.5;
    },
    pick!,
    { timeout: 30000 },
  );

  // leg 3 — frost the SAME pane again from 3.5 m off the glass (the lingering
  // warden parks on the cell center, 0.85 m off it would meet the touch
  // radius): the cold fog closes the eye ('fogged' — blind again) and the
  // thaw is spent
  await page.evaluate(
    (p: { s3x: number; s3z: number; heading: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      h.warp(p.s3x, p.s3z, p.heading);
    },
    pick!,
  );
  await page.waitForFunction(
    (id: number) =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.fogTarget() === id,
    pick!.id,
    { timeout: 4000 },
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.breath() >= 0.34,
    null,
    { timeout: 10000 },
  );
  await page.keyboard.press('KeyF');
  await page.waitForFunction(
    (id: number) =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.mirrorState(id) === 'fogged',
    pick!.id,
    { timeout: 4000 },
  );
  // step back to R before the read — the released warden's last memory of the
  // stand spot must not touch the closing assertions
  await page.evaluate(
    (p: { rx: number; ry: number }) => {
      const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook })
        .__MIRROR_HOUSE_DEBUG__;
      h.warp(p.rx, p.ry);
    },
    pick!,
  );
  const afterFog = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return h.mirrors();
  });
  expect(afterFog.thawed, 'the cold fog spends the thaw').toBe(0);
  expect(afterFog.frozen, 'the pane is fogged, not re-frozen').toBe(frozenBefore - 1);
  expect(errors).toEqual([]);
});

// T8/T3 — the Ambusher returns. Floor 72 pins the rotation: Chhaya + Aavart
// walk the whole Atrium (71–79) while Taal and Gher rest until Dwaar VIII —
// their spots read null, his is live. His touch is the standard caught fail:
// warp onto avartPos() → house().failed rises on the next fixed step, the
// freeze speaks 'Caught by the glass', and the reset banks the attempt.
test('t8: aavart ambush returns', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?seed=T8RUN2&floor=72');
  await ready(page);
  const snap = await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    return {
      tier: h.tier(),
      floor: h.campaign().floor,
      taal: h.taalPos(),
      gher: h.gherPos(),
      avart: h.avartPos(),
      mirrors: h.mirrors(),
    };
  });
  expect(snap.tier).toBe(8);
  expect(snap.floor).toBe(72);
  expect(snap.taal, 'the Sentinel rests until Dwaar VIII').toBeNull();
  expect(snap.gher, 'the Encircler rests until Dwaar VIII').toBeNull();
  expect(snap.avart, 'the Ambusher walks the whole Atrium (71–79)').not.toBeNull();
  expect(snap.mirrors.frozen, 'the atrium spawns encased on 72 too').toBeGreaterThanOrEqual(4);
  await expect(page.locator('#mh-floor')).toHaveText('L72 · T8');
  await page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__;
    const p = h.avartPos();
    if (p !== null) h.warp(p.x, p.y);
  });
  // the freeze window: failed rises on the next fixed step and holds through
  // the freeze — poll to see it true (post-reset it is false again)
  await page.waitForFunction(
    () =>
      (window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }).__MIRROR_HOUSE_DEBUG__.house()
        .failed,
    null,
    { timeout: 2000 },
  );
  await expect(page.locator('#mh-fail')).toHaveText('Caught by the glass');
  // the tally banks at the reset AFTER the freeze — poll for it
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __MIRROR_HOUSE_DEBUG__: DebugHook }
      ).__MIRROR_HOUSE_DEBUG__.attempts() === 1,
    null,
    { timeout: 2500 },
  );
  expect(errors).toEqual([]);
});
