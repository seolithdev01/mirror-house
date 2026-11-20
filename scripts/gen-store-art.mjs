// SPDX-License-Identifier: Apache-2.0
//
// T16/T4 — the store FEATURE GRAPHIC renderer. Rasterises the Play listing's
// one 1024×500 banner (`store-assets/feature-graphic-1024x500.png`) with
// Playwright's library API as the only raster engine — the exact conventions
// of scripts/gen-icons.mjs (element screenshot + PNG-header assertion).
//
// Composition (the PoD boot-poster language, promoted to a store banner):
//   · night-indigo #0b1026 ground (the icon backdrop's exact night)
//   · the lantern (`public/icon.svg`) large on the left third — glyph
//     geometry measured live with getBBox like gen-icons, so nudging the
//     SVG never desyncs this banner
//   · MIRROR HOUSE in Big Shoulders Display, cream — the boot plate's voice
//   · a yellow skew(-9°) tagline plate (the PoD plate idiom: the district
//     plate's skew, the primary button's yellow/ink pairing) reading
//     `DESCEND · 100 FLOORS · ONE DOOR`
//   · Mukta small print: `free · no ads · your save stays on your device`
//
// All ink stays inside the 10% margin (Play crops/zooms this graphic for the
// video-preview thumbnail). Fonts are the same self-hosted woff2 the game
// ships (public/fonts), inlined as base64 data: URLs — no network, no file://
// grants. Every write is followed by a PNG-header assertion that fails loudly
// if the banner lands at anything other than exactly 1024×500.
//
// Usage: node scripts/gen-store-art.mjs

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = path.join(ROOT, 'public', 'icon.svg');
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');
const OUT_PATH = path.join(ROOT, 'store-assets', 'feature-graphic-1024x500.png');

const NIGHT = '#0b1026'; // the icon backdrop's night indigo
const INK = '#1b1a24'; // PoD ink — the plate's text
const CREAM = '#fff4e2'; // PoD cream — the title
const YELLOW = '#ffc20e'; // PoD yellow — the tagline plate
const MUTED = '#b9b2c9'; // PoD muted — the small print

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** woff2 → base64 data: URL (the rendered page gets fonts without network). */
async function fontDataUrl(file, mime) {
  return `data:${mime};base64,${(await readFile(file)).toString('base64')}`;
}

/** Read the IHDR chunk back and assert the PNG is exactly w×h, opaque-safe.
 *  Chromium encodes a fully opaque element as truecolor RGB (type 2) — the
 *  exact "24-bit PNG, no alpha" Play's asset spec asks for — and a shot with
 *  transparency as RGBA (type 6). Both are accepted; the caller logs which. */
async function assertPng(file, w, h) {
  const buf = await readFile(file);
  const type = buf[25];
  const ok =
    buf.length > 24 &&
    buf.readUInt32BE(16) === w &&
    buf.readUInt32BE(20) === h &&
    (type === 2 /* RGB, no alpha */ || type === 6); /* RGBA */
  if (!ok)
    throw new Error(
      `${file}: expected ${w}x${h} PNG (type 2 or 6), got ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)} type ${type}`,
    );
  return { bytes: buf.length, type };
}

// ---- main ----------------------------------------------------------------------

const svgText = await readFile(SVG_PATH, 'utf8');
const bsd = await fontDataUrl(path.join(FONTS_DIR, 'bsd-latin.woff2'), 'font/woff2');
const mukta = await fontDataUrl(path.join(FONTS_DIR, 'mukta-400-latin.woff2'), 'font/woff2');

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1200, height: 700 } });

// Measure the lantern's live bounding box exactly like gen-icons.mjs — the
// banner re-uses whatever the icon.svg currently draws.
await page.setContent(
  `<!doctype html><meta charset="utf-8">
   <style>html,body{margin:0;background:transparent}</style>
   ${svgText.replace('<svg ', '<svg width="512" height="512" ')}`,
);
const raw = await page.$eval('svg > g', (g) => {
  const b = g.getBBox();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
});
const pad = 8; // getBBox ignores stroke — the 16px hook stroke is widest, pad 8
const glyph = {
  cx: raw.x + raw.width / 2,
  cy: raw.y + raw.height / 2,
  height: raw.height + 2 * pad,
};
console.log(
  `[gen-store-art] lantern bbox height ${Math.round(glyph.height)} at y ${Math.round(glyph.cy)} of 512`,
);

// The banner, as one absolutely-composed 1024×500 plate. The lantern scales to
// GLYPH_H px of glyph height and hangs centred in the left third; the copy
// block sits right of it, everything inside the 10% crop margin.
const GLYPH_H = 360; // 72% of the 500px height — large on the left third
const k = GLYPH_H / glyph.height;
const lanternW = 512 * k;
const lanternCx = 182; // left third's centre
const lanternCy = 250; // vertical centre
const left = lanternCx - glyph.cx * k;
const top = lanternCy - glyph.cy * k;
const svg = svgText.replace(
  '<svg ',
  `<svg class="nog" style="position:absolute;left:${left}px;top:${top}px;width:${lanternW}px;height:${512 * k}px" `,
);

await page.setContent(
  `<!doctype html><meta charset="utf-8">
   <style>
     @font-face {
       font-family: 'Big Shoulders Display'; font-weight: 900; font-style: normal;
       font-display: block; src: url(${bsd}) format('woff2');
     }
     @font-face {
       font-family: 'Big Shoulders Display'; font-weight: 800; font-style: normal;
       font-display: block; src: url(${bsd}) format('woff2');
     }
     @font-face {
       font-family: 'Mukta'; font-weight: 400; font-style: normal;
       font-display: block; src: url(${mukta}) format('woff2');
     }
     html, body { margin: 0; background: transparent; }
     /* Play crops/zooms this graphic for the video-preview thumbnail —
        every element keeps the 10% margin. */
     #art {
       position: relative; width: 1024px; height: 500px; overflow: hidden;
       background:
         radial-gradient(circle 300px at 182px 250px, rgba(255, 233, 176, 0.10), transparent 70%),
         radial-gradient(ellipse 900px 500px at 780px 40%, rgba(38, 36, 58, 0.55), transparent 70%),
         ${NIGHT};
     }
     svg.nog > rect { display: none; } /* the 512² backdrop only — panes live in <g> */
     .copy { position: absolute; left: 392px; top: 104px; color: ${CREAM}; }
     .copy .kicker {
       font: 800 64px/0.9 'Big Shoulders Display', sans-serif;
       letter-spacing: 8px; text-transform: uppercase; color: ${CREAM};
     }
     .copy .title {
       margin: 2px 0 0;
       font: 900 164px/0.85 'Big Shoulders Display', sans-serif;
       letter-spacing: 5px; text-transform: uppercase; color: ${CREAM};
       text-shadow: 0 6px 30px rgba(0, 0, 0, 0.45);
     }
     .plate {
       display: inline-block; margin-top: 26px; transform: skew(-9deg);
       background: ${YELLOW}; color: ${INK};
       font: 800 27px/1 'Big Shoulders Display', sans-serif;
       letter-spacing: 2.5px; text-transform: uppercase;
       padding: 12px 26px; border-left: 5px solid ${INK};
     }
     .fine {
       margin-top: 24px;
       font: 400 19px/1.4 Mukta, sans-serif; color: ${MUTED}; letter-spacing: 0.3px;
     }
   </style>
   <div id="art">
     ${svg}
     <div class="copy">
       <div class="kicker">MIRROR</div>
       <div class="title">HOUSE</div>
       <div class="plate">DESCEND&nbsp;·&nbsp;100&nbsp;FLOORS&nbsp;·&nbsp;ONE&nbsp;DOOR</div>
       <div class="fine">free&nbsp;·&nbsp;no&nbsp;ads&nbsp;·&nbsp;your&nbsp;save&nbsp;stays&nbsp;on&nbsp;your&nbsp;device</div>
     </div>
   </div>`,
);
await page.evaluate(() => document.fonts.ready);
await sleep(120); // settle rasterisation

await page.locator('#art').screenshot({ path: OUT_PATH });
await browser.close();

const { bytes, type } = await assertPng(OUT_PATH, 1024, 500);
console.log(
  `[gen-store-art] ${path.relative(ROOT, OUT_PATH)} — 1024×500 type ${type} (2 = 24-bit RGB, no alpha), ${(bytes / 1024).toFixed(1)} KiB — header verified`,
);
