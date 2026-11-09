// SPDX-License-Identifier: Apache-2.0
//
// M5/T6 — the soak runner. Builds the game in `--mode soak` (the production
// bundle PLUS the dev faucet — see main.ts's guard), serves it through the
// REAL preview server (`vite preview`), and plays a scripted loop against it
// with Playwright's library API: walk → frost a beacon → warp into an Echo's
// grip (fail + restart) → repeat. Every 30s it samples the JS heap
// (performance.memory) and the renderer census (the dev hook's rendererInfo:
// geometries/textures climb if a floor rebuild leaks) and prints the trend.
//
// Usage: node scripts/soak.mjs [--minutes N]   (default 10; the pre-beta
// criterion is --minutes 120 — a RUNBOOK step for a long quiet machine.)

import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

// ---- args --------------------------------------------------------------------
const argv = process.argv.slice(2);
const minutes = Number(argv.includes('--minutes') ? argv[argv.indexOf('--minutes') + 1] : 10);
const PORT = argv.includes('--port') ? Number(argv[argv.indexOf('--port') + 1]) : 4180;
// vite preview binds "localhost" — on some machines that is ::1 only, so the
// probe tries both spellings before giving up.
const CANDIDATES = [`http://localhost:${PORT}/`, `http://127.0.0.1:${PORT}/`];
let BASE = CANDIDATES[0];
const SAMPLE_EVERY_MS = 30_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- build (soak mode) + preview server --------------------------------------
console.log(`[soak] building (vite build --mode soak) …`);
const build = spawnSync('npm', ['run', 'build', '--', '--mode', 'soak'], {
  shell: true,
  stdio: 'inherit',
});
if (build.status !== 0) {
  console.error('[soak] build failed');
  process.exit(1);
}

console.log(`[soak] starting vite preview on :${PORT}`);
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let previewLog = '';
preview.stdout.on('data', (d) => (previewLog += d));
preview.stderr.on('data', (d) => (previewLog += d));
const killPreview = () => {
  if (preview.exitCode !== null) return;
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { shell: true });
  else preview.kill('SIGTERM');
};
process.on('SIGINT', () => {
  killPreview();
  process.exit(130);
});

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  for (const candidate of CANDIDATES) {
    try {
      const res = await fetch(candidate);
      if (res.ok) {
        BASE = candidate;
        up = true;
        break;
      }
    } catch {
      /* not this spelling (yet) */
    }
  }
  if (!up) await sleep(500);
}
if (!up) {
  console.error('[soak] preview never answered:\n' + previewLog);
  killPreview();
  process.exit(1);
}

// ---- the game loop ------------------------------------------------------------
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE);
await page.waitForFunction(
  () => window.__MIRROR_HOUSE_DEBUG__ !== undefined,
  null,
  { timeout: 30_000 },
);
await page.keyboard.press('KeyZ'); // first gesture: start the engine (and the clock)
await page.keyboard.press('KeyM'); // mute — the soak listens to memory, not music

const hook = (fn) => page.evaluate(`(${fn})()`);
const PLAYER_NEAR = 0.01;

/** One scripted slice of play: walk a stretch, frost the next beacon, get
 *  caught and restart. Each step is best-effort — a timeout logs and moves on
 *  (the point is the memory trend, not a perfect run). */
async function cycle() {
  // walk (~1.4s) with a turn
  await page.keyboard.down('KeyW');
  await sleep(700);
  await page.keyboard.press('KeyQ');
  await sleep(700);
  await page.keyboard.up('KeyW');

  // frost the next beacon (warp in front of it, face it, breathe)
  try {
    const m = await hook(() => window.__MIRROR_HOUSE_DEBUG__.mirrorAt('beacon'));
    if (m) {
      const d = Math.hypot(m.cx - m.x, m.cy - m.z) || 1;
      const sx = m.x + ((m.cx - m.x) / d) * 1.0;
      const sz = m.z + ((m.cy - m.z) / d) * 1.0;
      await hook(`() => window.__MIRROR_HOUSE_DEBUG__.warp(${sx}, ${sz}, ${Math.atan2(m.x - sx, -(m.z - sz))})`);
      await page.waitForFunction(
        () => window.__MIRROR_HOUSE_DEBUG__.breath() >= 0.34,
        null,
        { timeout: 5_000 },
      );
      await page.keyboard.press('KeyF');
      await sleep(400); // let the frost land in the runtime
    }
  } catch {
    console.log('[soak] frost step timed out — continuing');
  }

  // warp-caught: into Echo 0's grip, fail, restart, back at spawn
  try {
    const e = await hook(() => window.__MIRROR_HOUSE_DEBUG__.enemyPos(0));
    if (e) {
      await hook(`() => window.__MIRROR_HOUSE_DEBUG__.warp(${e.x}, ${e.y})`);
      await page.waitForFunction(() => window.__MIRROR_HOUSE_DEBUG__.house().failed, null, {
        timeout: 3_000,
      });
      await page.waitForFunction(
        () => !window.__MIRROR_HOUSE_DEBUG__.house().failed,
        null,
        { timeout: 5_000 },
      );
    }
  } catch {
    console.log('[soak] warp-caught step timed out — continuing');
  }
}

async function sample() {
  return page.evaluate(() => {
    const h = window.__MIRROR_HOUSE_DEBUG__;
    const mem = performance.memory; // Chromium-only; null elsewhere
    return {
      heap: mem ? mem.usedJSHeapSize : null,
      heapTotal: mem ? mem.totalJSHeapSize : null,
      info: h.rendererInfo(),
      fps: h.perf().fpsAvg,
      floor: h.campaign().floor,
      attempts: h.attempts(),
    };
  });
}

const MB = (n) => (n === null ? '—' : (n / 1048576).toFixed(1));
const rows = [];
function logRow(s) {
  const t = Math.round((Date.now() - startedAt) / 1000);
  const row = {
    t,
    heap: s.heap,
    geo: s.info.geometries,
    tex: s.info.textures,
    calls: s.info.calls,
    tris: s.info.triangles,
    fps: s.fps === null ? null : Math.round(s.fps),
    floor: s.floor,
    attempts: s.attempts,
  };
  rows.push(row);
  console.log(
    `[soak] t=${String(t).padStart(4)}s heap=${MB(row.heap).padStart(7)}MB geo=${String(row.geo).padStart(4)} tex=${String(row.tex).padStart(4)} calls=${String(row.calls).padStart(4)} tris=${String(row.tris).padStart(7)} fps=${row.fps ?? '—'} floor=${row.floor} attempts=${row.attempts}`,
  );
}

const startedAt = Date.now();
const deadline = startedAt + minutes * 60_000;
logRow(await sample()); // the t=0 baseline
let lastSample = Date.now();
let cycles = 0;
while (Date.now() < deadline) {
  await cycle();
  cycles++;
  if (Date.now() - lastSample >= SAMPLE_EVERY_MS) {
    logRow(await sample());
    lastSample = Date.now();
  }
}
logRow(await sample()); // the closing sample

// ---- the trend table ----------------------------------------------------------
console.log(`\n[soak] ${cycles} cycles over ${Math.round((Date.now() - startedAt) / 1000)}s`);
console.log('  time    heap(MB)   Δheap    geometries  textures  draw calls  triangles   fps  floor  attempts');
const first = rows[0];
const last = rows[rows.length - 1];
for (const r of rows) {
  const dHeap = r.heap !== null && first.heap !== null ? ((r.heap - first.heap) / 1048576).toFixed(2) : '—';
  console.log(
    `  ${String(r.t).padStart(4)}s  ${MB(r.heap).padStart(8)}  ${String(dHeap).padStart(7)}  ${String(r.geo).padStart(10)}  ${String(r.tex).padStart(8)}  ${String(r.calls).padStart(10)}  ${String(r.tris).padStart(10)}  ${String(r.fps ?? '—').padStart(4)}  ${String(r.floor).padStart(5)}  ${String(r.attempts).padStart(8)}`,
  );
}
const heapDelta =
  first.heap !== null && last.heap !== null ? ((last.heap - first.heap) / 1048576).toFixed(2) : 'n/a';
console.log(
  `\n[soak] trend: heap ${MB(first.heap)}MB → ${MB(last.heap)}MB (Δ ${heapDelta}MB), geometries ${first.geo} → ${last.geo}, textures ${first.tex} → ${last.tex} across ${rows.length} samples / ${cycles} fail-restart cycles.`,
);

await browser.close();
killPreview();
process.exit(0);
