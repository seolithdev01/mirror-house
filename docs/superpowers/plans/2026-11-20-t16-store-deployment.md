# T16 — Store deployment prep (Google Play + App Store) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything machine-side for both store pipelines is prepared, proven, and documented: a signed release AAB + APK (Play-ready), a store-grade listing package (screenshots, feature graphic, console walkthroughs with honest Data Safety/Nutrition answers), a live `/privacy.html`, the WebView feedback fix — with the human-only gates (accounts, uploads, submissions, Mac build) precisely documented.

**Architecture:** The Android Capacitor shell (`android/`, committed) is brought to store grade in place: version sync, signing wired to a git-ignored keystore, release builds via a JDK-21 wrapper script, real-emulator smoke using the android-emulator tooling. A pure origin-resolver (`feedbackApiUrl`) fixes the WebView feedback POST without touching the web path. Store art comes from a new Playwright-based raster script alongside the existing `gen-icons.mjs`; console answers are drafted as exact field-by-field tables driven by PRIVACY.md (the source of truth, already T15-accurate).

**Tech Stack:** Capacitor 8.6 + Gradle 8.14 + AGP 8.13 (JDK 21), keytool (keystore), Playwright (screenshots + raster art), Vite/static HTML (`/privacy.html`), wrangler Pages deploy.

## Global Constraints

- Repo: `D:\src\amtocsoft\amtocsoft-mirror-house`; branch `feat/t16-store`; merge to `main`; tag `t16`.
- Every new/modified source file starts with `// SPDX-License-Identifier: Apache-2.0` (JSON/gradle/config files exempt where comments can't carry it; gradle supports `//`).
- TypeScript strict, zero `any`; no innerHTML; no `Math.random` in `src/`.
- **Web CSP/SW/keymap/dock untouched EXCEPT the one sanctioned sw.js edit in Task 3** (PRECACHE + privacy fallback; BUILD restamps automatically — no manual version bump).
- **Secrets discipline**: keystore passwords exist ONLY in git-ignored `android/key.properties` (+ the .jks itself). Never print passwords to chat, reports, commits, or docs. `.gitignore` already covers `android/*.jks`, `android/**/*.jks`, `android/*.keystore`, `android/key.properties` — verify with `git check-ignore` before committing anything under android/.
- Android builds require `JAVA_HOME='C:\Users\raghu\.jdks\jdk21\jdk-21.0.13+9'` (JDK 17 on PATH fails Capacitor 8: `error: invalid source release: 21`). ANDROID_HOME is set.
- i18n: every new user-visible string in en AND hi (game strings); the privacy page ships English body (mirrors PRIVACY.md) + a short हिंदी opening note.
- Doc truth: every store-form answer must be derivable from PRIVACY.md (the canonical privacy source, T15-accurate). No stale claims — STORE-LISTING.md's pre-T15 wording gets fixed in this wave.
- Privacy promise shape (unchanged): "Nothing leaves your device unless you send it" — feedback is explicit user action.
- Gates before each commit: `npm run typecheck && npm run lint && npm test`; full `npm run e2e` before the final wave. Kill stale :5173 before e2e.
- Version contract after this wave: `package.json` = `0.2.0-beta.4` = gradle `versionName`, gradle `versionCode` = `4` (web did not bump; the store builds join the current beta).
- Honest boundary: **no iOS build happens on this Windows host** — Task 5 prepares iOS listing assets + the Mac runbook only; `cap add ios` stays mac-gated exactly as BUILD-STORES.md documents today.

---

## Background the implementers need

- Capacitor config: `capacitor.config.ts` — appId `com.amtocsoft.mirrorhouse`, appName "Mirror House", webDir `dist`, `android.allowMixedContent: false`. `npm run cap:sync` = `vite build && cap sync` (syncs `dist/` → `android/app/src/main/assets/public/`, git-ignored). Manifest permissions: exactly `INTERNET`. App label en "Mirror House", hi "आईना घर" (`android/app/src/main/res/values{,-hi}/strings.xml`).
- `android/app/build.gradle` today: `versionCode 1`, `versionName "0.2.0-beta.1"`, NO signingConfigs; `buildTypes.release` = minify disabled + proguard files. `variables.gradle`: minSdk 24, compile/target 36. AGP 8.13.0; wrapper gradle-8.14.3.
- T15 feedback: `src/ui/feedback.ts` sends buildFeedbackPayload(...) to `fetch('/api/feedback', ...)` (lines ~299–305). The endpoint (`functions/api/feedback.ts`) answers OPTIONS with `access-control-allow-origin: *` + `access-control-allow-methods: POST, OPTIONS` + `content-type` — cross-origin POSTs from a WebView pseudo-origin work once the client uses the absolute URL. `connect-src 'self'` on the WEB forbids cross-origin, so the resolver MUST keep relative on normal web origins.
- `src/game/feedbackNet.ts` is the pure contract module both ends import — the origin-resolver belongs there (pure, unit-tested).
- Icons: `npm run icons` → `scripts/gen-icons.mjs` (Playwright chromium library API, source `public/icon.svg`) → `store-assets/icon-{512,192,180,144}[-transparent].png` + all `android/.../mipmap-*` PNGs, each write PNG-header-asserted. Store fonts: `public/fonts/*` Big Shoulders Display + Mukta woff2 (usable from pages for raster art).
- PoD tokens: ink `#1b1a24`, cream `#fff4e2`, yellow `#ffc20e`, night indigo `#0b1026` (adaptive-icon bg), skew(-9°) plates, Big Shoulders Display for display text, Mukta for body.
- sw.js: `PRECACHE` array at `public/sw.js:50–59`; navigate fallback at lines 109–120 (`atlas` paths → atlas.html, else `/`). The `__MH_BUILD__` stamp restamps per build.
- PRIVACY.md (root, 47 lines) is the canonical privacy text — T15-accurate (feedback section names /api/feedback, private R2, 4/hour/IP). Its Contact section references the GitHub issues URL; the support email used in the game is `SUPPORT_EMAIL` from `src/game/feedback.ts` (verify its value; the plan assumes `teamdev01@seolith.com` — CHECK, and use whatever the code actually says everywhere).
- Playwright e2e: baseURL `http://localhost:5173`, `?test=1` skips the boot poster, `ready()` waits for `window.__MIRROR_HOUSE_DEBUG__`, `collectErrors(page)` + final `expect(errors).toEqual([])` convention. The t15 e2e (`tests/e2e/smoke.spec.ts`, "SEND posts shot+ctx") route-mocks `**/api/feedback` — `page.route` glob matches any URL ending in that path, so absolute URLs also intercept (verify in Task 1).
- The android-emulator MCP tools are available to the CONTROLLER for Task 6's smoke (build_and_run / install / launch / screenshot / ui tools). Implementer agents can't call MCP; the controller runs the emulator smoke personally, or the implementer prepares the artifact and the smoke is a controller step. Tasks must be ordered so Task 5 ends with artifacts ready for the controller's smoke.
- Current listing docs: `docs/STORE-LISTING.md` (identity table, en/hi descriptions, keywords, IARC answers, Data Safety draft — PRE-T15 wording) and `docs/BUILD-STORES.md` (full android runbook + mac-gated iOS runbook). CHANGELOG.md newest entry is beta.2 — beta.3/beta.4 backfill owed.

---

### Task 1: WebView feedback fix + version/CHANGELOG truth

**Files:**
- Modify: `src/game/feedbackNet.ts` (add `feedbackApiUrl` + `PRODUCTION_API_ORIGIN`)
- Modify: `src/ui/feedback.ts` (use the resolver in the send path; update the doc comment's "same-origin" sentence)
- Test: `tests/unit/feedbackNet.test.ts` (new describe)
- Modify: `CHANGELOG.md` (backfill beta.3 + beta.4 entries)

**Interfaces:**
- Produces (Task 2/5/6 rely on it): `export const PRODUCTION_API_ORIGIN = 'https://mirror-house.seolith.com'`; `export function feedbackApiUrl(docOrigin: string): string` — returns `'/api/feedback'` for every normal web origin, `'https://mirror-house.seolith.com/api/feedback'` ONLY for the Capacitor WebView pseudo-origins.

- [ ] **Step 1: Failing tests** — append to `tests/unit/feedbackNet.test.ts`:

```ts
import { feedbackApiUrl, PRODUCTION_API_ORIGIN } from '../../src/game/feedbackNet';
// ...
describe('feedbackApiUrl', () => {
  it('keeps web origins relative (same-origin POST under CSP self)', () => {
    expect(feedbackApiUrl('https://mirror-house.seolith.com')).toBe('/api/feedback');
    expect(feedbackApiUrl('https://mirror-house-8fg.pages.dev')).toBe('/api/feedback');
    expect(feedbackApiUrl('http://localhost:5173')).toBe('/api/feedback');
    expect(feedbackApiUrl('http://127.0.0.1:4180')).toBe('/api/feedback');
    expect(feedbackApiUrl('https://some-preview-44475be9.mirror-house-8fg.pages.dev')).toBe('/api/feedback');
  });
  it('maps the Capacitor WebView pseudo-origins to the production API', () => {
    expect(feedbackApiUrl('https://localhost')).toBe(`${PRODUCTION_API_ORIGIN}/api/feedback`);
    expect(feedbackApiUrl('http://localhost')).toBe(`${PRODUCTION_API_ORIGIN}/api/feedback`);
    expect(feedbackApiUrl('capacitor://localhost')).toBe(`${PRODUCTION_API_ORIGIN}/api/feedback`);
    expect(feedbackApiUrl('ionic://localhost')).toBe(`${PRODUCTION_API_ORIGIN}/api/feedback`);
  });
  it('never treats a ported localhost as the WebView', () => {
    // the dev/e2e server has a port; the WebView pseudo-origins do not
    expect(feedbackApiUrl('http://localhost:5173')).not.toContain(PRODUCTION_API_ORIGIN);
  });
});
```

- [ ] **Step 2: RED** — `npx vitest run tests/unit/feedbackNet.test.ts` → no export `feedbackApiUrl`.
- [ ] **Step 3: Implement** — in `src/game/feedbackNet.ts` (SPDX/imports unchanged; place near the bottom with the other key builders):

```ts
/** The only origin that hosts the ingest Function. Web builds POST relative
 *  (CSP `connect-src 'self'`), so this constant is used for nothing on the
 *  web — it exists for the Capacitor WebView, whose document origin is a
 *  pseudo-origin with no backend behind it. */
export const PRODUCTION_API_ORIGIN = 'https://mirror-house.seolith.com';

/** The exact pseudo-origins a Capacitor WebView serves documents from. Note
 *  they carry NO port — `http://localhost:5173` (the dev/e2e server) is a
 *  normal web origin and must stay relative. */
const WEBVIEW_ORIGINS = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
]);

/** Where SEND should POST given the document origin this page was served
 *  from. Web: relative (same-origin, CSP-clean, previews/dev/CI included).
 *  WebView: absolute to production (the Function answers CORS preflights). */
export function feedbackApiUrl(docOrigin: string): string {
  return WEBVIEW_ORIGINS.has(docOrigin)
    ? `${PRODUCTION_API_ORIGIN}/api/feedback`
    : '/api/feedback';
}
```

Then in `src/ui/feedback.ts`: import `feedbackApiUrl` (extend the existing `../game/feedbackNet` import) and change the send path:

```ts
        const res = await fetch(feedbackApiUrl(window.location.origin), {
```

Update the file-header/doc comment sentence that says "POSTed same-origin to /api/feedback" → "POSTed to /api/feedback — relative on the web, absolute to production from the store WebView (`feedbackApiUrl`)".

- [ ] **Step 4: GREEN + full unit** — `npx vitest run tests/unit/feedbackNet.test.ts tests/unit/feedback.test.ts`.
- [ ] **Step 5: E2E still green** (dev origin stays relative; the route glob intercepts either way) — kill stale :5173, then `npx playwright test -g "SEND posts shot"` → 1 passed.
- [ ] **Step 6: CHANGELOG backfill** — read `CHANGELOG.md`'s entry format (H2 `## [tag] — date — title (version)` + bullets), and ADD two entries ABOVE the existing newest one, matching its voice, one per line of real history:
  - `## [touch-hotfix] — 2026-11-16 — the real-device gesture blanket (v0.2.0-beta.3)` — bullets: touch-action kill-blanket + stick passthrough + HUD-tap filter; `?diag=1` diagnostics overlay; SW_CACHE mh-v7.
  - `## [t15] — 2026-11-19 — the feedback pipeline (v0.2.0-beta.4)` — bullets: composer captures the moment + SEND to /api/feedback (R2, 4/hour/IP); privacy promise amended ("nothing leaves your device unless you send it"); triage script; CI deploy checkout fix.
- [ ] **Step 7: Gates + commit** — `npm run typecheck && npm run lint && npm test` → commit `feat(t16): the WebView speaks to production — feedbackApiUrl + changelog truth`.

---

### Task 2: Android release engineering — signing, version, builds

**Files:**
- Create: `android/mirror-house-release.jks` (keytool-generated, GIT-IGNORED — never commit)
- Create: `android/key.properties` (GIT-IGNORED — never commit)
- Modify: `android/app/build.gradle` (load key.properties if present; signingConfig; versionCode 4 / versionName "0.2.0-beta.4")
- Modify: `package.json` (scripts `android:aab`, `android:apk`, `android:sync`)
- Create: `scripts/android-build.mjs` (thin JDK-21 wrapper so npm scripts are cross-platform)
- Modify: `docs/BUILD-STORES.md` (signing now wired; new commands; keystore backup duty)

**Interfaces:**
- Produces: signed release artifacts `android/app/build/outputs/bundle/release/app-release.aab` + `android/app/build/outputs/apk/release/app-release.apk` (Tasks 5/6 consume); npm scripts `npm run android:sync` / `android:aab` / `android:apk`.

- [ ] **Step 1: Keystore + key.properties** (CONTROLLER pre-step, done before dispatching this task — secrets are controller-owned): generate with the JDK21 keytool, password from node crypto, both files under android/ (git-ignored). Verify `git check-ignore android/mirror-house-release.jks android/key.properties` reports both ignored.
- [ ] **Step 2: Wire signing (fails-if-absent stays graceful)** — in `android/app/build.gradle`, ABOVE the `android {` block add:

```groovy
// T16 — release signing loads the git-ignored android/key.properties when it
// exists (storeFile/storePassword/keyAlias/keyPassword). Without it, release
// builds stay unsigned — exactly as before; nothing else changes.
def keyProps = new Properties()
def keyPropsFile = rootProject.file('key.properties')
if (keyPropsFile.exists()) {
    keyPropsFile.withInputStream { keyProps.load(it) }
}
```

Inside `android { }`, BEFORE `buildTypes`:

```groovy
    signingConfigs {
        if (keyPropsFile.exists()) {
            release {
                storeFile file(keyProps['storeFile'])
                storePassword keyProps['storePassword']
                keyAlias keyProps['keyAlias']
                keyPassword keyProps['keyPassword']
            }
        }
    }
```

and change `buildTypes.release` to:

```groovy
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            if (keyPropsFile.exists()) {
                signingConfig signingConfigs.release
            }
        }
```

Version lines 10–11 → `versionCode 4` / `versionName "0.2.0-beta.4"`.

- [ ] **Step 3: The wrapper** — `scripts/android-build.mjs` (SPDX header; follow scripts/soak.mjs style). It spawns the right gradlew task with the JDK-21 env:

```js
#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// T16 — cross-platform gradle runner for the Capacitor android shell. The
// host JDK is 17 (Capacitor 8 needs 21), so every invocation pins JAVA_HOME
// to the documented JDK 21 install. Usage:
//   node scripts/android-build.mjs <task>   e.g. bundleRelease | assembleDebug
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const task = process.argv[2];
if (!task) {
  console.error('usage: node scripts/android-build.mjs <gradle-task>');
  process.exit(1);
}
const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const androidDir = join(root, 'android');
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
const JAVA_HOME = 'C:\\Users\\raghu\\.jdks\\jdk21\\jdk-21.0.13+9';
if (process.platform !== 'win32' || !existsSync(join(JAVA_HOME, 'bin', 'java.exe'))) {
  console.error('[android-build] JDK 21 not found at the documented path — see docs/BUILD-STORES.md');
  process.exit(1);
}
const res = spawnSync(join(androidDir, gradlew), [task], {
  cwd: androidDir,
  env: { ...process.env, JAVA_HOME },
  stdio: 'inherit',
});
process.exit(res.status ?? 1);
```

package.json scripts (add, keep alphabetical-ish placement near cap:*):

```json
    "android:sync": "vite build && node scripts/gen-icons.mjs && cap sync",
    "android:aab": "node scripts/android-build.mjs bundleRelease",
    "android:apk": "node scripts/android-build.mjs assembleRelease",
```

(android:sync also refreshes launcher icons — cheap and keeps the shell current.)

- [ ] **Step 4: Sync + build both artifacts** — `npm run android:sync` (vite build + icon regen + cap sync; first sync refreshes the stale beta.1-era assets — verify `android/app/src/main/assets/public/index.html` exists and its asset hashes differ from before), then `npm run android:apk` and `npm run android:aab`. Expected: BUILD SUCCESSFUL; artifacts at the outputs paths above; the APK ~4–5 MiB. If gradle complains about JAVA or SDK licenses, report BLOCKED with the exact error (do not improvise around the JDK constraint).
- [ ] **Step 5: Verify signing + versions** — `keytool -list -v -keystore android/mirror-house-release.jks -storepass <from key.properties> | head -5` (alias mirrorhouse present) — controller-visible only, do NOT paste the password into the report; `"$ANDROID_HOME/build-tools/<newest>"/aapt2 dump badging android/app/build/outputs/apk/release/app-release.apk | head -3` → `package: name='com.amtocsoft.mirrorhouse' versionCode='4' versionName='0.2.0-beta.4'`.
- [ ] **Step 6: Docs** — BUILD-STORES.md: replace the "Wire signing … (Not wired yet …)" paragraph with the wired reality (key.properties fields, where the keystore lives, THE BACKUP DUTY: "these two git-ignored files are the only copies — back them both up to a password manager now; Play App Signing can reset a lost UPLOAD key but the store certificates chain from this one"), the npm-script commands replacing raw gradlew lines, and the version-bump note updated (versionCode 4 / versionName beta.4 now shipped). iOS section: append one line noting Task 5's iOS asset pipeline and that `cap add ios` remains mac-gated.
- [ ] **Step 7: Gates + commit** — `npm run typecheck && npm run lint && npm test` → commit. **`git status` must show NO keystore/key.properties paths** — verify explicitly and state it in the report. Commit message: `feat(t16): android release engineering — signed AAB/APK, v4/0.2.0-beta.4, JDK21 wrapper`.

---

### Task 3: `/privacy.html` + service-worker reach

**Files:**
- Create: `public/privacy.html`
- Modify: `public/sw.js` (PRECACHE + navigate fallback)
- Modify: `docs/STORE-LISTING.md` (privacy URL → the site page)
- Test: `tests/e2e/smoke.spec.ts` (page serves + headers)

**Interfaces:**
- Produces: `https://mirror-house.seolith.com/privacy.html` (Tasks 4's listings reference it; store forms require the URL).

- [ ] **Step 1: The page** — single static HTML file, PoD-styled, CSP-clean: `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset>`, viewport, `<title>Mirror House — Privacy</title>`, `<link rel="stylesheet" href="/fonts/fonts.css">`? — CHECK how index.html loads the self-hosted fonts (it uses hashed asset CSS or @font-face in index CSS; MIRROR THE EXACT MECHANISM index.html uses, so no new CSP questions). Body: header plate (yellow kicker PRIVACY / giant cream "MIRROR HOUSE" / Big Shoulders), a हिंदी opening line: `आपका सेव आपके डिवाइस पर रहता है — कुछ भी बाहर नहीं जाता जब तक आप स्वयं न भेजें।`, then the SEVEN PRIVACY.md sections with their text taken VERBATIM from PRIVACY.md (read the file; copy the prose; strip markdown syntax into proper `<h2>`/`<p>`/`<ul>`; never paraphrase), Contact section gaining the support email from `src/game/feedback.ts`'s `SUPPORT_EMAIL` (verify the actual constant value first) alongside the existing GitHub issues link, and a footer link back to `/`. One `<style>` block (mhPostBuild stamps its hash — proven mechanism), zero inline scripts, zero `style=""` attributes (build fails on those). Dark ink background (#1b1a24), cream text (#fff4e2), yellow accents (#ffc20e), Mukta body, Big Shoulders display — mirror atlas.html's approach (READ `public/atlas.html` first and follow its local patterns for font loading and plate styling).
- [ ] **Step 2: SW reach** — `public/sw.js`: add `'/privacy.html',` to PRECACHE (after the atlas entries), and extend the navigate fallback:

```js
        fetch(req).catch(() =>
          url.pathname.includes('atlas')
            ? caches.match('atlas.html')
            : url.pathname.includes('privacy')
              ? caches.match('privacy.html')
              : caches.match('/'),
        ),
```

- [ ] **Step 3: Listing truth** — STORE-LISTING.md identity table row Privacy policy URL → `https://mirror-house.seolith.com/privacy.html` (keep a secondary line noting the GitHub blob URL as a mirror).
- [ ] **Step 4: E2E** — append a small test to smoke.spec.ts (follow the file's conventions):

```ts
test('t16: privacy page serves and sw reaches it', async ({ page, request }) => {
  const res = await request.get('http://localhost:5173/privacy.html');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('Nothing leaves your device unless you send it');
  expect(html).toContain('api/feedback');
});
```

(Adjust the assertion to the page's actual verbatim sentence from PRIVACY.md — the point is: the page says what PRIVACY.md says, including the feedback section.)

- [ ] **Step 5: Gates + commit** — full gates → `feat(t16): /privacy.html — the promise, on-site and offline-reachable`.

---

### Task 4: Store art + listings + console walkthroughs

**Files:**
- Create: `scripts/gen-store-art.mjs` (Playwright raster: Play feature graphic)
- Create: `store-assets/feature-graphic-1024x500.png`
- Create: `store-assets/screenshots/play/*.png`, `store-assets/screenshots/ios/*.png` (generated by the controller via Playwright + the android emulator; see steps)
- Modify: `docs/STORE-LISTING.md` (T15-true Data Safety + Nutrition labels + screenshot manifest)
- Create: `docs/STORE-SUBMISSION.md` (step-by-step console walkthroughs, both stores)

**Interfaces:**
- Consumes: Task 3's privacy URL; PRIVACY.md prose; gen-icons.mjs patterns (Playwright library API, PNG asserts); store-assets/ conventions.
- Produces: every binary + table the human upload needs, named per the consoles' specs.

- [ ] **Step 1: Feature graphic** — `scripts/gen-store-art.mjs` (SPDX; Playwright chromium; same assertion style as gen-icons.mjs): renders a 1024×500 page — night-indigo `#0b1026` ground, the lantern (`public/icon.svg`) large on the left third, `MIRROR HOUSE` in Big Shoulders Display (load `public/fonts` woff2 via @font-face in the rendered page) cream, a yellow skew(-9°) tagline plate `DESCEND · 100 FLOORS · ONE DOOR` (or the shipped en short-description line if it fits better — copy from STORE-LISTING.md), Mukta small print `free · no ads · your save stays on your device`. Output `store-assets/feature-graphic-1024x500.png` + PNG assert (exact dimensions). Run `node scripts/gen-store-art.mjs`.
- [ ] **Step 2: Phone screenshots (Play, from the Android emulator — REAL renders)**: CONTROLLER executes this with the android-emulator tools after Task 5's artifact exists (order Tasks so this lands there) OR the implementer generates Playwright-device-emulation equivalents at `store-assets/screenshots/play/` (1080×1920 viewport, deviceScaleFactor 2.75, `?test=1`): three shots — (a) the start plate (BEGIN THE DESCENT visible), (b) maze gameplay with the minimap pane open (gold arrow, teal beacons), (c) the PAUSED plate mid-run. Name them `play-01-start.png`, `play-02-maze.png`, `play-03-pause.png`. Whichever path runs, the files must be exact 1080×1920 PNG. The controller's emulator pass supersedes/resets this task's Playwright fallback if both exist.
- [ ] **Step 3: iOS screenshots (Playwright device emulation — interim until a Mac exists)**: `store-assets/screenshots/ios/` at the two required sizes — `ios-67-1290x2796-*.png` ×3 and `ios-61-1170x2532-*.png` ×3 (same three scenes). Document IN THE FILE TREE (a `store-assets/screenshots/ios/README.md`, 3 lines) that these are emulation captures and the Mac run (Task 5's runbook) refreshes them from TestFlight builds before App Review.
- [ ] **Step 4: STORE-LISTING.md truth refresh** — fix the pre-T15 Data Safety draft. New "Play Data safety (2026-11-20 truth)" table: Q "Does your app collect or share any of the required user data types?" → **Yes** (honest: SEND transmits user content off-device) → per-type rows: `Photos and videos → Photos — Collected — User-initiated (feedback only) — Not shared — Purpose: App functionality (player feedback) — Ephemeral: No (stored privately, deletable on request)` and `Other user-generated content → Text — same columns`; `Data shared with third parties: None`; `Encryption in transit: Yes (HTTPS only)`; `Data deletion: on request via the support email`. Keep the "no ads / no analytics / no accounts / save is device-local" bullets unchanged. Add an "App Store privacy nutrition labels" table: `Data Used to Track You: None` · `Data Linked to You: None` · `Data Not Linked to You: User Content (feedback text + screenshot, app functionality)`. Every row must trace to PRIVACY.md.
- [ ] **Step 5: `docs/STORE-SUBMISSION.md`** — the human walkthrough, two sections, every field named exactly as the console names it, all values filled:
  - **Google Play Console**: Create app (name Mirror House, default language English (US) + add hi-IN, app/game = Game, free/paid = Free) → Internal testing track first → upload `app-release.aab` (from Task 2) → App content: privacy policy URL (Task 3), ads declaration **No ads**, advertising ID **No**, content rating IARC questionnaire (answers already drafted in STORE-LISTING — expected E/3+), target audience **13+** (deliberately excludes under-13 → no Families-policy obligations; stated honestly as a choice), news app **No**, COVID app **No, government app **No, data safety form (Task 4's table, field by field) → store listing (icon 512 from `store-assets/icon-512.png`, feature graphic Task 1, screenshots Task 2) → countries → roll out to internal → invite the 5 tester emails (the git-ignored invites list) → **HUMAN: create the $25 developer account first if not yet done**.
  - **App Store Connect**: **HUMAN GATE first** — $99/yr Apple Developer Program + a Mac (BUILD-STORES.md runbook: `npm i -D @capacitor/ios && npx cap add ios`, signing team, Archive, upload) → then this doc's ASC checklist: bundle id `com.amtocsoft.mirrorhouse`, version 0.2.0-beta.4, TestFlight internal testing (up to 100 App Store Connect users), metadata table (name/subtitle≤30/description from STORE-LISTING, keywords line, support URL `https://mirror-house.seolith.com` + marketing URL same, privacy policy URL Task 3), privacy nutrition labels (Task 4's table), age rating questionnaire (drafter: reference STORE-LISTING IARC answers; expected 4+/9+ band), export compliance: **uses standard encryption only → exempt (France declaration if prompted)**, screenshots (Task 3's interim set → refresh from TestFlight before review), build upload via Xcode/Transporter.
  - Both sections end with the review-latency reality (Play internal: minutes-to-hours; Play production new-personal-account: 14-day tester requirement + review; Apple: TestFlight internal immediate, external beta review ~1–2 days, App Review days) — honest, sourced from the consoles' published norms, no invented guarantees.
- [ ] **Step 6: Gates + commit** — `npm run typecheck && npm run lint && npm test` → `feat(t16): the store package — art, listings truth, console walkthroughs`.

---

### Task 5: Release smoke + runbook close

**Files:**
- Modify: `docs/BUILD-STORES.md` (emulator smoke step + MOB refresh pointer)
- Modify: `docs/TEST-CASES.md` (store-build cases)
- Modify: `CHANGELOG.md` (store-prep entry, version line)

**Interfaces:**
- Consumes: Task 2's signed APK/AAB; Task 3's privacy page; Task 1's feedbackApiUrl (the WebView POST).
- Produces: the emulator-smoke evidence + the final doc state the reviewer gates on.

- [ ] **Step 1: Emulator smoke plan (CONTROLLER executes with the android-emulator tools after this task's docs draft; the implementer documents the steps)**: BUILD-STORES.md gains a "Release smoke on the emulator" section: `npm run android:apk` → install app-release.apk → launch `com.amtocsoft.mirrorhouse` → BEGIN THE DESCENT → walk (two-zone touch) → open the map pane → 📮 → type a note → **SEND → expect 'Sent'** (this proves the Task-1 absolute-URL POST from inside the WebView against production) → triage-script the report → `--del` → screenshot the app for the runbook. The implementer writes the exact tool sequence as a numbered runbook (adb-free: the plugin's own install/launch/screenshot verbs).
- [ ] **Step 2: TEST-CASES.md** — add store cases in-file: STORE-1 signed release installs + boots to the start plate; STORE-2 SEND from the WebView reaches production (sent state); STORE-3 privacy page serves + SW fallback offline; STORE-4 AAB uploads to internal testing (human).
- [ ] **Step 3: CHANGELOG.md** — add `## [t16] — 2026-11-20 — store deployment prep (v0.2.0-beta.4)` above the beta.4 entry: signed release pipeline, /privacy.html, WebView feedback fix, store package + walkthroughs.
- [ ] **Step 4: Gates + commit** — `feat(t16): release smoke runbook + cases + changelog close`.

---

### Final wave (controller): emulator smoke, review, merge, deploy, archive

1. Controller emulator smoke per Task 5's runbook (install signed APK → play → SEND → production 201 → triage → cleanup). If the SEND tap is too flaky under uiautomator, capture the attempt, verify the failure-state honesty in-app, and verify the absolute POST separately (curl from the pseudo-origin header is meaningless — instead: serve a page from https://localhost impossible here; accept the web e2e + the unit contract + the Function's CORS answers as the proof chain, and mark STORE-2 'verified on device at next MOB pass').
2. Whole-branch final review agent (the established package + all gates re-run).
3. Merge `feat/t16-store` → `main` (ff), tag `t16`, push; deploy; verify https://mirror-house.seolith.com/privacy.html → 200 with the global CSP headers.
4. Archive `docs/prompts-history/2026/11/2026-11-20_*_t16-*.md`; update memory.

## Human gates (documented in STORE-SUBMISSION.md — nothing here blocks the prep)

1. Google Play developer account ($25 once) — then Task 4's walkthrough is click-by-click.
2. Apple Developer Program ($99/yr) + a Mac for `cap add ios`/Archive — BUILD-STORES.md has the runbook; optional future lane: GitHub Actions macOS runner for CI-signed builds (documented as an idea only, not built).
3. Keystore backup duty: `android/mirror-house-release.jks` + `android/key.properties` are the only copies (git-ignored) — back both up to a password manager before anything else.
4. The uploads, console declarations, and reviewer conversations themselves.
5. Real-device MOB-1/MOB-3 pass on the release build (the emulator smoke is not a phone).

## Self-Review

- **Coverage**: WebView fix (T1) → store build correctness (T2) → privacy URL (T3) → listing/console package (T4) → smoke/runbook (T5) → controller smoke + ship. Human gates enumerated. Store-listing staleness (pre-T15 Data Safety) fixed in T4. CHANGELOG debt cleared in T1/T5. Emulator-artifact ordering: T2 produces artifacts; T5 runbook; controller smokes in the final wave.
- **Placeholders**: none — every step has concrete content; the two intentionally-controller-owned steps (keystore generation, emulator drive) are explicit with their tools named.
- **Type consistency**: `feedbackApiUrl`/`PRODUCTION_API_ORIGIN` defined in T1, consumed in ui/feedback.ts (T1) and referenced by the runbook claims (T5). Artifacts named identically across T2/T4/T5 (`app-release.aab`, `app-release.apk`). The privacy URL string identical across T3/T4.
