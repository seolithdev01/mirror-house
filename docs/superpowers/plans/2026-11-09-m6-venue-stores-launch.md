# M6: Venue Packs, Store Builds, Beta Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The launch milestone: the venue-pack system with a playable DEMO venue floor (partner sign-off stays OPEN — human gate), the Capacitor Android platform built into a real APK (iOS scaffolded + Mac runbook — Windows host cannot run Xcode), the store-listing/IARC/privacy-declaration kit, and the beta launch kit (announcement copy, version bump, SW cache bump, web deploy).

**Architecture:** `VenuePack` = a strictly-validated JSON document (id/name/colors/floor overrides/sponsored blurb/locale strings) living under `public/venues/`; `src/game/venue.ts` validates + applies it (deterministic floor params + palette accents) as an OPT-IN floor from a settings "Floors" section; the demo pack is clearly-labeled fictional ("Glasshouse Café — DEMO"). Capacitor wraps `dist/` (webDir) — the game code is unchanged; store differences live in config + native projects only. Icons: SVG rendered to PNGs via a Playwright script (zero new deps).

**Tech Stack:** + `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (Apache-2.0) — new runtime dep: capacitor core only.

**Spec:** §9.2 (venue floors), §13.2 M6, §11.5 (trademark note), §13.4 (launch).

## Global Constraints

- No-break: 318 unit + 24 e2e stay green on web (venue e2e adds one → 25); the default web experience unchanged unless a pack is opted into.
- Venue-pack legal shape per spec §9.2: packs are optional, versioned, never merged into core; the DEMO pack is fictional and labeled; PROVENANCE.md gains the venue-trademark policy.
- Saves: pack selection is session/local only (`?venue=` URL + settings toggle), NOT persisted into the campaign save by default (a venue floor is a side-floor: entering it from settings plays a standalone seeded floor with the pack's params — campaign untouched). Simplest honest scope: venue floor = one-off floor (seed = pack id + daily), bests NOT recorded, shards NOT awarded (it's sponsored content, not the ladder) — document in the pack UI.
- Android: `applicationId com.amtocsoft.mirrorhouse`; minSdk 24 (per Capacitor 7 default; WebView Chrome ≥53 has WebGL2 — fine); versionName 0.2.0-beta.1. iOS: config + runbook only (`docs/BUILD-STORES.md`).
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(m6)/chore(m6)/docs(m6)`.
- Version bump: package.json 0.2.0-beta.1; `SW_CACHE` bump 'mh-v5'; CHANGELOG.md started (m0→m6 one-liners).

---

### Task 1: Venue-pack system + DEMO pack

**Files:**
- Create: `src/game/venue.ts`, `public/venues/demo-glasshouse-cafe.json`
- Modify: `src/main.ts` (`?venue=` param + settings "Floors" section entry → `playVenueFloor(pack)`), `src/ui/settings.ts` (Floors section: demo pack card + Play button + "sponsored floors never touch your campaign" note), `PROVENANCE.md` (venue-trademark policy), tests, e2e (+1)

**Interfaces:**

```ts
export interface VenuePack { v: 1; id: string; name: string; tagline: string; locale: { en: Record<string, string>; hi: Record<string, string> };
  accent: { primary: number; secondary: number }; floor: { width: number; height: number; braid: number; beacons: number; echoes: number; standing: number } }
export function validateVenuePack(raw: unknown): VenuePack | null; // strict: exact keys, bounded sizes 11..25, counts within sane ranges, id /^[a-z0-9-]{3,24}$/
export function venueFloorParams(p: VenuePack): { mazeOverrides: { width; height; braid }; objectOverrides: { beacons; echoes; standing } };
export function venueSeed(p: VenuePack, dayStamp: string): string; // `${p.id}:${dayStamp}` → valid seed chars only (hash via xmur3 if ':' illegal → ':' is fine, generateFloor takes any string; the SEED CODE display uses floorSeed→ normalize — keep id [a-z0-9-] + day 'YYYY-MM-DD' → replace '-' ok. Simplest: xmur3(`${id}:${day}`) → 8-char code)
```

main: `?venue=demo-glasshouse-cafe` (or settings Play) → build floor with venue params + accent materials (marker/beacon emissive → pack primary/secondary), HUD banner `☕ Glasshouse Café — DEMO floor (daily seed)`, campaign hooks bypassed (no descend/clear-banking — exit shows "Floor cleared — return via ⚙"), back-to-campaign button in the banner. i18n: pack taglines via locale tables.

- [x] **Step 1: Failing tests** — validate strict/lenient cases; venueFloorParams clamps; venueSeed deterministic + charset-valid. **Step 2: RED → implement → GREEN.** **Step 3: Wire settings/URL/banner/return; PROVENANCE policy; e2e `m6: venue demo floor loads and returns` (goto ?venue=… → banner shows pack name → floor builds with beacons=pack count via hook `venue()` → exit reach → return → campaign().floor unchanged). Gates + 25/25.** **Step 4: Commit** — `feat(m6): venue-pack system + glasshouse café demo floor`

---

### Task 2: Capacitor + Android platform

**Files:**
- Create: `capacitor.config.ts`, `android/` (via cap add), `docs/BUILD-STORES.md`
- Modify: `package.json` (deps + scripts `cap:sync`, `cap:android`), `.gitignore` (android build outputs)

**Steps:**
- [x] 1. `npm i @capacitor/core && npm i -D @capacitor/cli @capacitor/android`; `capacitor.config.ts` (appId `com.amtocsoft.mirrorhouse`, appName `Mirror House`, webDir `dist`, android: { allowMixedContent: false }); `npm run build && npx cap add android && npx cap sync`; commit the platform (gitignore `android/.gradle/`, `android/app/build/`, `android/app/release/`).
- [x] 2. App metadata: label `Mirror House` (+ hi `आईना घर` in values-hi), versionCode 1 / versionName `0.2.0-beta.1` in `android/app/build.gradle`; launcher icons from T3's PNGs (`cap copy` after).
- [x] 3. `docs/BUILD-STORES.md` — the full runbook: Android (debug APK locally: `npx cap run android`; release: keystore create + `assembleRelease`/bundleRelease + Play Console upload steps + Data Safety answers pointer); iOS (REQUIRES a Mac: `npm i -D @capacitor/ios`, `npx cap add ios`, open Xcode, signing with the Apple Developer account, App Store Connect steps, IARC); WebView notes (audio gesture policy already handled; SW runs in WebView origin — offline works).
- [x] 4. Verify: `npx cap sync android` clean; gradle wrapper present. Commit — `chore(m6): capacitor + android platform, store build runbook`

---

### Task 3: Icons via Playwright + store-listing kit

**Files:**
- Create: `scripts/gen-icons.mjs`, `docs/STORE-LISTING.md`, `store-assets/` (generated PNGs: 512, 192, 180, 144 + feature-graphic notes)
- Modify: `android/…/res` mipmap (real PNGs replace defaults)

**Steps:**
- [x] 1. `scripts/gen-icons.mjs` — Playwright renders `public/icon.svg` at 512/192/180/144 (transparent + solid-indigo-background variants for adaptive-icon layers), writes PNGs to `store-assets/` and into the android mipmap dirs; `npm run icons`. Run it — real PNGs land.
- [x] 2. `docs/STORE-LISTING.md` — en+hi short/full descriptions, keywords, category (Game/Puzzle/Adventure), screenshots checklist (FOCUS+reflection, QUAD, OVERHEAD tactical, Dwaar, settings-a11y, Hindi UI), IARC questionnaire DRAFTED ANSWERS (fantasy violence: glass shatter, no blood/gore → expected E10+/PEGI7), Data Safety (collects nothing — device-only storage), privacy-policy URL = the PRIVACY.md page URL on the repo/site.
- [x] 3. Gates (icons script is standalone; web unchanged); 25/25. Commit — `chore(m6): launcher/store icons + store listing & ratings kit`

---

### Task 4: Launch kit + version/cache bump + M5 minors

**Files:**
- Create: `docs/LAUNCH.md`, `CHANGELOG.md`
- Modify: `package.json` (0.2.0-beta.1), `public/sw.js` (SW_CACHE 'mh-v5'), `src/main.ts` (M5 minors: Escape with two stacked dialogs closes only the topmost; arrows don't flip radios while ⚙ open → stand-down already covers activation keys — extend to Arrow keys when settings open), `README.md` (status → Beta; badges text; links), `src/ui/faq.ts` (+1: venue floors)

**Steps:**
- [x] 1. `docs/LAUNCH.md` — beta announcement copy (Reddit r/WebGames + r/InternetIsBeautiful drafts: the one-line pitch, 3-bullet hook, link, feedback ask), the venue-pilot pitch template for local ventures (what they get, what it costs nothing/beta, the pack checklist), launch-day checklist (web ✓ live, stores via BUILD-STORES, venues via LAUNCH template).
- [x] 2. CHANGELOG (m0 scaffold → m5 a11y one-liners + m6). Version + SW_CACHE bump. M5 minors (Escape topmost-only; arrows-in-settings).
- [x] 3. Gates + 25/25 e2e. Commit — `chore(m6): launch kit, version 0.2.0-beta.1, sw cache bump, m5 minors`

---

### Task 5: Android debug build + close-out

**Steps:**
- [x] 1. **Real build attempt**: `cd android && ./gradlew.bat assembleDebug` (Java 17 + SDK present). If green → APK path recorded; install-less smoke: report APK size + manifest sanity (aapt if available). If the build fails on environment quirks (NDK/SDK licenses), fix or honestly record the blocker + remaining steps — no fake claims.
- [x] 2. Spec §13.2 M6 annotated: web beta LIVE ✓; venue machinery LIVE with DEMO pack ✓ (partner sign-off OPEN); Android platform built (status per step 1; store submission OPEN pending Play account); iOS runbook ✓ (Mac required); §13.4 launch checklist updated. README + FAQ final. Plan ticks.
- [x] 3. Full gates + 25/25 + bundle check. Commit — `docs(m6): launch status, changelog, exit marks`

## Plan Self-Review

- Coverage vs M6 ("store builds, listings, IARC; venue pilot; full launch"): venue system+demo T1 ✓ (partner OPEN), Android platform+build T2/T5 ✓ (submission = user's Play account), iOS runbook T2 ✓ (host limitation, honest), listings/IARC/Data-Safety T3 ✓, launch kit + web-live T4 ✓. Beta = web live (true now) + stores armed. ✓
- Placeholders: none; the APK build outcome is explicitly allowed to be "attempted + honestly recorded".
- Type consistency: VenuePack consumed T1-only (self-contained); capacitor config standalone; no game-code API changes beyond venue entry + two M5-minor fixes.
