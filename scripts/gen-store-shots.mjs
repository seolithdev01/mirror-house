// SPDX-License-Identifier: Apache-2.0
//
// T16/T4 — the store SCREENSHOT raster. Generates the two consoles' interim
// phone-screenshot sets from the REAL game running in a PROD build (vite
// build → vite preview), driven by Playwright's library API — the same
// conventions as scripts/gen-icons.mjs (screenshots + PNG-header assertions
// that fail loudly on any wrong-size file).
//
//   store-assets/screenshots/play/play-0{1,2,3}-*.png   1080×1920 (Play phone)
//   store-assets/screenshots/ios/ios-67-1290x2796-*.png  6.7" App Store set
//   store-assets/screenshots/ios/ios-61-1170x2532-*.png  6.1" App Store set
//
// Three scenes, per the listing manifest (docs/STORE-LISTING.md):
//   start — the front door: the MIRROR/HOUSE plate with BEGIN THE DESCENT
//   maze  — gameplay in Focus view, the Pac-minimap pane open (gold arrow,
//           teal beacons), framed on a beacon mirror via the ?test=1 hook
//   pause — the PAUSED plate mid-run ("the clock keeps counting" note live)
//
// Geometry, honestly named:
//   play    — 1080×1920 CSS viewport at deviceScaleFactor 2.75, then an
//             exact 1/2.75 canvas downscale (2970×5280 → 1080×1920): the
//             supersampled render Play's 9:16 slot wants, at exact pixels.
//   ios 6.7 — 430×932 CSS at dsf 3 → exact 1290×2796 (iPhone 14/15 Pro Max).
//   ios 6.1 — 390×844 CSS at dsf 3 → exact 1170×2532 (iPhone 13/14).
//
// Every page loads with `?test=1` (the brief's pin): in a PROD build that
// unlocks the diagnostics hook (warp/beacon framing) and skips the boot
// poster. The hook is steering only — the pixels are the game's own render.
// The two tester-mode surfaces (the TESTER chip and its one-time banner) are
// diagnostic chrome, not player HUD, so the shot pass hides them via CSS.
//
// THE HIERARCHY (docs/STORE-SUBMISSION.md): these are the documented FALLBACK
// set. The controller's real-android-emulator pass supersedes the play/ files
// when it lands; the iOS set stays interim until a Mac refreshes it from
// TestFlight builds before App Review.
//
// Usage: node scripts/gen-store-shots.mjs   (builds dist/ first, serves it,
//          writes 9 PNGs, asserts every header, tears the server down)

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAY_DIR = path.join(ROOT, 'store-assets', 'screenshots', 'play');
const IOS_DIR = path.join(ROOT, 'store-assets', 'screenshots', 'ios');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Read the IHDR chunk back and assert the PNG is exactly w×h (type 2 RGB or
 *  6 RGBA — Chromium picks per content; both upload fine when opaque). */
async function assertPng(file, w, h) {
  const buf = await readFile(file);
  const type = buf[25];
  const ok =
    buf.length > 24 &&
    buf.readUInt32BE(16) === w &&
    buf.readUInt32BE(20) === h &&
    (type === 2 || type === 6);
  if (!ok)
    throw new Error(
      `${file}: expected ${w}x${h} PNG, got ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)} type ${type}`,
    );
  return { bytes: buf.length, type };
}

// ---- server (vite build, then vite preview torn down at exit) -------------------

function viteBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`vite build exited ${code}\n${out}`))));
  });
}

function startPreview() {
  const child = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js'.replace(/\//g, path.sep), 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.log = () => out;
  return child;
}

async function waitUntilUp(url, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error(`preview server never came up at ${url}`);
}

// ---- scenes -----------------------------------------------------------------------

const HIDE_TESTER_CSS =
  '#mh-tester, #mh-tester-banner, #diagnostics { display: none !important; }';

/** Wait for the PROD diagnostics hook (?test=1 unlocks it in any build). */
async function hookReady(page) {
  await page.waitForFunction(() => window.__MIRROR_HOUSE_DEBUG__ !== undefined);
}

/** The front door: a brand-new save with no URL seed plates BEGIN THE DESCENT. */
async function sceneStart(page) {
  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () => document.getElementById('mh-start-play')?.textContent === 'BEGIN THE DESCENT',
  );
  await page.addStyleTag({ content: HIDE_TESTER_CSS });
  await page.evaluate(() => document.fonts.ready);
  await sleep(400); // let the plate's entrance settle
}

/** Gameplay: Focus view on a seeded floor, minimap pane confirmed open,
 *  framed ~2.2 m from an unfrosted beacon mirror, dead ahead. */
async function sceneMaze(page) {
  await page.goto(`${BASE}/?seed=PLAYTEST&test=1`);
  await hookReady(page);
  await page.addStyleTag({ content: HIDE_TESTER_CSS });
  await page.evaluate(() => document.fonts.ready);
  await sleep(900); // first frames of the floor render

  // the Pac-minimap boots ON on a wide fine-pointer viewport; enforce it
  // anyway (KeyN is the documented toggle) so the pane is always in frame.
  const mapOn = await page.evaluate(() => window.__MIRROR_HOUSE_DEBUG__.minimap());
  if (!mapOn) await page.keyboard.press('KeyN');
  await page.waitForFunction(() => window.__MIRROR_HOUSE_DEBUG__.minimap());

  // Frame an unfrosted beacon in a live corridor: back off along the mirror's
  // outward normal to the farthest candidate stand point with clear grid LOS
  // to the glass (the hook's own los() — never inside a wall), then face the
  // glass dead on — the e2e's captureNextBeacon framing math, at
  // store-screenshot distance. No F press: the beacon stays teal for the shot.
  await page.evaluate(() => {
    const h = window.__MIRROR_HOUSE_DEBUG__;
    const m = h.mirrorAt('beacon');
    if (!m) throw new Error('no unfrosted beacon to frame');
    const d = Math.hypot(m.cx - m.x, m.cy - m.z);
    const ux = (m.cx - m.x) / d; // mirror centre → outward (into the room)
    const uz = (m.cy - m.z) / d;
    let dist = 0;
    for (const cand of [5.2, 4.4, 3.6, 2.8, 2.0]) {
      const sx = m.x + ux * cand;
      const sz = m.z + uz * cand;
      if (h.los(sx, sz, m.cx, m.cy)) {
        dist = cand;
        break;
      }
    }
    if (dist === 0) throw new Error('no legal stand point in front of the beacon');
    const sx = m.x + ux * dist;
    const sz = m.z + uz * dist;
    const heading = Math.atan2(m.cx - sx, -(m.cy - sz)); // heading 0 = north (−z)
    h.warp(sx, sz, heading);
  });
  await sleep(2600); // mirror reflections + minimap repaint settle (software GL ramps slowly)
}

/** Mid-run pause: the PAUSED plate over the framed floor (KeyP default).
 *  pauseDecision only arms in a RUNNING session — the run clock starts on
 *  the first real input — so one backpedalling step arms it honestly (and
 *  backpedal keeps the framed beacon in view behind the plate). */
async function scenePause(page) {
  await page.keyboard.down('KeyS');
  await sleep(250);
  await page.keyboard.up('KeyS');
  await page.keyboard.press('KeyP');
  await page.waitForSelector('#mh-paused', { state: 'visible' });
  await sleep(300);
}

const SCENES = [
  ['start', sceneStart],
  ['maze', sceneMaze],
  ['pause', scenePause],
];

// ---- devices ----------------------------------------------------------------------

const DEVICES = [
  {
    tag: 'play',
    dir: PLAY_DIR,
    viewport: { width: 1080, height: 1920 },
    dsf: 2.75,
    outW: 1080,
    outH: 1920,
    resample: true, // 2970×5280 → exact 1080×1920 via one high-quality downscale
    files: { start: 'play-01-start.png', maze: 'play-02-maze.png', pause: 'play-03-pause.png' },
  },
  {
    tag: 'ios67',
    dir: IOS_DIR,
    viewport: { width: 430, height: 932 }, // iPhone 14/15 Pro Max CSS
    dsf: 3,
    outW: 1290,
    outH: 2796,
    resample: false, // 430×932 × 3 = 1290×2796 exactly
    files: {
      start: 'ios-67-1290x2796-start.png',
      maze: 'ios-67-1290x2796-maze.png',
      pause: 'ios-67-1290x2796-pause.png',
    },
  },
  {
    tag: 'ios61',
    dir: IOS_DIR,
    viewport: { width: 390, height: 844 }, // iPhone 13/14 CSS
    dsf: 3,
    outW: 1170,
    outH: 2532,
    resample: false, // 390×844 × 3 = 1170×2532 exactly
    files: {
      start: 'ios-61-1170x2532-start.png',
      maze: 'ios-61-1170x2532-maze.png',
      pause: 'ios-61-1170x2532-pause.png',
    },
  },
];

/** One high-quality 1/2.75 downscale inside the browser: the raw dsf-2.75
 *  PNG goes in as a data URL, the exact 1080×1920 PNG bytes come back out. */
async function writeDownscaled(browser, rawPng, file, outW, outH) {
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c" width="${outW}" height="${outH}"></canvas>`);
  const dataUrl = await page.evaluate(
    async ({ b64, w, h }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('raw shot did not decode'));
        img.src = `data:image/png;base64,${b64}`;
      });
      const ctx = document.getElementById('c').getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return document.getElementById('c').toDataURL('image/png');
    },
    { b64: rawPng.toString('base64'), w: outW, h: outH },
  );
  await page.close();
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

// ---- main --------------------------------------------------------------------------

console.log('[gen-store-shots] vite build (the shots must be PROD truth)…');
await viteBuild();
console.log('[gen-store-shots] serving dist/ via vite preview…');
const server = startPreview();
let browser = null;
try {
  await waitUntilUp(BASE, 30_000);
  await mkdir(PLAY_DIR, { recursive: true });
  await mkdir(IOS_DIR, { recursive: true });
  browser = await chromium.launch();

  let total = 0;
  for (const dev of DEVICES) {
    const context = await browser.newContext({
      viewport: dev.viewport,
      deviceScaleFactor: dev.dsf,
    });
    const page = await context.newPage();
    for (const [name, scene] of SCENES) {
      await scene(page);
      const file = path.join(dev.dir, dev.files[name]);
      if (dev.resample) {
        const raw = await page.screenshot({ type: 'png' }); // 2970×5280 physical
        await writeDownscaled(browser, raw, file, dev.outW, dev.outH);
      } else {
        await page.screenshot({ path: file, type: 'png' }); // exact by geometry
      }
      const { bytes, type } = await assertPng(file, dev.outW, dev.outH);
      total += bytes;
      console.log(
        `[gen-store-shots] ${path.relative(ROOT, file)} — ${dev.outW}×${dev.outH} type ${type}, ${(bytes / 1024).toFixed(1)} KiB`,
      );
    }
    await context.close();
  }
  console.log(
    `[gen-store-shots] ${DEVICES.length * SCENES.length} PNGs, ${(total / 1024).toFixed(1)} KiB total — all headers verified`,
  );
} finally {
  // a mid-scene throw must not leave a headless Chromium (or the preview
  // server) lingering — the close is best-effort so the original error keeps
  // its place as the failure reason
  if (browser !== null) await browser.close().catch(() => {});
  server.kill();
}
