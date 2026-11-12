// SPDX-License-Identifier: Apache-2.0
/// <reference types="vite/client" />

// step007/T1 — the vite `define` global (vite.config.ts): the build replaces
// every __APP_VERSION__ occurrence with package.json's version string. Typed
// `string | undefined` because the declaration is ambient in environments the
// define never reaches (vitest node), where src/appVersion.ts falls back.
declare const __APP_VERSION__: string | undefined;

// The optional donation link (game/support.ts) — set at build time, gated by
// safeSupportUrl before it can ever render.
interface ImportMetaEnv {
  readonly VITE_SUPPORT_URL?: string;
}
