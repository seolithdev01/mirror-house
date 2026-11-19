# T15 — Feedback pipeline (screenshot + text → production → triage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The existing 📮 feedback composer gains a live screenshot capture and a direct SEND path that POSTs to a same-origin Cloudflare Pages Function storing each report in a private R2 bucket, where the maintainers triage them with a wrangler script — no GitHub account needed by testers.

**Architecture:** One pure contract module (`src/game/feedbackNet.ts`) defines the payload shape, limits, and validation, and is imported by BOTH the browser client and the Pages Function (`functions/api/feedback.ts` — a thin shell that validates, rate-limits via an R2 hour-prefix count, and stores one self-contained JSON object per report). The client captures the WebGL canvas at the moment the composer opens (downscale → JPEG data-URL), previews it, and POSTs JSON on SEND with honest sending/sent/failed states. No keymap change, no dock change, no CSP change, no SW change.

**Tech Stack:** TypeScript strict (zero `any`), Vite, three.js (canvas capture), Cloudflare Pages Functions + R2, wrangler v4 CLI, vitest (node), Playwright (route-mocked network).

## Global Constraints

- Repo: `D:\src\amtocsoft\amtocsoft-mirror-house`, branch work on `feat/t15-feedback`, merge to `main` at close, tag `t15`.
- Every new/modified source file starts with `// SPDX-License-Identifier: Apache-2.0`.
- TypeScript strict; **zero `any`** (use `unknown` + narrowing). No `Math.random` in `src/` (seeded RNG only; server-side randomness in `functions/` uses `crypto.getRandomValues`).
- **No innerHTML anywhere** — `createElement`/`textContent` only (CSP `require-trusted-types-for 'script'; trusted-types mh`).
- **No new remote loads**: the ONLY network call this feature adds is the same-origin `POST /api/feedback`. CSP stays untouched (`connect-src 'self'` already permits it). Never add third-party origins.
- Do NOT change: keymap (no covenant churn), `public/sw.js` (POST already passes through; BUILD hash restamps automatically), `public/_headers` (no CSP edits needed).
- i18n: every new user-visible string gets an `en` AND `hi` key in `src/ui/i18n.ts` (`t(lang, key)`; `fill()` for interpolation). Keep hi lines reasonable (< ~60 chars).
- Gates before merge: `npm run typecheck`, `npm run lint`, `npm test` (unit, expect 1095 + new), `npm run e2e` (expect 58 + new), `npm run build` (report gzip delta; baseline app chunk ≈ 74 kB gz).
- Kill stale servers before e2e: `netstat -ano | grep -E ":(5173|4173|4180|4200)" | grep LISTENING` → `taskkill //PID <pid> //F`.
- Windows Git Bash: write any PowerShell to a `.ps1` file rather than `-Command` one-liners; background servers via `run_in_background`.
- Privacy copy rule: the promise is amended to exactly this shape — *"Nothing leaves your device unless you send it: the only data that ever leaves is the feedback you explicitly send (your note, one screenshot, and the technical details listed in the form)."* Old absolute claims ("your data never leaves your device" in `index.html` meta description, README, FAQ) must be amended in the same wave — doc truth is a contract since T14.

---

## Background the implementers need

- The composer already exists: `src/game/feedback.ts` (pure: `diagnosticsSnapshot`, `KIND_META` for kinds `bug|suggestion|love`, `buildIssueUrl`, `buildMailto`, `SUPPORT_EMAIL`) and `src/ui/feedback.ts` (overlay `#mh-feedback-overlay` with kind radio, title `#mh-feedback-summary`, textarea `#mh-feedback-body`, two anchor exits `#mh-feedback-github`/`#mh-feedback-email`, opened by 📮 `#mh-feedback` and the ⚙ entry `#mh-settings-feedback`, focus-trapped via `trapDialog(root, { labelledBy: 'mh-feedback-title', onEscape: … })`, `setLang()` relabels everything). Read both files fully before starting.
- `src/ui/dialog.ts` provides `trapDialog` (openOrder + Escape/Tab semantics). The overlay is already in that stack, so the T14 pause-stand-down (`anyDialogOpen()`) covers it — KeyP is a no-op while the composer is open. Nothing to add.
- The WebGL canvas is `<canvas id="game">` (index.html:2013); the renderer at `src/main.ts:516` runs with `preserveDrawingBuffer: true`, so reading pixels after the frame is safe. Capture = draw the canvas onto a 2-D offscreen canvas (downscale) → `toDataURL('image/jpeg', 0.75)` (a `data:` URL — allowed by `img-src 'self' data:`; do NOT use `blob:` URLs).
- main.ts already wires the overlay: find `buildFeedbackOverlay({ diagnostics: … })` in main.ts (near the other overlay builds ~line 1440) — extend that call, don't re-create it.
- `APP_VERSION` from `src/appVersion.ts`; live state (`campaign.floor`, `tierOf(campaign)`, `mode`, `view`, `lang`, `seed`, `preset`) are module-level in main.ts — the model to follow is `diagnosticsText()` (main.ts:1414): a closure reading live `let`s at call time.
- Unit tests: `tests/unit/*.test.ts` (vitest, node env — no DOM/canvas there; test pure functions only). Existing model: `tests/unit/feedback.test.ts`.
- E2E: `tests/e2e/*.spec.ts` (Playwright, dev server on :5173, `?test=1` skips the boot poster, `ready()` waits for `window.__MIRROR_HOUSE_DEBUG__`, every test ends `expect(errors).toEqual([])` with `collectErrors(page)`). **No `page.route` exists yet — T4 introduces it** (only around `/api/feedback`; never route assets).
- Server: no `functions/` dir, no `wrangler.toml` yet. Local wrangler v4.134.0 is authed; R2 bucket **`mirror-house-feedback` already exists** (created 2026-11-19, private). CI deploys via `cloudflare/wrangler-action` with `command: pages deploy dist --project-name=mirror-house --branch=main` (`.github/workflows/ci.yml` lines ~49–63).
- The Function's type for its R2 binding: `interface Env { FEEDBACK: R2Bucket }` — `R2Bucket` comes from `@cloudflare/workers-types` (verify it's a devDependency; if absent, add it as `devDependency` with `npm i -D @cloudflare/workers-types` and a triple-slash reference in the function file: `/// <reference types="@cloudflare/workers-types" />`). `functions/**` must be included in tsconfig (check `tsconfig.json` include list; add `"functions"` if needed) — `npm run typecheck` must cover it.

---

### Task 1: The pure payload contract — `src/game/feedbackNet.ts`

**Files:**
- Create: `src/game/feedbackNet.ts`
- Create: `tests/unit/feedbackNet.test.ts`

**Interfaces:**
- Consumes: kind set from `src/game/feedback.ts` (`FeedbackKind = 'bug' | 'suggestion' | 'love'`).
- Produces (Tasks 3 & 4 import these): `FEEDBACK_LIMITS`, `FEEDBACK_KINDS`, `ShotInput`, `FeedbackCtx`, `FeedbackPayload`, `ParseOk = { ok: true; value: FeedbackPayload }`, `ParseErr = { ok: false; error: string }`, `parseFeedbackPayload(raw: unknown): ParseOk | ParseErr`, `buildFeedbackPayload(input: BuildInput): FeedbackPayload`, `feedbackStorageKey(iso: string, ipHash: string, rand: string): string`, `feedbackRatePrefix(hourUtc: string, ipHash: string): string`.

- [ ] **Step 1: Write the failing unit tests** — `tests/unit/feedbackNet.test.ts` (SPDX header; import from `../../src/game/feedbackNet`):

```ts
import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_LIMITS,
  buildFeedbackPayload,
  feedbackRatePrefix,
  feedbackStorageKey,
  parseFeedbackPayload,
} from '../../src/game/feedbackNet';

const VALID = (over: Record<string, unknown> = {}) => ({
  v: '0.2.0-beta.4',
  kind: 'bug',
  title: 'stuck in a mirror',
  body: 'floor 12, walked into the tall glass and stayed',
  shot: { w: 1280, h: 720, mime: 'image/jpeg', data: 'a'.repeat(64) },
  ctx: {
    floor: 12, tier: 2, mode: 'touch', view: 'focus', lang: 'en',
    preset: 'high', seed: 'HOME:12', dpr: 2, ua: 'Mozilla/5.0', heap: 9.5,
  },
  ...over,
});

describe('parseFeedbackPayload', () => {
  it('accepts a valid payload and strips unknown keys', () => {
    const r = parseFeedbackPayload({ ...VALID(), junk: 'x', ctx: { ...VALID().ctx as object, junk2: 1 } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.kind).toBe('bug');
      expect(Object.keys(r.value).sort()).toEqual(['body', 'ctx', 'kind', 'shot', 'title', 'v']);
    }
  });
  it('rejects non-objects and wrong types', () => {
    for (const raw of [null, 42, 'x', [], VALID({ kind: 7 }), VALID({ title: 9 }),
      VALID({ body: { } }), VALID({ v: null })]) {
      expect(parseFeedbackPayload(raw).ok).toBe(false);
    }
  });
  it('rejects unknown kinds', () => {
    expect(parseFeedbackPayload(VALID({ kind: 'feature' })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ kind: 'love' })).ok).toBe(true);
  });
  it('enforces the limits', () => {
    expect(parseFeedbackPayload(VALID({ title: 'x'.repeat(FEEDBACK_LIMITS.title + 1) })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ body: 'x'.repeat(FEEDBACK_LIMITS.body + 1) })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ shot: { w: 10, h: 10, mime: 'image/jpeg', data: 'x'.repeat(FEEDBACK_LIMITS.shotChars + 1) } })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ shot: { w: 10, h: 10, mime: 'image/png', data: 'x' } })).ok).toBe(false);
  });
  it('rejects a shot whose data is not base64', () => {
    expect(parseFeedbackPayload(VALID({ shot: { w: 10, h: 10, mime: 'image/jpeg', data: 'not base64!!' } })).ok).toBe(false);
  });
  it('rejects bad ctx values', () => {
    expect(parseFeedbackPayload(VALID({ ctx: { ...VALID().ctx as object, floor: '12' } })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ ctx: { ...VALID().ctx as object, ua: 'x'.repeat(400) } })).ok).toBe(false);
    expect(parseFeedbackPayload(VALID({ ctx: null })).ok).toBe(false);
  });
});

describe('buildFeedbackPayload', () => {
  it('strips the data-url prefix and counts bytes', () => {
    const p = buildFeedbackPayload({
      v: 'v1', kind: 'love', title: 't', body: 'b',
      shot: { w: 640, h: 360, dataUrl: 'data:image/jpeg;base64,QUJD' },
      ctx: { floor: 1, tier: 1, mode: 'hybrid', view: 'quad', lang: 'hi', preset: 'low', seed: 'S', dpr: 1, ua: 'u', heap: null },
    });
    expect(p.shot).toEqual({ w: 640, h: 360, mime: 'image/jpeg', data: 'QUJD' });
    expect(parseFeedbackPayload(p).ok).toBe(true);
  });
});

describe('keys', () => {
  it('storage key is date-scoped, sortable, unique', () => {
    expect(feedbackStorageKey('2026-11-19T10:11:12.000Z', 'a1b2c3d4e5f6', 'Xy9K2L'))
      .toBe('fb/2026-11-19/2026-11-19T101112Z-a1b2c3d4e5f6-Xy9K2L.json');
  });
  it('rate prefix is hour-scoped', () => {
    expect(feedbackRatePrefix('2026-11-19T10', 'a1b2c3d4e5f6')).toBe('rate/2026-11-19T10/a1b2c3d4e5f6/');
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run tests/unit/feedbackNet.test.ts` → module-not-found.
- [ ] **Step 3: Implement `src/game/feedbackNet.ts`** (SPDX header). Complete code:

```ts
// SPDX-License-Identifier: Apache-2.0
//
// T15 — the feedback wire contract, shared by the browser client and the
// Cloudflare Pages Function (functions/api/feedback.ts). ONE module owns the
// payload shape, the limits, and the only validator: what the client builds
// is exactly what the server accepts, and every rejection reason is a test
// here. Pure TypeScript — no DOM, no fetch, no R2 — so vitest can hold the
// whole contract in a node process.

import type { FeedbackKind } from './feedback';

/** The three kinds the composer's radio offers — mirrored from the GitHub
 *  mapping in game/feedback (bug/suggestion/love). Repeated here as a
 *  literal set so the wire contract never widens by accident. */
export const FEEDBACK_KINDS = ['bug', 'suggestion', 'love'] as const;
export type WireKind = (typeof FEEDBACK_KINDS)[number];

/** Hard caps — the server rejects anything over them (413/400); the client
 *  never builds anything over them by construction. */
export const FEEDBACK_LIMITS = {
  title: 120,
  body: 4000,
  /** base64 characters of screenshot data (~675 KB of JPEG). */
  shotChars: 900_000,
  /** max JSON body size the Function will even read (413 above this). */
  totalBytes: 1_600_000,
} as const;

export interface ShotWire {
  w: number;
  h: number;
  mime: 'image/jpeg';
  data: string; // bare base64, no data: prefix
}
export interface FeedbackCtx {
  floor: number;
  tier: number;
  mode: string;
  view: string;
  lang: string;
  preset: string;
  seed: string;
  dpr: number;
  ua: string;
  /** MiB usedJSHeapSize where the browser exposes it; null otherwise. */
  heap: number | null;
}
export interface FeedbackPayload {
  v: string;
  kind: WireKind;
  title: string;
  body: string;
  shot: ShotWire;
  ctx: FeedbackCtx;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validate one untrusted payload (the Function's only ingest gate). Unknown
 *  keys are stripped (forward-compatible widening), everything else must
 *  type-check or the whole payload is refused — never partially accepted. */
export function parseFeedbackPayload(raw: unknown): { ok: true; value: FeedbackPayload } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: 'payload must be an object' };
  const { v, kind, title, body, shot, ctx } = raw;
  if (!str(v) || v.length === 0 || v.length > 40) return { ok: false, error: 'bad v' };
  if (!str(kind) || !(FEEDBACK_KINDS as readonly string[]).includes(kind)) return { ok: false, error: 'bad kind' };
  if (!str(title) || title.length === 0 || title.length > FEEDBACK_LIMITS.title) return { ok: false, error: 'bad title' };
  if (!str(body) || body.length > FEEDBACK_LIMITS.body) return { ok: false, error: 'bad body' };
  if (!isRecord(shot)) return { ok: false, error: 'bad shot' };
  if (!num(shot.w) || shot.w < 1 || shot.w > 8192) return { ok: false, error: 'bad shot.w' };
  if (!num(shot.h) || shot.h < 1 || shot.h > 8192) return { ok: false, error: 'bad shot.h' };
  if (shot.mime !== 'image/jpeg') return { ok: false, error: 'bad shot.mime' };
  if (!str(shot.data) || shot.data.length === 0 || shot.data.length > FEEDBACK_LIMITS.shotChars) return { ok: false, error: 'bad shot.data size' };
  if (!BASE64.test(shot.data)) return { ok: false, error: 'bad shot.data encoding' };
  if (!isRecord(ctx)) return { ok: false, error: 'bad ctx' };
  const { floor, tier, mode, view, lang, preset, seed, dpr, ua, heap } = ctx;
  if (!num(floor) || floor < 0 || floor > 100) return { ok: false, error: 'bad ctx.floor' };
  if (!num(tier) || tier < 0 || tier > 10) return { ok: false, error: 'bad ctx.tier' };
  if (!str(mode) || mode.length > 20) return { ok: false, error: 'bad ctx.mode' };
  if (!str(view) || view.length > 20) return { ok: false, error: 'bad ctx.view' };
  if (!str(lang) || lang.length > 10) return { ok: false, error: 'bad ctx.lang' };
  if (!str(preset) || preset.length > 20) return { ok: false, error: 'bad ctx.preset' };
  if (!str(seed) || seed.length > 80) return { ok: false, error: 'bad ctx.seed' };
  if (!num(dpr) || dpr < 0 || dpr > 10) return { ok: false, error: 'bad ctx.dpr' };
  if (!str(ua) || ua.length > 300) return { ok: false, error: 'bad ctx.ua' };
  if (heap !== null && !num(heap)) return { ok: false, error: 'bad ctx.heap' };
  return {
    ok: true,
    value: { v, kind: kind as WireKind, title, body, shot: { w: shot.w, h: shot.h, mime: 'image/jpeg', data: shot.data }, ctx: { floor, tier, mode, view, lang, preset, seed, dpr, ua, heap } },
  };
}

/** What the client builds: strip the `data:` prefix, hand over bare base64.
 *  The output always satisfies parseFeedbackPayload by construction. */
export interface BuildInput {
  v: string;
  kind: WireKind;
  title: string;
  body: string;
  shot: { w: number; h: number; dataUrl: string };
  ctx: FeedbackCtx;
}
export function buildFeedbackPayload(input: BuildInput): FeedbackPayload {
  const mark = 'base64,';
  const i = input.shot.dataUrl.indexOf(mark);
  const data = i === -1 ? '' : input.shot.dataUrl.slice(i + mark.length);
  return { v: input.v, kind: input.kind, title: input.title, body: input.body, shot: { w: input.shot.w, h: input.shot.h, mime: 'image/jpeg', data }, ctx: input.ctx };
}

/** R2 object key for one report: date-scoped, sorts chronologically,
 *  unique by (time, ip-hash, rand). `iso` = the received-at instant. */
export function feedbackStorageKey(iso: string, ipHash: string, rand: string): string {
  const day = iso.slice(0, 10);
  const compact = iso.slice(0, 19).replaceAll(':', '');
  return `fb/${day}/${compact}Z-${ipHash}-${rand}.json`;
}

/** The per-hour rate bucket prefix: at most FEEDBACK_LIMITS_RATE (the
 *  Function's constant) objects may exist under it for one client hour. */
export function feedbackRatePrefix(hourUtc: string, ipHash: string): string {
  return `rate/${hourUtc}/${ipHash}/`;
}
```

- [ ] **Step 4: Run, verify PASS** — `npx vitest run tests/unit/feedbackNet.test.ts`.
- [ ] **Step 5: Gates** — `npm run typecheck && npm run lint`.
- [ ] **Step 6: Commit** — `git checkout -b feat/t15-feedback` first (Task 1 opens the branch); `git commit -m "feat(t15): the feedback wire contract — one validator, client and server"`.

---

### Task 2: Screenshot capture + preview in the composer

**Files:**
- Modify: `src/ui/feedback.ts` (capture helper + preview elements + `init` grows an optional `snapshot`)
- Modify: `src/main.ts` (pass `snapshot` closure reading live state)
- Modify: `src/ui/i18n.ts` (new keys, en + hi)
- Test: `tests/unit/feedbackNet.test.ts` gains a `targetShotSize` test (pure math lives in feedbackNet)

**Interfaces:**
- Consumes: Task 1's module for `targetShotSize(w, h, maxW)`; the canvas `#game` via `document.querySelector<HTMLCanvasElement>('#game')`.
- Produces: inside `buildFeedbackOverlay`, a captured shot stored in closure state `currentShot: { w: number; h: number; dataUrl: string } | null`, refreshed on every `toggle()` open; a preview `<img id="mh-feedback-shot">` + `<span id="mh-feedback-shot-meta">`; `init.snapshot(): FeedbackCtx` supplied by main.ts (Task 4 uses both to build the POST body).

- [ ] **Step 1: Failing test for the pure downscale math** — append to `tests/unit/feedbackNet.test.ts` (and add the export in feedbackNet.ts):

```ts
import { targetShotSize } from '../../src/game/feedbackNet';
// ...
describe('targetShotSize', () => {
  it('passes through at or under max', () => {
    expect(targetShotSize(1280, 720, 1280)).toEqual([1280, 720]);
    expect(targetShotSize(800, 600, 1280)).toEqual([800, 600]);
  });
  it('scales wide and tall down, rounding even', () => {
    expect(targetShotSize(2560, 1440, 1280)).toEqual([1280, 720]);
    expect(targetShotSize(1170, 2532, 1280)).toEqual([592, 1280]); // tall phone
  });
  it('never returns 0', () => {
    expect(targetShotSize(2, 4000, 1280)).toEqual([1, 1280]);
  });
});
```

- [ ] **Step 2: Implement** — in `src/game/feedbackNet.ts`:

```ts
/** Fit (w, h) inside a max width, preserving aspect, minimum 1px. Pure so
 *  the capture path needs no canvas to test. */
export function targetShotSize(w: number, h: number, maxW: number): [number, number] {
  if (w <= maxW) return [Math.max(1, w), Math.max(1, h)];
  const s = maxW / w;
  return [maxW, Math.max(1, Math.round(h * s))];
}
```

- [ ] **Step 3: Capture in the overlay** — `src/ui/feedback.ts`. Extend the import line to add `targetShotSize` and `type FeedbackCtx` from `../game/feedbackNet`. Change the builder signature and add the capture:

```ts
import { targetShotSize, type FeedbackCtx } from '../game/feedbackNet';

export interface FeedbackShot { w: number; h: number; dataUrl: string }

export function buildFeedbackOverlay(init: {
  diagnostics(): string;
  /** live context for the wire payload (T4 builds the POST from this). */
  snapshot(): FeedbackCtx;
}): FeedbackOverlay {
```

Add module-level helper in the same file (below the KINDS const):

```ts
/** Capture the live game canvas into a ≤1280-wide JPEG data-URL. Reads the
 *  pixels synchronously (safe: the renderer runs with preserveDrawingBuffer
 *  so the last frame is held). Returns null when no canvas exists — the
 *  composer still works, just without a shot. */
function captureShot(): FeedbackShot | null {
  const game = document.querySelector<HTMLCanvasElement>('#game');
  if (game === null || game.width === 0 || game.height === 0) return null;
  const [w, h] = targetShotSize(game.width, game.height, 1280);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const g = off.getContext('2d');
  if (g === null) return null;
  g.drawImage(game, 0, 0, w, h);
  return { w, h, dataUrl: off.toDataURL('image/jpeg', 0.75) };
}
```

In `buildFeedbackOverlay`, add closure state + DOM (built with the same createElement discipline as the rest of the file, BEFORE `trapDialog` so the elements are in the box):

```ts
  let currentShot: FeedbackShot | null = null;
  const shotWrap = document.createElement('div');
  shotWrap.id = 'mh-feedback-shot-wrap';
  const shotImg = document.createElement('img');
  shotImg.id = 'mh-feedback-shot';
  shotImg.alt = ''; // decorative preview; the meta line names it
  const shotMeta = document.createElement('span');
  shotMeta.id = 'mh-feedback-shot-meta';
  shotWrap.append(shotImg, shotMeta);
```

Insert `shotWrap` into the box right after the kind fieldset (find the `box.append(` call and place `shotWrap` before the summary field). In `toggle()`'s open path (where the textarea is refreshed), add:

```ts
      currentShot = captureShot();
      if (currentShot === null) {
        shotImg.removeAttribute('src');
        shotWrap.hidden = true;
      } else {
        shotImg.src = currentShot.dataUrl;
        shotWrap.hidden = false;
        const kb = Math.max(1, Math.round((currentShot.dataUrl.length * 3) / 4 / 1024));
        shotMeta.textContent = fill(t(lang, 'feedback.shotMeta'), { w: currentShot.w, h: currentShot.h, kb });
      }
```

Import `fill` from `./i18n` alongside `t`. In `relabel()` add `shotMeta.textContent = …` re-run using the stored `currentShot` (same expression as above; extract a small local `renderShotMeta()` to avoid duplication).

- [ ] **Step 4: i18n keys** — `src/ui/i18n.ts`, in the `en` block near the other `feedback.*` keys (after line 152's group):

```ts
    'feedback.shot': 'Screenshot — the moment you opened this form',
    'feedback.shotMeta': '{w}×{h} · ~{kb} KB · attached when you press SEND',
```

and the `hi` block near its `feedback.*` keys:

```ts
    'feedback.shot': 'स्क्रीनशॉट — जिस क्षण आपने यह फ़ॉर्म खोला',
    'feedback.shotMeta': '{w}×{h} · लगभग {kb} KB · SEND दबाने पर साथ जाएगा',
```

- [ ] **Step 5: Wire the snapshot closure in main.ts** — find the existing `buildFeedbackOverlay({ diagnostics: … })` call and extend:

```ts
const feedback = buildFeedbackOverlay({
  diagnostics: diagnosticsText,
  snapshot: (): FeedbackCtx => ({
    floor: campaign.floor,
    tier: venue === null ? tierOf(campaign) : 0,
    mode,
    view,
    lang,
    preset,
    seed,
    dpr: window.devicePixelRatio,
    ua: navigator.userAgent,
    heap:
      (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory
        ?.usedJSHeapSize === undefined
        ? null
        : ((performance as unknown as { memory: { usedJSHeapSize: number } }).memory
            .usedJSHeapSize) /
          1048576,
  }),
});
```

(Adjust to the actual surrounding names — `tierOf` is imported in main.ts already for the floor chip; `mode`/`view`/`lang`/`preset`/`seed`/`campaign`/`venue` are the module-level `let`s the explore report lists. Add the `FeedbackCtx` type import from `./game/feedbackNet`.)

- [ ] **Step 6: Gates** — `npm run typecheck && npm run lint && npx vitest run tests/unit/feedbackNet.test.ts`.
- [ ] **Step 7: Commit** — `git commit -m "feat(t15): the composer holds the moment — live shot captured on open"`.

---

### Task 3: The Pages Function + R2 binding + config

**Files:**
- Create: `functions/api/feedback.ts`
- Create: `wrangler.toml`
- Modify: `.github/workflows/ci.yml` (deploy command aligned with the config)
- Modify: `tsconfig.json` (include `functions` if not covered)
- Modify: `package.json` (`@cloudflare/workers-types` devDependency if absent)

**Interfaces:**
- Consumes: Task 1's `parseFeedbackPayload`, `FEEDBACK_LIMITS`, `feedbackStorageKey`, `feedbackRatePrefix`.
- Produces: the endpoint `POST /api/feedback` (201 `{ok:true}`, JSON errors 400/413/429/405; `OPTIONS` → 204 with permissive CORS so a future Capacitor wrap can call it); R2 binding name `FEEDBACK` → bucket `mirror-house-feedback`.

- [ ] **Step 1: `wrangler.toml`** (repo root):

```toml
# T15 — Pages config: the deploy reads name + output dir from here, and the
# R2 binding below is provisioned on every `wrangler pages deploy`.
name = "mirror-house"
pages_build_output_dir = "dist"
compatibility_date = "2026-01-01"

[[r2_buckets]]
binding = "FEEDBACK"
bucket_name = "mirror-house-feedback"
```

- [ ] **Step 2: Prove config + CLI coexistence** — the CI passes `dist` and `--project-name` as args; verify wrangler v4 accepts both (same values) with a REAL deploy to a throwaway preview branch (never production): `npx vite build && npx wrangler pages deploy dist --project-name=mirror-house --branch=t15-config-verify` → expect a successful upload + a `*.pages.dev` preview URL. Then exercise the Function on that preview URL in Step 5. **If wrangler errors on the mixed config/args form, fall back: keep `wrangler.toml` only as binding source by deploying with plain `npx wrangler pages deploy --branch=t15-config-verify`, and change the CI command to the same arg-less shape.** Record which form works; use it in ci.yml.

- [ ] **Step 3: `functions/api/feedback.ts`** (SPDX header; `/// <reference types="@cloudflare/workers-types" />` first if the types package isn't global). Complete code:

```ts
// SPDX-License-Identifier: Apache-2.0
//
// T15 — the production ingest for player feedback. A thin shell on purpose:
// every rule lives in src/game/feedbackNet.ts (shared with the client), so
// what the browser builds is byte-for-byte what this accepts. Here: parse,
// rate-limit by an R2 hour-prefix count, store one self-contained JSON
// object, answer JSON. No read path exists — reports leave via the wrangler
// triage script only.

/// <reference types="@cloudflare/workers-types" />

import {
  FEEDBACK_LIMITS,
  feedbackRatePrefix,
  feedbackStorageKey,
  parseFeedbackPayload,
} from '../src/game/feedbackNet';

interface Env {
  FEEDBACK: R2Bucket;
}

/** Reports per client per UTC hour — generous for humans, hostile to floods. */
const RATE_PER_HOUR = 4;
const RAND_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // unambiguous set

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });

export const onRequestPost = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const req = ctx.request;
  if ((req.headers.get('content-type') ?? '').split(';')[0].trim() !== 'application/json') {
    return json(400, { ok: false, error: 'content-type must be application/json' });
  }
  const raw = await req.text();
  if (raw.length > FEEDBACK_LIMITS.totalBytes) {
    return json(413, { ok: false, error: 'payload too large' });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return json(400, { ok: false, error: 'invalid JSON' });
  }
  const verdict = parseFeedbackPayload(parsed);
  if (!verdict.ok) return json(400, { ok: false, error: verdict.error });

  // Identity: a truncated SHA-256 of the connecting IP — enough to rate-limit
  // and correlate a burst, not enough to reverse. The bucket is private.
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const ipHash = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const now = new Date();
  const hourUtc = now.toISOString().slice(0, 13);

  const recent = await ctx.env.FEEDBACK.list({ prefix: feedbackRatePrefix(hourUtc, ipHash), limit: RATE_PER_HOUR + 1 });
  if (recent.objects.length >= RATE_PER_HOUR) {
    return json(429, { ok: false, error: 'too many reports this hour — try again later' });
  }

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const rand = [...bytes].map((b) => RAND_CHARS[b % RAND_CHARS.length]).join('');
  const key = feedbackStorageKey(now.toISOString(), ipHash, rand);
  const record = {
    receivedAt: now.toISOString(),
    ...verdict.value,
    meta: {
      ipHash16: ipHash,
      colo: (req as unknown as { cf?: { colo?: string } }).cf?.colo ?? null,
      country: (req as unknown as { cf?: { country?: string } }).cf?.country ?? null,
    },
  };
  await ctx.env.FEEDBACK.put(key, JSON.stringify(record), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
  return json(201, { ok: true });
};

export const onRequest: { post: typeof onRequestPost; options: typeof onRequestOptions } = {
  post: onRequestPost,
  options: onRequestOptions,
};
```

(If the project's Pages Functions convention differs — check `wrangler` v4 docs behavior — the `onRequestPost`/`onRequestOptions` named exports ARE the convention; drop the final `export const onRequest` object, it is not needed. Keep the named exports only.)

- [ ] **Step 4: typecheck coverage** — ensure `tsconfig.json` includes `functions` (add to `include` if absent) and `@cloudflare/workers-types` is installed (`npm i -D @cloudflare/workers-types` if absent). If the game's tsconfig lib conflicts with workers-types globals (e.g. duplicate `Response`), prefer a SEPARATE `functions/tsconfig.json` extending the root with `"types": ["@cloudflare/workers-types"]` and exclude `functions` from the root include; `npm run typecheck` gains `tsc --noEmit -p functions` — adjust the `typecheck` script accordingly. Pick whichever keeps root typecheck green WITHOUT weakening game strictness.
- [ ] **Step 5: Live local proof** — build, serve functions locally, POST, read back:

```bash
npm run build
npx wrangler pages dev --port 4200   # background; serves dist + functions + local R2
# in a second shell:
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:4200/api/feedback -H 'content-type: application/json' -d '{"v":"t","kind":"bug","title":"t","body":"b","shot":{"w":10,"h":10,"mime":"image/jpeg","data":"QUJD"},"ctx":{"floor":1,"tier":1,"mode":"touch","view":"focus","lang":"en","preset":"low","seed":"S","dpr":1,"ua":"u","heap":null}}'
# expect: 201
curl -s -X POST http://localhost:4200/api/feedback -H 'content-type: application/json' -d 'not json'
# expect: {"ok":false,"error":"invalid JSON"} (400)
npx wrangler r2 object get mirror-house-feedback/<the key from the list below> --file /tmp/fb-test.json 2>/dev/null || npx wrangler r2 object list mirror-house-feedback --prefix fb/ | head
```

(For local dev the R2 is miniflare-backed — objects land in `.wrangler/state`; if `wrangler r2 object get` reads the REMOTE bucket instead, verify the local write via the rate-limit counter instead: POST 4 more times → 5th returns 429. That proves list+put work. Then kill the server.) Also verify the guard rails: missing content-type → 400; `body` over 4001 chars → 400; payload > limits.totalBytes → 413.

- [ ] **Step 6: ci.yml** — change the deploy command to the form proven in Step 2 (either keep as-is if mixed form worked, or `command: pages deploy --branch=main`). Do not change secrets/gates.
- [ ] **Step 7: Gates** — `npm run typecheck && npm run lint`.
- [ ] **Step 8: Commit** — `git commit -m "feat(t15): /api/feedback — validate, rate-limit, store (R2 binding in wrangler.toml)"`.

---

### Task 4: SEND — the client posts to production

**Files:**
- Modify: `src/ui/feedback.ts` (send button, status line, states)
- Modify: `src/ui/i18n.ts` (en + hi keys)
- Modify: `index.html` (a few PoD rules for `#mh-feedback-send`, `#mh-feedback-shot-wrap`, `#mh-feedback-status` — follow the existing plate styles, e.g. the settings/about box rules)
- Test: `tests/e2e/smoke.spec.ts` (new test — route-mocked `/api/feedback`)

**Interfaces:**
- Consumes: Task 1 `buildFeedbackPayload`, Task 2 `currentShot` + `init.snapshot()`, existing composer state (kind radio, title input `#mh-feedback-summary`, textarea `#mh-feedback-body`).
- Produces: button `#mh-feedback-send` (PoD primary), status `#mh-feedback-status` (`role=status`, `aria-live=polite`) with states `sending → sent | failed`; POST body = `JSON.stringify(buildFeedbackPayload({ v: APP_VERSION, kind, title, body, shot: currentShot ?? { w: 0, h: 0, dataUrl: '' }, ctx: init.snapshot() }))` — wait: a null shot must still parse; decide: **when `currentShot === null`, the SEND path substitutes a 1×1 transparent-JPEG placeholder? NO — instead build the payload with a minimal valid shot of the actual captured state; if capture failed entirely, SEND is disabled and the title says why (honesty: always ship a shot or nothing at all).** Simplest honest rule: `sendBtn.disabled = currentShot === null`.

- [ ] **Step 1: i18n keys** — en (near the Task 2 keys):

```ts
    'feedback.send': 'SEND TO THE HOUSE',
    'feedback.sending': 'Sending…',
    'feedback.sent': 'Sent — the architects have it. Thank you.',
    'feedback.failed': 'Not sent ({err}). Your words are safe below — try again, or use the links.',
    'feedback.privacyNote2': 'SEND posts your note, the screenshot above, and the technical details to the Mirror House developers. Nothing else ever leaves your device.',
```

hi:

```ts
    'feedback.send': 'सदन को भेजें',
    'feedback.sending': 'भेजा जा रहा है…',
    'feedback.sent': 'भेज दिया — वास्तुकारों तक पहुँच गया। धन्यवाद।',
    'feedback.failed': 'नहीं भेजा गया ({err})। आपके शब्द नीचे सुरक्षित हैं — फिर कोशिश करें या लिंक इस्तेमाल करें।',
    'feedback.privacyNote2': 'SEND आपका नोट, ऊपर का स्क्रीनशॉट और तकनीकी विवरण Mirror House डेवलपर्स को भेजता है। इसके अलावा कुछ भी आपके डिवाइस से बाहर नहीं जाता।',
```

Also READ the existing `'feedback.privacyNote'` value and, if it claims nothing ever leaves the page, reword it to point at the new line (en + hi) — doc truth.

- [ ] **Step 2: Overlay additions** — `src/ui/feedback.ts`: build `sendBtn` (`button.type='button'`, id `#mh-feedback-send`, PoD primary class `primary` — check what class existing primary buttons use, e.g. settings' apply button, and reuse it) and `statusEl` (`p`, id `#mh-feedback-status`, `setAttribute('role','status')`, `aria-live:'polite'`, starts `hidden`). Add a `privacyNote2` `<p id="mh-feedback-privacy2">`. Append order inside the actions area: privacyNote2, sendBtn, statusEl, then the existing github/email anchors (they stay as fallbacks). State machine in closure:

```ts
  type SendState = 'idle' | 'sending' | 'sent' | 'failed';
  let sendState: SendState = 'idle';
  const renderSendState = (): void => {
    sendBtn.disabled = sendState === 'sending' || currentShot === null;
    sendBtn.textContent =
      sendState === 'sending' ? t(lang, 'feedback.sending') : t(lang, 'feedback.send');
    if (sendState === 'idle') statusEl.hidden = true;
    else {
      statusEl.hidden = false;
      statusEl.textContent =
        sendState === 'sent'
          ? t(lang, 'feedback.sent')
          : sendState === 'sending'
            ? t(lang, 'feedback.sending')
            : t(lang, 'feedback.failed').replace('{err}', lastError);
    }
  };
  let lastError = '';
```

(Use `fill()` from i18n for `{err}` interpolation instead of `replace` — `fill(t(lang,'feedback.failed'), { err: lastError })`.)

The send handler:

```ts
  const send = async (): Promise<void> => {
    if (sendState === 'sending' || currentShot === null) return;
    sendState = 'sending';
    renderSendState();
    const kind = (Object.keys(kindRadios) as FeedbackKind[]).find((k) => kindRadios[k].checked) ?? 'bug';
    const payload = buildFeedbackPayload({
      v: init.version,
      kind,
      title: titleInput.value.trim() === '' ? 'Mirror House feedback' : titleInput.value.trim(),
      body: bodyArea.value,
      shot: currentShot,
      ctx: init.snapshot(),
    });
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
      });
      if (res.ok) {
        sendState = 'sent';
      } else {
        let err = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { ok: boolean; error?: string };
          if (typeof j.error === 'string') err = j.error;
        } catch { /* keep the HTTP code */ }
        lastError = err;
        sendState = 'failed';
      }
    } catch {
      lastError = 'no connection';
      sendState = 'failed';
    }
    renderSendState();
  };
  sendBtn.addEventListener('click', () => { void send(); });
```

(`init.version: string` — add to the builder's init type; main passes `APP_VERSION`. `titleInput`/`bodyArea` are the existing element variable names in the file — READ the file and use its actual names.) Re-open (`toggle()` open path) resets `sendState = 'idle'` and calls `renderSendState()`. `relabel()` re-renders button text + status + privacy line via the same render functions.

- [ ] **Step 3: CSS** — `index.html`, next to the existing `#mh-feedback-*` rules: `#mh-feedback-shot-wrap` (ink plate border, `img { width:100%; border:1px solid …; border-radius:…; display:block }`), `#mh-feedback-send` (same yellow primary treatment as other primary buttons — grep `primary` or the settings apply button's class), `#mh-feedback-status[aria-live]` (small Mukta line; `.sent` green/cream, `.failed` warning tone via classes toggled by renderSendState: `statusEl.className = sendState === 'failed' ? 'failed' : ''`).
- [ ] **Step 4: E2E test** — append to `tests/e2e/smoke.spec.ts` (study the existing composer test at smoke.spec.ts:407–478 first; reuse `ready()`, `collectErrors`, and the open path). New test:

```ts
test('t15: feedback SEND posts shot+ctx to /api/feedback', async ({ page }) => {
  const errors = collectErrors(page);
  const posts: Array<{ body: string; status: number }> = [];
  await page.route('**/api/feedback', async (route) => {
    posts.push({ body: route.request().postData() ?? '', status: 201 });
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/?test=1');
  await ready(page);
  await page.locator('#mh-feedback').click();
  const overlay = page.locator('#mh-feedback-overlay');
  await expect(overlay).toBeVisible();
  await expect(page.locator('#mh-feedback-shot')).toBeVisible();
  const src = await page.locator('#mh-feedback-shot').getAttribute('src');
  expect(src?.startsWith('data:image/jpeg;base64,') ?? false).toBe(true);
  await page.locator('#mh-feedback-summary').fill('e2e shot');
  await page.locator('#mh-feedback-send').click();
  await expect(page.locator('#mh-feedback-status')).toContainText(/Sent|भेज/);
  expect(posts).toHaveLength(1);
  const parsed = JSON.parse(posts[0]!.body) as { kind: string; title: string; shot: { data: string; mime: string }; ctx: { floor: number; ua: string } };
  expect(parsed.kind).toBe('bug');
  expect(parsed.title).toBe('e2e shot');
  expect(parsed.shot.mime).toBe('image/jpeg');
  expect(parsed.shot.data.length).toBeGreaterThan(100);
  expect(typeof parsed.ctx.floor).toBe('number');

  // the failed path: server 500 → honest failure, draft preserved, fallbacks present
  await page.route('**/api/feedback', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"boom"}' });
  });
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
  await page.locator('#mh-feedback').click();
  await expect(overlay).toBeVisible();
  await page.locator('#mh-feedback-send').click();
  await expect(page.locator('#mh-feedback-status')).toContainText(/boom/);
  await expect(page.locator('#mh-feedback-body')).not.toHaveValue('');
  await expect(page.locator('#mh-feedback-github')).toBeVisible();
  expect(errors).toEqual([]);
});
```

(If the textarea refills with diagnostics on reopen — it does — the `not.toHaveValue('')` assertion still holds. If the debug faucet is required for `ready()` under `?test=1`, follow the existing composer test's exact boot pattern. Toggle state `sent` must reset to `idle` on reopen — asserted implicitly by SEND being enabled again.)

- [ ] **Step 5: Gates** — full suite: `npm run typecheck && npm run lint && npm test && npm run e2e` (kill stale :5173 first). Record counts.
- [ ] **Step 6: Commit** — `git commit -m "feat(t15): SEND — one click ships note+shot+context to the architects"`.

---

### Task 5: Truth, triage runbook, version

**Files:**
- Modify: `README.md`, `docs/FAQ.md` (if exists — check; FAQ entries may live in README), `index.html` (meta description), `SECURITY.md`/`PROVENANCE.md` (whichever mention data flow), `docs/USE-CASES.md`, `docs/TEST-CASES.md`, `docs/STATE_MACHINES.md` (if a flow row fits), `docs/LAUNCH.md`, `package.json` (version)
- Create: `scripts/feedback-triage.mjs`

- [ ] **Step 1: Triage script** — `scripts/feedback-triage.mjs` (plain node, `wrangler r2` under the hood; SPDX header not required for scripts/ — check convention: soak.mjs header style, follow it):

```js
#!/usr/bin/env node
// T15 — triage the feedback bucket from the terminal. Read-only by default;
// `--del <key>` after a report is handled. Requires a wrangler login with
// R2 access to mirror-house-feedback.
import { execSync } from 'node:child_process';

const BUCKET = 'mirror-house-feedback';
const cmd = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const args = process.argv.slice(2);

if (args[0] === '--del') {
  cmd(`npx wrangler r2 object delete ${BUCKET}/${args[1]}`);
  console.log(`deleted ${args[1]}`);
  process.exit(0);
}

const listing = cmd(`npx wrangler r2 object list ${BUCKET} --prefix fb/ --output json`);
const keys = JSON.parse(listing).map((o) => ({ key: o.key, size: o.size, at: o.last_modified }))
  .sort((a, b) => (a.key < b.key ? 1 : -1)).slice(0, Number(args[0] === '--limit' ? args[1] : 20) || 20);
for (const { key, size, at } of keys) console.log(`${at}  ${String(size).padStart(7)}  ${key}`);
const show = args.indexOf('--key');
if (show !== -1) {
  const key = args[show + 1];
  const out = JSON.parse(cmd(`npx wrangler r2 object get ${BUCKET}/${key} --pipe`));
  console.log('\n--- report ---');
  console.log(JSON.stringify({ ...out, shot: { ...out.shot, data: `<${out.shot.data.length} b64 chars>` } }, null, 2));
  execSync(`npx wrangler r2 object get ${BUCKET}/${key} --pipe > "${key.replaceAll('/', '_').replace('.json', '.jpg')}"`, { shell: 'bash', stdio: 'inherit' });
  console.log('screenshot written next to cwd (data-url jpeg — strip the prefix to view)');
}
```

(Adjust flag names against `npx wrangler r2 object list --help` / `get --help` in wrangler v4.134 — the implementer MUST verify each flag exists; if `--pipe`/`--output json` differ, use the real ones. The screenshot decode: the stored shot.data is BARE base64 — write a small decode step `Buffer.from(out.shot.data, 'base64')` into `feedback-<ts>.jpg` instead of the raw pipe. Fix the script accordingly — the version above sketches intent; deliver the corrected one.)

- [ ] **Step 2: Version bump** — `package.json` → `"version": "0.2.0-beta.4"`.
- [ ] **Step 3: Truth sweep** (grep-verify every changed claim):
  - `index.html` meta description: replace any absolute "never leaves your device" with: "…everything stays on your device; only feedback you explicitly send ever leaves it."
  - README privacy/FAQ entries: same amendment + a new short "Feedback" section: the 📮 button, what SEND ships (note, screenshot, technical details), where it goes (private R2, no public read path), rate limit (4/hour), and the GitHub/email alternatives.
  - `docs/USE-CASES.md`: add UC-5x "Report a moment — capture + send" (actor, preconditions, flow, postconditions in the file's established format).
  - `docs/TEST-CASES.md`: add the e2e cases above in the file's established format.
  - `docs/LAUNCH.md`: add the triage runbook — `node scripts/feedback-triage.mjs` (list newest), `--key <key>` (read one + decode screenshot), `--del <key>` (after handling); note the 4/hour/IP limit and that the bucket is private.
  - `SECURITY.md`/`PROVENANCE.md`: one line each — the new same-origin POST endpoint, its validation/rate limits, private bucket, no read API.
- [ ] **Step 4: Gates** — `npm run typecheck && npm run lint && npm test && npm run build`.
- [ ] **Step 5: Commit** — `git commit -m "docs(t15): feedback truth — amended promise, triage runbook, beta.4"`.

---

### Final wave (controller): review, merge, deploy, live smoke

- Whole-branch final review agent (the T14 pattern): verdict + required fixes; fix, re-gate.
- Merge to `main` (fast-forward), tag `t15`, push; deploy (`npx wrangler pages deploy dist --project-name=mirror-house` locally per convention; CI re-deploys on push).
- **Production smoke**: real POST to https://mirror-house.seolith.com/api/feedback (valid payload → 201; garbage → 400; 6 rapid → 429 on the 5th), then `node scripts/feedback-triage.mjs --limit 5` shows the objects, download+decode one screenshot, then `--del` all smoke objects (leave the bucket clean).
- Archive under `docs/prompts-history/2026/11/`, update memory, report.

## Self-Review

- **Spec coverage**: button ✓ (existing 📮, upgraded), screenshot ✓ (T2), collected ✓ (T3), arrives in production ✓ (R2), triageable ✓ (T5 script + final smoke). Privacy amendment ✓ (T5). en/hi ✓ (T2/T4). A11Y: the overlay is already a trapped dialog; new controls get labels — covered in T2/T4 relabel().
- **Placeholder scan**: the triage script Step 1 carries an explicit "verify flags + fix decode" instruction — that is a verification step, not a placeholder; everything else ships as concrete code.
- **Type consistency**: `FeedbackCtx`/`ShotWire`/`FeedbackPayload`/`WireKind`/`targetShotSize`/`buildFeedbackPayload`/`parseFeedbackPayload`/`feedbackStorageKey`/`feedbackRatePrefix` used identically across T1/T2/T3/T4. `init.snapshot` + `init.version` are declared in T2/T4's builder signatures and supplied in main.ts.

