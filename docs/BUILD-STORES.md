# Building & Shipping to Stores — Mirror House

How the one web codebase becomes store builds. Capacitor wraps the same
`vite build` output (`dist/`) that ships to Cloudflare Pages — the game code is
identical on web and in the stores; everything store-specific lives in
`capacitor.config.ts`, the `android/` native project, and this runbook.

- App ID: `com.amtocsoft.mirrorhouse` · App name: `Mirror House` (Hindi label:
  `आईना घर`, `android/app/src/main/res/values-hi/strings.xml`)
- Android version: `versionCode 4` / `versionName "0.2.0-beta.4"` in
  `android/app/build.gradle` (shipped with the T16 store build). Bump **both**
  on every store upload — `versionCode` must increase by at least 1 each time;
  `versionName` is what players see.
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
  the Adoptium API) at `C:\Users\raghu\.jdks\jdk21\jdk-21.0.13+9`. The release
  npm scripts (`android:aab` / `android:apk`) pin this automatically through
  `scripts/android-build.mjs`; for any other raw gradlew invocation:

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

Signing is **wired** (T16): `android/app/build.gradle` loads the git-ignored
`android/key.properties` when it exists and points
`buildTypes.release.signingConfig` at it — the official Capacitor docs recipe:
<https://capacitorjs.com/docs/android/deploying-to-google-play>. Without the
file, release builds stay unsigned, exactly as before. The four fields in
`android/key.properties`:

```properties
storeFile=../mirror-house-release.jks
storePassword=<set — never committed>
keyAlias=mirrorhouse
keyPassword=<set — never committed>
```

The keystore lives at `android/mirror-house-release.jks` (alias `mirrorhouse`,
RSA 2048, 10000-day validity). **THE BACKUP DUTY:** these two git-ignored files
are the only copies — back them both up to a password manager now; Play App
Signing can reset a lost UPLOAD key but the store certificates chain from this
one.

Then build from the repo root (JDK 21 pinned for you by the wrapper):

```bash
npm run android:sync         # vite build + launcher icons + cap sync
npm run android:aab          # AAB for Play → android/app/build/outputs/bundle/release/
npm run android:apk          # signed APK (only if sideloading a release build)
```

Google Play requires the **AAB** for uploads.

### Release smoke on the emulator

One pass of the signed release build on an emulator before any console
upload. It proves the whole store chain at once: the artifacts install and
boot, the touch loop plays, and the 📮 SEND — the one code path that had to
change for the store — reaches production from inside the WebView. That last
step is the point of the smoke: on the WebView's origin (`https://localhost`,
Capacitor's default `androidScheme`) a relative `/api/feedback` would POST
to localhost and die; `feedbackApiUrl` (`src/game/feedbackNet.ts`) maps the
four WebView pseudo-origins (`https://localhost`, `http://localhost`,
`capacitor://localhost`, `ionic://localhost`) to `PRODUCTION_API_ORIGIN`, so
the store build's one POST lands on the same
`https://mirror-house.seolith.com/api/feedback` the web build uses.

Build (or take the artifacts the release build above produced), then
install and launch — with the emulator tooling that is its install verb and
launch-by-application-id; plain adb is the human equivalent:

```bash
npm run android:apk        # → android/app/build/outputs/apk/release/app-release.apk
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.amtocsoft.mirrorhouse/.MainActivity
```

Then drive the game like a player (a screenshot at every beat is the
evidence set; if anything misbehaves, the tooling's log verb filtered by
`com.amtocsoft.mirrorhouse` is ground truth):

1. The boot poster fades; the MIRROR/HOUSE plate rises with **BEGIN THE
   DESCENT** focused — tap it.
2. Walk with the two-zone touch: drag on the LEFT of the screen to walk,
   sweep on the RIGHT to turn (the MOB-3 stick). Tap the dock's ❄ at a
   beacon too, if you want the full loop.
3. Tap the dock's **MAP** chip — the minimap overlay summons and the chip's
   pressed state matches.
4. Tap 📮 (top right), type a one-line note (`release smoke — webview
   SEND`), press **SEND**. Expect the status line to walk Sending… →
   **"Sent — the architects have it. Thank you."** — the production
   Function answered 201 from inside the WebView. (A re-run inside the same
   hour counts against the 4/hour/IP limiter; its honest 429 line means the
   limiter is answering, not that the fix failed.)
   **If the SEND tap proves flaky under UI automation**, the failure state
   is still honest — the composer keeps the draft and the shot and shows
   the real error ("Not sent (…)", the FBK-3 contract). Capture the
   attempt, then lean on the already-green proof chain — the web SEND e2e,
   the `feedbackApiUrl` unit contract, and the Function's CORS answers —
   and mark STORE-2 "verified on device at next MOB pass" instead of
   forcing the tap.
5. Triage the report, then delete it — the smoke's report is real traffic
   to the production bucket. The full bench is [LAUNCH.md §5](LAUNCH.md);
   the minimum here:

   ```bash
   node scripts/feedback-triage.mjs                # the report is listed
   node scripts/feedback-triage.mjs --key <key>    # read it (decodes the shot)
   node scripts/feedback-triage.mjs --del <key>    # retire it
   ```

   (`--sweep-markers` clears the `rate/` markers the limiter counts — safe,
   resets nothing the player sees.)
6. Keep the screenshots (PNG) — the plate, a live floor, the map pane, the
   Sent state — as the real-emulator set `store-assets/screenshots/play/`
   wants (an emulator profile at 1080×1920 produces the console's 9:16
   directly; the walkthrough prefers this set over the Playwright interim
   one).

The emulator is not a phone. After the smoke, install this same release
build on a real device and run MOB-1 and MOB-3 once (the standing note at
the top of the mobile section in [TEST-CASES.md](TEST-CASES.md)) — the
gesture-recognition failure class that hardening targets only misbehaves
where the browser can claim a gesture, and the emulator's WebView is not
that surface.

### Play Console upload

1. Play Console → Create app (`Mirror House`, Game, Free) — one-time, $25.
2. Testing → Internal testing → create track → upload the `.aab` → add testers.
3. Before any public track, complete the one-time console gates:
   - **Data Safety form** — the 2026-11-20 truth table lives in
     [`STORE-LISTING.md`](STORE-LISTING.md) (every row traces to
     [`PRIVACY.md`](../PRIVACY.md)): overall **Yes** — the 📮 SEND composer is
     the one user-initiated off-device flow (a screenshot + note, feedback
     purpose, not shared, deletable on request); no ads/analytics/accounts;
     the save stays in on-device IndexedDB.
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

Task 5 ships the iOS asset pipeline (icons / listing assets generated from
`store-assets/`), but `cap add ios` remains mac-gated — the native iOS project
can only be created on a Mac.

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
