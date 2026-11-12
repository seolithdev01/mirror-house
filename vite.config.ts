// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// step007/T1 — the version About (and later the feedback diagnostics) shows:
// package.json is the single source of truth, inlined at build time so the
// shipped bundle never fetches or guesses it. src/appVersion.ts guards the
// environments this define never reaches (vitest's node world) with 'dev'.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/**
 * The post-build stamp — runs once the bundle is on disk and finishes the two
 * files that describe it:
 *
 *  - `dist/_headers`: the CSP carries no `'unsafe-inline'`. Every inline
 *    `<style>` block in every shipped HTML page is hashed (sha256 of the exact
 *    bytes between the tags, as the browser sees them) and the hashes replace
 *    the `__MH_STYLE_HASHES__` placeholder. A page that grows a style block
 *    is covered by the next build; a `style=""` attribute is NOT covered by
 *    any hash and the build fails loudly rather than ship a page the CSP
 *    would silently unstyle.
 *  - `dist/sw.js`: `__MH_ASSETS__` becomes the hashed /assets/* list (the
 *    install precache) and `__MH_BUILD__` a content hash of shell + list (the
 *    cache name — one cache per deploy, the old one swept on activate).
 */
function mhPostBuild(): Plugin {
  let outDir = 'dist';
  return {
    name: 'mh-post-build',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!existsSync(join(outDir, 'index.html'))) return; // a failed build wrote nothing
      const sha = (s: string | Buffer, enc: 'base64' | 'hex'): string =>
        createHash('sha256').update(s).digest(enc);

      const hashes = new Set<string>();
      for (const file of readdirSync(outDir).filter((f) => f.endsWith('.html'))) {
        const html = readFileSync(join(outDir, file), 'utf8');
        if (/<[^>]+\sstyle\s*=/i.test(html))
          throw new Error(`${file}: inline style="" attribute — the CSP has no 'unsafe-inline'`);
        for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
          hashes.add(`'sha256-${sha(m[1] ?? '', 'base64')}'`);
      }
      const headersPath = join(outDir, '_headers');
      const headers = readFileSync(headersPath, 'utf8');
      if (!headers.includes('__MH_STYLE_HASHES__'))
        throw new Error('_headers: the __MH_STYLE_HASHES__ placeholder is missing');
      writeFileSync(headersPath, headers.replace('__MH_STYLE_HASHES__', [...hashes].join(' ')));

      const assets = readdirSync(join(outDir, 'assets'))
        .sort()
        .map((f) => `/assets/${f}`);
      const build = sha(readFileSync(join(outDir, 'index.html'), 'utf8') + assets.join('|'), 'hex');
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      if (!sw.includes("'__MH_BUILD__'") || !sw.includes("['__MH_ASSETS__']"))
        throw new Error('sw.js: the build placeholders are missing');
      writeFileSync(
        swPath,
        sw
          .replace("'__MH_BUILD__'", JSON.stringify(build.slice(0, 12)))
          .replace("['__MH_ASSETS__']", JSON.stringify(assets)),
      );
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rolldownOptions: {
      output: {
        // three.js is ~85% of the bytes and changes only on a dependency bump;
        // in its own content-hashed chunk it stays in the browser's immutable
        // cache across game releases, so a returning player downloads only
        // the game code that actually changed.
        advancedChunks: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
  plugins: [mhPostBuild()],
});
