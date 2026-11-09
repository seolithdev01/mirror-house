// SPDX-License-Identifier: Apache-2.0
//
// M6/T3 — the icon renderer. Rasterises `public/icon.svg` (the lantern) into
// every launcher/store size the project declares, with Playwright's library
// API as the only raster engine:
//
//   store-assets/icon-{512,192,180,144}.png              solid rounded-square
//   store-assets/icon-{512,192,180,144}-transparent.png  glyph on transparent
//   android/…/mipmap-{mdpi…xxxhdpi}/ic_launcher.png          48/72/96/144/192
//   android/…/mipmap-{mdpi…xxxhdpi}/ic_launcher_round.png    48/72/96/144/192
//   android/…/mipmap-{mdpi…xxxhdpi}/ic_launcher_foreground.png  108dp canvas
//                                                          (108/162/216/324/432)
//
// Variants — the adaptive-icon layers want the pieces, not the finished icon:
// the glyph alone on a transparent 108dp canvas at 60% height (safe zone is
// 66/108 ≈ 61%), the background layer being the solid indigo
// `@color/ic_launcher_background` (#0b1026, set in values/). The legacy
// square/round launchers and the store icons get the finished art. Glyph
// geometry is measured live from the SVG (getBBox + half the widest stroke),
// so the lantern can be nudged in icon.svg without touching this script.
//
// Usage: npm run icons   (every write is followed by a PNG-header assertion —
// the script fails loudly if any file lands at the wrong size.)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = path.join(ROOT, 'public', 'icon.svg');
const STORE_DIR = path.join(ROOT, 'store-assets');
const RES_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const NIGHT = '#0b1026'; // matches icon.svg's backdrop + values/ic_launcher_background

// mdpi … xxxhdpi: legacy launcher dp 48, adaptive canvas dp 108.
const DENSITIES = [
  { name: 'mdpi', scale: 1 },
  { name: 'hdpi', scale: 1.5 },
  { name: 'xhdpi', scale: 2 },
  { name: 'xxhdpi', scale: 3 },
  { name: 'xxxhdpi', scale: 4 },
];
const LEGACY_DP = 48;
const ADAPTIVE_DP = 108;
const GLYPH_FRACTION_STORE = 0.8; // glyph height / canvas, transparent variant
const GLYPH_FRACTION_ADAPTIVE = 0.6; // ≤ 66/108 safe zone

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- svg plumbing -------------------------------------------------------------

/** Inline the icon into a page and measure the lantern's bounding box. */
async function measureGlyph(page, svgText) {
  await page.setContent(
    `<!doctype html><meta charset="utf-8">
     <style>html,body{margin:0;background:transparent}</style>
     ${svgText.replace('<svg ', '<svg width="512" height="512" ')}`,
  );
  const raw = await page.$eval('svg > g', (g) => {
    const b = g.getBBox();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  // getBBox ignores stroke; the hook's 16px stroke is the widest, so pad by 8.
  const pad = 8;
  const x = raw.x - pad;
  const y = raw.y - pad;
  const width = raw.width + 2 * pad;
  const height = raw.height + 2 * pad;
  return { x, y, width, height, cx: x + width / 2, cy: y + height / 2 };
}

/** Build one absolutely-positioned, glyph-centred canvas div. */
function shot(id, size, svgText, glyph, { fraction, hideBackdrop, background, radius }) {
  // fraction=null → natural in-icon scale (svg rendered 1:1 with the canvas).
  const k = fraction === null ? size / 512 : (fraction * size) / glyph.height;
  const left = size / 2 - glyph.cx * k;
  const top = size / 2 - glyph.cy * k;
  const dims = `left:${left}px;top:${top}px;width:${512 * k}px;height:${512 * k}px`;
  const cls = hideBackdrop ? ' class="nog"' : '';
  const svg = svgText.replace('<svg ', `<svg${cls} style="position:absolute;${dims}" `);
  const bg = background ? `background:${background};` : '';
  const br = radius ? `border-radius:${radius};` : '';
  return `<div id="${id}" style="position:relative;overflow:hidden;width:${size}px;height:${size}px;${bg}${br}">${svg}</div>`;
}

/** Read the IHDR chunk back and assert the PNG is exactly w×h. */
async function assertPng(file, w, h) {
  const buf = await readFile(file);
  const ok =
    buf.length > 24 &&
    buf.readUInt32BE(16) === w &&
    buf.readUInt32BE(20) === h &&
    buf[25] === 6; /* RGBA */
  if (!ok)
    throw new Error(
      `${file}: expected ${w}x${h} RGBA, got ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)} type ${buf[25]}`,
    );
  return buf.length;
}

// ---- main ----------------------------------------------------------------------

const svgText = await readFile(SVG_PATH, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 640, height: 900 } });
const glyph = await measureGlyph(page, svgText);
console.log(
  `[gen-icons] lantern bbox ${Math.round(glyph.width)}×${Math.round(glyph.height)} at (${Math.round(glyph.cx)}, ${Math.round(glyph.cy)}) of 512`,
);

// Every render, in one page: id → { file, size }.
const jobs = [];
const add = (id, file, size) => jobs.push({ id, file, size });

await mkdir(STORE_DIR, { recursive: true });
for (const s of [512, 192, 180, 144]) {
  add(`solid-${s}`, path.join(STORE_DIR, `icon-${s}.png`), s);
  add(`trans-${s}`, path.join(STORE_DIR, `icon-${s}-transparent.png`), s);
}
for (const d of DENSITIES) {
  const legacy = LEGACY_DP * d.scale;
  const adaptive = ADAPTIVE_DP * d.scale;
  const dir = path.join(RES_DIR, `mipmap-${d.name}`);
  add(`legacy-${d.name}`, path.join(dir, 'ic_launcher.png'), legacy);
  add(`round-${d.name}`, path.join(dir, 'ic_launcher_round.png'), legacy);
  add(`fg-${d.name}`, path.join(dir, 'ic_launcher_foreground.png'), adaptive);
}

const shots = jobs.map(({ id, size }) => {
  if (id.startsWith('solid-') || id.startsWith('legacy-'))
    return shot(id, size, svgText, glyph, {}); // finished icon, as drawn
  if (id.startsWith('round-'))
    return shot(id, size, svgText, glyph, { hideBackdrop: true, background: NIGHT, radius: '50%' });
  if (id.startsWith('trans-'))
    return shot(id, size, svgText, glyph, { hideBackdrop: true, fraction: GLYPH_FRACTION_STORE });
  return shot(id, size, svgText, glyph, { hideBackdrop: true, fraction: GLYPH_FRACTION_ADAPTIVE }); // fg-*
});

await page.setContent(
  `<!doctype html><meta charset="utf-8">
   <style>
     html,body{margin:0;background:transparent}
     body > div{margin:8px}
     svg.nog > rect{display:none} /* the 512² backdrop only — the lantern's panes live inside <g> */
   </style>
   ${shots.join('\n')}`,
);
await sleep(60); // settle rasterisation

let total = 0;
for (const { id, file, size } of jobs) {
  await page.locator(`#${id}`).screenshot({ path: file, omitBackground: true });
  const bytes = await assertPng(file, size, size);
  total += bytes;
  console.log(
    `[gen-icons] ${path.relative(ROOT, file)} — ${size}×${size} RGBA, ${(bytes / 1024).toFixed(1)} KiB`,
  );
}
await browser.close();
console.log(
  `[gen-icons] ${jobs.length} PNGs, ${(total / 1024).toFixed(1)} KiB total — all headers verified`,
);
