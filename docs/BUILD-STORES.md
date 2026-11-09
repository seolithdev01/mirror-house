# Building & Shipping to Stores — Mirror House

How the one web codebase becomes store builds. Capacitor wraps the same
`vite build` output (`dist/`) that ships to Cloudflare Pages — the game code is
identical on web and in the stores; everything store-specific lives in
`capacitor.config.ts`, the `android/` native project, and this runbook.

- App ID: `com.amtocsoft.mirrorhouse` · App name: `Mirror House` (Hindi label:
  `आईना घर`, `android/app/src/main/res/values-hi/strings.xml`)
- Android version: `versionCode 1` / `versionName "0.2.0-beta.1"` in
  `android/app/build.gradle`. Bump **both** on every store upload — `versionCode`
  must increase by at least 1 each time; `versionName` is what players see.
- Capacitor 8 (gradle wrapper 8.14.3, AGP 8.13.0, minSdk 24 / target 36 — the
  values live in `android/variables.gradle`).

## Everyday workflow (web → device)

```bash
npm run cap:sync     # vite build + cap sync (copies dist/ + config into android/)
npm run cap:android  # open the project in Android Studio
```

Edit web code → `cap:sync` → run. Native-only changes don't need a sync.
`cap sync` is idempotent; the copied assets under
`android/app/src/main/assets/public/` are generated (git-ignored) — never edit
them by hand.

## Android

### Prerequisites

- Android Studio (with SDK platform 36); `ANDROID_HOME` set
  (`%LOCALAPPDATA%\Android\Sdk` on this host). `local.properties` (sdk.dir) is
  generated per-machine and git-ignored.
- **JDK 21 — required, proven 2026-11-09.** Capacitor 8's android modules
  compile with `sourceCompatibility JavaVersion.VERSION_21`, so a JDK 17
  `JAVA_HOME` dies at `:capacitor-android:compileDebugJavaWithJavac` with
  `error: invalid source release: 21`. Android Studio's bundled JBR (21)
  works out of the box; for command-line builds point `JAVA_HOME` at a JDK
  21. This host carries a portable Temurin 21.0.13+9 (checksum-verified from
  the Adoptium API) at `C:\Users\raghu\.jdks\jdk21\jdk-21.0.13+9`:

  ```bash
  JAVA_HOME='C:\Users\raghu\.jdks\jdk21\jdk-21.0.13+9' ./gradlew assembleDebug
  ```

  (`org.gradle.java.home` in `android/gradle.properties` is the sticky
  per-project alternative.)

### Debug build / run on a device

```bash
npx cap run android           # build + install + launch on device/emulator
# or, from android/:
./gradlew assembleDebug        # APK at android/app/build/outputs/apk/debug/
```

Debug builds are signed with the auto-generated debug keystore — fine for
testing and sideloading, not for Play.

Proven 2026-11-09 (m6/T5, clean tree: `npm run build` → `npx cap sync
android` → `./gradlew assembleDebug --no-daemon` under JDK 21):
`BUILD SUCCESSFUL in 52s` → `android/app/build/outputs/apk/debug/app-debug.apk`
at 4,278,439 bytes (4.08 MiB). `aapt dump badging` confirms
`com.amtocsoft.mirrorhouse` versionCode 1 / versionName `0.2.0-beta.1`,
minSdk 24 / target 36, label "Mirror House" (hi: `आईना घर`), launchable
`MainActivity`, and the full web shell — `index.html`, `sw.js`, hashed JS
bundle, and `venues/demo-glasshouse-cafe.json` — bundled under
`assets/public/`. The same session also proved `assembleRelease`:
`app-release-unsigned.apk` at 3,281,351 bytes (3.13 MiB).

### Release build (signed)

One-time — create the upload keystore and keep it safe (losing it means losing
the app's Play identity; back it up somewhere that is not this repo):

```bash
keytool -genkeypair -v \
  -keystore android/mirror-house-release.jks -alias mirrorhouse \
  -keyalg RSA -keysize 2048 -validity 10000
```

The repo already git-ignores `android/*.jks`, `android/*.keystore`, and
`android/key.properties` — the keystore and its passwords never get committed.

Wire signing via `android/key.properties` (git-ignored) with
`storeFile`/`storePassword`/`keyAlias`/`keyPassword`, load it in
`android/app/build.gradle`, and point `buildTypes.release.signingConfig` at it —
the pattern is the official Capacitor docs recipe:
<https://capacitorjs.com/docs/android/deploying-to-google-play>. (Not wired yet:
there is no release keystore in this repo by design; add it when first needed.)

Then build:

```bash
cd android
./gradlew bundleRelease      # AAB for Play → app/build/outputs/bundle/release/
./gradlew assembleRelease    # signed APK (only if sideloading a release build)
```

Google Play requires the **AAB** (`bundleRelease`) for uploads.

### Play Console upload

1. Play Console → Create app (`Mirror House`, Game, Free) — one-time, $25.
2. Testing → Internal testing → create track → upload the `.aab` → add testers.
3. Before any public track, complete the one-time console gates:
   - **Data Safety form** — answers come straight from [`PRIVACY.md`](../PRIVACY.md):
     no data collected, no data shared, no analytics/telemetry; saves live in
     on-device IndexedDB; the only network fetches are the app's own bundled
     assets. Every "do you collect" answer is _No_.
   - **Content rating (IARC)** questionnaire — see the iOS/IARC section below;
     answers are store-agnostic.
   - Store listing (icon, screenshots, short description) — assets from the
     M6 listing kit.
4. Internal test → closed → open testing → production, one track at a time.

## iOS — REQUIRES A MAC

This repo lives on a Windows host; Xcode only runs on macOS. Nothing here is
done yet — when a Mac is available:

```bash
npm i -D @capacitor/ios
npx cap add ios
npx cap open ios        # opens Xcode
```

1. Xcode: set the signing team (Apple Developer account, $99/yr) for the
   `Mirror House` target; let Xcode manage the profile.
2. Bump the iOS build number/version to match the Android pair
   (versionCode ↔ CFBundleVersion, versionName ↔ CFBundleShortVersionString).
3. Test on a real device (WebView behavior differs from simulator), then
   Product → Archive → upload to App Store Connect.
4. App Store Connect: create the app record, fill the listing, upload the
   build, submit for review. First submission needs the release notes /
   review-notes answers ready (offline game, no accounts, no data collected).
5. **IARC content rating**: both stores route through the same IARC
   questionnaire — answer once, reuse everywhere. It is a puzzle game with no
   violence/user-generated content/real gambling: expected rating is the
   lowest band (E/3+) — answer honestly, the questionnaire decides.

## WebView notes (why nothing needed porting)

- **Audio gesture policy**: the audio engine (`src/audio/engine.ts`) creates
  and resumes its `AudioContext` on the first user gesture — the exact behavior
  mobile WebViews demand. Same code path as browsers; nothing to configure.
- **Service worker / offline**: the SW is registered root-relative (`/sw.js`)
  in PROD builds; inside the app it registers on the WebView's local origin
  (`https://localhost` — Capacitor's default `androidScheme`; older docs call
  it `capacitor://localhost`). It is a secure context, so registration works
  and the game plays fully offline, exactly like the PWA.
- **Venue packs**: fetched as `/venues/<id>.json` — `cap sync` bundles them
  from `dist/venues/` into the APK (`assets/public/venues/`), so packs load
  from the app's own assets with zero network.
- **CSP**: the strict CSP in `public/_headers` is a Cloudflare Pages mechanism
  and simply doesn't apply inside the WebView — harmless, because the entire
  bundle is local (`allowMixedContent: false` in `capacitor.config.ts`) and the
  app makes no external requests anyway.
- **Saves**: IndexedDB on the WebView origin — uninstalling the app deletes
  progress (same as clearing site data on web). No migration needed.

## Launcher icons

`cap add` ships Capacitor's stock icons — those are gone. `npm run icons`
(`scripts/gen-icons.mjs`) renders `public/icon.svg` into every launcher size
(legacy `ic_launcher`/`ic_launcher_round` at 48–192 px + the adaptive
`ic_launcher_foreground` at 108 dp per density, glyph at 60% height inside the
66/108 safe zone) and the store set in `store-assets/` (see
[`STORE-LISTING.md`](STORE-LISTING.md)); the adaptive background layer is the
`@color/ic_launcher_background` night indigo (`#0b1026`). Change the icon by
editing `public/icon.svg`, re-running `npm run icons`, then `npx cap sync
android`.
