// SPDX-License-Identifier: Apache-2.0
//
// T16 controller utility — crop the 1080×2400 emulator smoke frames to
// 1080×1920 (Play's 9:16 bound) by trimming the 240px status bar and the
// 240px gesture area, emitting JPEG (no alpha, as Play prefers). One-off
// companion to the emulator pass in docs/BUILD-STORES.md; the Tier 1 set in
// store-assets/screenshots/play/ is its output.
// Usage: node scripts/crop-emulator-shots.mjs <in-dir> <out-dir>
// Usage: node crop-emulator-shots.mjs <in-dir> <out-dir>
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const inDir = process.argv[2];
const outDir = process.argv[3];
if (!inDir || !outDir) { console.error('usage: crop-emulator-shots.mjs <in-dir> <out-dir>'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 2400 }, deviceScaleFactor: 1 });
for (const f of readdirSync(inDir).filter((n) => n.endsWith('.png'))) {
  const buf = readFileSync(join(inDir, f));
  const b64 = `data:image/png;base64,${buf.toString('base64')}`;
  await page.setContent(`<img id="i" src="${b64}" style="position:absolute;left:0;top:0;width:1080px;height:2400px">`);
  const out = join(outDir, f.replace('.png', '.jpg'));
  await page.screenshot({ path: out, type: 'jpeg', quality: 95, clip: { x: 0, y: 240, width: 1080, height: 1920 } });
  console.log(`cropped ${f} -> ${out.replace(/.*[\\/]/, '')}`);
}
await browser.close();
