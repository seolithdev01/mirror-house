// SPDX-License-Identifier: Apache-2.0
//
// step007/T1 — the one true app version. `vite build`/`vite dev` replace the
// `__APP_VERSION__` identifier with package.json's version string via the
// `define` block in vite.config.ts, so the shipped bundle says "0.2.0-beta.1".
// Every other environment — vitest's node world above all — carries no define,
// so the `typeof` guard (safe on an undeclared global: no ReferenceError)
// serves the 'dev' fallback literal and nothing throws at import time.
// The About panel renders this; feedback diagnostics will stamp it.

declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
