// SPDX-License-Identifier: Apache-2.0
//
// T13/T3 — the SESSION e2e file: the front door and the pause, end to end on
// the real boot chain. Three legs, one per session verb (plus the T14 rider):
//
//   1. the start screen GATES the house — a bare URL plates the world (BEGIN
//      focused), a held key moves nobody while plated, and BEGIN alone opens
//      the door (the first key after it walks AND arms the timer, exactly as
//      shipped);
//   2. a STORED campaign (save v2 seeded straight into IDB — the same store,
//      version and key the app itself uses, shaped to pass the boot's
//      validateSave gate) re-plates as CONTINUE — FLOOR N + NEW HOUSE;
//      NEW HOUSE randomizes the campaign (fresh seed, chip back to L01) and
//      CONTINUE resumes the stored floor (chip L02);
//   3. the session pause freezes a walking session mid-run while the run
//      clock keeps counting through the plate (the ratified pause-proof
//      rule), RESUME releases, and KeyP drives the same toggle — the dock
//      chip and the key are one switch;
//   4. T14/t13 rider — the pause STANDS DOWN while a modal (the FAQ) stands:
//      KeyP and the dock chip refuse to plate under a dialog, and a resume
//      returns focus to where the pause found it.
//
// The plate skips seeded URLs (the seeded link is the demo path), so every
// leg boots a bare URL — `?test=1` where the boot poster's 1.6 s hold would
// only slow the leg down, truly bare where the leg IS the mount timing.

import { expect, test, type Page } from '@playwright/test';

/** The hook members this file reads — the full contract lives in smoke.spec.ts. */
interface SessionHook {
  getPlayer(): { x: number; y: number; heading: number };
  campaign(): { base: string; floor: number; tierComplete: boolean };
  seed: string;
}

// page.evaluate results cannot carry functions across the process boundary —
// the members are invoked in the browser and returned as a plain snapshot.
const hookOf = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: SessionHook })
      .__MIRROR_HOUSE_DEBUG__;
    return { campaign: h.campaign(), seed: h.seed };
  });

const player = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __MIRROR_HOUSE_DEBUG__: SessionHook })
      .__MIRROR_HOUSE_DEBUG__;
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

/** The HUD run-clock chip's seconds (`⏳ Timer 3.4s`, `—` before the first
 *  input) as a bare number — the pause-proof leg reads it twice. */
const timerSeconds = (page: Page) =>
  page.evaluate(() => {
    const text = document.getElementById('mh-timer')?.textContent ?? '';
    return Number(text.replace(/[^0-9.]/g, '')) || 0;
  });

/**
 * Seed a stored campaign save (floor 2 of base SESSDOOR) directly into the
 * app's own IndexedDB record — the `save` store of the `mirror-house`
 * database, version 1, key `main` (the exact coordinates save.ts reads).
 * The object is the well-formed save v2 shape: the boot's validateSave gate
 * accepts it whole (a11y/perf are legitimately absent — pre-M5 saves — and
 * normalizeSave heals them), so the resume path is the app's own, exercised
 * unmodified. Ends with a reload onto the bare path so the boot chain reads
 * the seeded record and plates the stored-campaign choice.
 */
async function seedStoredCampaignAndReload(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page); // first load: the boot poster ran, boot-seen is set
  await page.evaluate(() => {
    const save = {
      v: 2,
      lookName: 'indigo-gold',
      mode: 'hybrid',
      muted: false,
      lang: 'en',
      shards: 0,
      best: {},
      streak: { count: 0, lastDay: '' },
      progress: { seedBase: 'SESSDOOR', floor: 2, tierComplete: false },
    };
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('mirror-house', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('save')) db.createObjectStore('save');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('save', 'readwrite');
        tx.objectStore('save').put(save, 'main');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      req.onerror = () => reject(req.error);
    });
  });
  await page.goto('/'); // a fresh load WITHOUT a seed — the save drives the boot
  await ready(page);
}

// T13/T3 (1) — THE FRONT DOOR GATES THE HOUSE. A bare URL plates the world
// (the boot poster fades, the door mounts, BEGIN THE DESCENT focused); a held
// W moves nobody while the plate stands (the capture-phase swallowers keep
// the session deaf — and the run clock unarmed); BEGIN alone opens the door,
// and the first key AFTER it walks and arms the timer, exactly as shipped.
test('session: start screen gates the house', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/'); // bare URL — no seed, no test flag: the honest mount timing

  // the poster holds ~1.6 s, fades, and the door mounts in its place
  const plate = page.locator('#mh-start');
  await expect(plate).toBeVisible({ timeout: 6000 });
  await expect(page.locator('#mh-start-play')).toHaveText('BEGIN THE DESCENT');
  await expect(page.locator('#mh-start-play')).toBeFocused(); // the trap lands focus at once

  // the world is already live behind the plate — but deaf: a held W moves
  // nobody and arms nothing
  await ready(page);
  const plated0 = await player(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  const plated1 = await player(page);
  await page.keyboard.up('KeyW');
  expect(Math.hypot(plated1.x - plated0.x, plated1.y - plated0.y)).toBeLessThan(0.05);
  expect(await timerSeconds(page)).toBe(0); // the clock was never armed

  // BEGIN is the whole key: one click opens the door
  await page.locator('#mh-start-play').click();
  await expect(plate).toHaveCount(0); // removed, not hidden — the gate never re-plates

  // the first input after dismissal walks AND arms the timer
  const freed0 = await player(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  const freed1 = await player(page);
  expect(Math.hypot(freed1.x - freed0.x, freed1.y - freed0.y)).toBeGreaterThan(0.5);
  expect(await timerSeconds(page)).toBeGreaterThan(0); // the run clock started
  await page.keyboard.up('KeyW');
  expect(errors).toEqual([]);
});

// T13/T3 (2) — THE STORED CAMPAIGN CONTINUES. A save v2 record seeded into
// the app's own IDB store (floor 2 of base SESSDOOR, validateSave-clean)
// re-plates the door as CONTINUE — FLOOR 2 with the NEW HOUSE ghost beside
// it and the save's mini-stats line. NEW HOUSE is the composition pin: the
// click randomizes the campaign (a fresh random base replaces the stored
// one and the floor chip returns to L01). The record is re-seeded after, and
// CONTINUE takes the app's own resume path: the boot chain rebuilds floor 2
// under the plate and the floor chip reads it.
test('session: stored campaign shows CONTINUE — FLOOR N', async ({ page }) => {
  const errors = collectErrors(page);
  await seedStoredCampaignAndReload(page);

  // the plate names the campaign, not a fresh descent
  const plate = page.locator('#mh-start');
  await expect(plate).toBeVisible();
  await expect(page.locator('#mh-start-play')).toHaveText('CONTINUE — FLOOR 2');
  await expect(page.locator('#mh-start-new')).toHaveText('NEW HOUSE'); // the ghost secondary
  await expect(page.locator('#mh-start-stats')).toBeVisible(); // a save exists — the stats line shows

  // the NEW HOUSE pin: a click randomizes the campaign — the seed leaves the
  // stored base and the floor chip returns to L01 (playAgain's fresh spine)
  const stored = await hookOf(page);
  await page.locator('#mh-start-new').click();
  await expect(plate).toHaveCount(0); // the door opened onto the fresh house
  const fresh = await hookOf(page);
  expect(fresh.seed).not.toBe(stored.seed); // a new random base replaced SESSDOOR
  await expect(page.locator('#mh-floor')).toHaveText('L01');

  // CONTINUE dismisses onto the floor the save named — the app's resume path
  // (the record is re-seeded first: NEW HOUSE banked its fresh spine over it)
  await seedStoredCampaignAndReload(page);
  await expect(page.locator('#mh-start')).toBeVisible();
  await page.locator('#mh-start-play').click();
  await expect(plate).toHaveCount(0);
  const resumed = await hookOf(page);
  expect(resumed.campaign).toEqual({ base: 'SESSDOOR', floor: 2, tierComplete: false });
  expect(resumed.seed).toBe('SESSDOOR:2'); // floor 2 of the stored base, rebuilt
  await expect(page.locator('#mh-floor')).toHaveText('L02');
  expect(errors).toEqual([]);
});

// T13/T3 (3) — THE PAUSE FREEZES, THE CLOCK DOES NOT. Begin a session under
// ?test=1 (the poster skipped — the first frame is the door), walk to arm the
// run, then pause from the dock chip with W still held: the position freezes
// solid behind the PAUSED plate while the run clock keeps counting through
// it (the plate's own honesty line); RESUME — and the still-held W resumes
// the walk. KeyP drives the same toggle: the chip and the key are one switch.
test('session: pause freezes and resumes', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?test=1'); // bare of seeds; test mode skips the boot poster

  // the door plates at once — open it
  const plate = page.locator('#mh-start');
  await expect(plate).toBeVisible();
  await page.locator('#mh-start-play').click();
  await expect(plate).toHaveCount(0);

  // walk: the first input starts the run — the pause needs a clock to betray
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(300);
  expect(await timerSeconds(page)).toBeGreaterThan(0); // running, not ready

  // pause from the dock chip — the PAUSED plate rises, the chip flips
  await page.locator('#mh-pause').click();
  const pausedPlate = page.locator('#mh-paused');
  await expect(pausedPlate).toBeVisible();
  await expect(page.locator('#mh-pause')).toHaveAttribute('aria-pressed', 'true');

  // FROZEN: W is still held, but the position does not move a hair
  const frozen0 = await player(page);
  await page.waitForTimeout(600);
  const frozen1 = await player(page);
  expect(Math.hypot(frozen1.x - frozen0.x, frozen1.y - frozen0.y)).toBeLessThan(0.05);

  // THE CLOCK KEEPS COUNTING: the run timer advances THROUGH the plate — the
  // pause-proof rule said to the player's face on the plate's own line
  await expect(pausedPlate).toContainText(/clock keeps counting/i);
  const t0 = await timerSeconds(page);
  await page.waitForTimeout(1300);
  const t1 = await timerSeconds(page);
  expect(t1).toBeGreaterThan(t0);

  // RESUME — the plate's own button — releases the still-held W immediately
  await page.locator('#mh-paused-resume').click();
  await expect(pausedPlate).toBeHidden();
  await expect(page.locator('#mh-pause')).toHaveAttribute('aria-pressed', 'false');
  const resumed0 = await player(page);
  await page.waitForTimeout(600);
  const resumed1 = await player(page);
  expect(Math.hypot(resumed1.x - resumed0.x, resumed1.y - resumed0.y)).toBeGreaterThan(0.5);
  await page.keyboard.up('KeyW');

  // KeyP parity — the keymap's pause action drives the same toggle, both ways
  await page.keyboard.press('KeyP');
  await expect(pausedPlate).toBeVisible();
  await page.keyboard.press('KeyP');
  await expect(pausedPlate).toBeHidden();
  expect(errors).toEqual([]);
});

// T14/t13 rider — THE PAUSE STANDS DOWN UNDER A MODAL, AND RESUME RETURNS
// FOCUS. With the FAQ dialog open over a running floor, KeyP must not raise
// the PAUSED plate beneath it (the plate's RESUME door would steal the
// dialog's focus) and the dock chip must not flip either: togglePause
// early-returns while any trapped dialog stands, and the chip's click runs
// the same toggle — one guard, both doors. Closed, KeyP pauses and resumes
// exactly as shipped — and resume returns focus to where the pause found it:
// the dock chip after a chip-click pause, body after a keyboard pause (the
// old behavior stranded focus on the plate's hidden button → body by
// accident; now it is the recorded element, deliberately).
test('session: pause stands down while a modal is open', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/?test=1');
  const plate = page.locator('#mh-start');
  await expect(plate).toBeVisible();
  await page.locator('#mh-start-play').click();
  await expect(plate).toHaveCount(0);

  // arm the run — the pause needs a running session to have something to say
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyW');

  // chip-click pause: the RESUME door takes focus (as shipped), and KeyP
  // resume hands focus BACK to the chip the pause was taken from
  await page.locator('#mh-pause').click();
  await expect(page.locator('#mh-paused')).toBeVisible();
  await expect(page.locator('#mh-paused-resume')).toBeFocused();
  await page.keyboard.press('KeyP');
  await expect(page.locator('#mh-paused')).toBeHidden();
  await expect
    .poll(
      () =>
        page.evaluate(() => document.activeElement === document.getElementById('mh-pause')),
      'resume returns focus to the chip the pause was taken from',
    )
    .toBe(true);

  // the FAQ over the running floor, then KeyP at it: the plate stays down,
  // the chip stays unpressed, and the dialog keeps the keyboard
  await page.keyboard.press('KeyH');
  await expect(page.locator('#mh-faq-overlay')).toBeVisible();
  await page.keyboard.press('KeyP');
  await expect(page.locator('#mh-paused')).toBeHidden();
  await expect(page.locator('#mh-pause')).toHaveAttribute('aria-pressed', 'false');
  const focusInFaq = await page.evaluate(
    () => document.getElementById('mh-faq-overlay')?.contains(document.activeElement) ?? false,
  );
  expect(focusInFaq, 'the FAQ keeps its focus — the plate never stole it').toBe(true);

  // the dock chip's click runs the same guard — even a forced click refuses
  await page.locator('#mh-pause').click({ force: true });
  await expect(page.locator('#mh-paused')).toBeHidden();
  await expect(page.locator('#mh-pause')).toHaveAttribute('aria-pressed', 'false');

  // Esc closes the FAQ; KeyP now pauses (the RESUME door takes focus, as
  // shipped) and resumes — focus lands back on body, not on the hidden plate
  await page.keyboard.press('Escape');
  await expect(page.locator('#mh-faq-overlay')).toBeHidden();
  await page.keyboard.press('KeyP');
  await expect(page.locator('#mh-paused')).toBeVisible();
  await expect(page.locator('#mh-paused-resume')).toBeFocused();
  await page.keyboard.press('KeyP');
  await expect(page.locator('#mh-paused')).toBeHidden();
  // Chrome applies the hidden-focused-button's focus reset lazily, so the
  // read polls instead of sampling once
  await expect
    .poll(
      () => page.evaluate(() => document.activeElement === document.body),
      'resume returns focus to where the pause found it',
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
