// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// step007/T1 — the version About (and later the feedback diagnostics) shows:
// package.json is the single source of truth, inlined at build time so the
// shipped bundle never fetches or guesses it. src/appVersion.ts guards the
// environments this define never reaches (vitest's node world) with 'dev'.
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
