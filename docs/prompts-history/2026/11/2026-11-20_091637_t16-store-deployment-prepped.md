# T16 — Android + iOS store deployment: planned and prepared (merged, live)

| | |
|---|---|
| **Step** | Store milestone (user: "Plan and Prepare an android and ios store deployment") |
| **Local time** | 2026-11-20 09:16:37 |
| **Status** | Complete — merged to `main` (tag `t16`), pushed, deployed; **Android upload-ready (signed AAB, proven on the emulator incl. a real SEND to production); iOS fully prepared, build mac-gated (documented)** |

## Request (verbatim)

> Plan and Prepare an android and ios store deployment

## Response

Everything machine-side for both store pipelines is prepared, proven, and documented (7 tasks + final review: "with fixes" — one doc cell landed; gates at merge: **1110/1110 unit, 60/60 e2e, build green, every committed asset header-verified**).

**Android — upload-ready:**
- **Signed release pipeline**: keystore generated (git-ignored `android/mirror-house-release.jks` + `android/key.properties`, alias `mirrorhouse`, backup duty documented), signing wired graceful-absent in `android/app/build.gradle`, versionCode 4 / versionName 0.2.0-beta.4, JDK-21 wrapper `scripts/android-build.mjs` (with the node-CVE `shell:true` spawn fix the implementer contributed), npm scripts `android:sync/aab/apk`. Artifacts: **app-release.aab 3.77 MiB + app-release.apk 3.91 MiB**.
- **Proven on the emulator (the smoke that matters)**: signed APK installed on `medium_phone_gapi` (API 35) → boots to the start plate (amended privacy line visible) → touch ladder locks TOUCH, fps 52–60 → 📮 composer captures the live frame → **SEND → "Sent — the architects have it. Thank you." → the report landed in production R2 (17.9 KB, v0.2.0-beta.4, WebView UA) → triaged + deleted, bucket left empty.** The WebView fix (`feedbackApiUrl` — pseudo-origins map to the absolute production API; every web origin stays relative under CSP) is proven ON DEVICE.
- **Tier-1 Play screenshots**: three real renders from the release build (maze / Pac-minimap / feedback-sent), cropped 1080×1920 JPEG no-alpha by `scripts/crop-emulator-shots.mjs`.

**iOS — prepared, honestly mac-gated:** listing metadata complete (name, 30-char subtitle, keywords 86/100, descriptions en/hi), privacy nutrition labels table, age-rating answers, export-compliance line, interim 6.7"/6.1" screenshot sets (documented as emulation until TestFlight refreshes them), and the full Mac runbook (`cap add ios` → Archive → App Store Connect → TestFlight) in BUILD-STORES.md.

**Both stores:** `/privacy` now live on the site (PRIVACY.md verbatim as a PoD page, SW-reachable offline; the store URL) · `docs/STORE-SUBMISSION.md` — click-by-click console walkthroughs with every value pre-filled (Advertising ID No, no-ads, target 13+, Data Safety rows tracing to PRIVACY.md, contact `itsupport01@seolith.com`) · feature graphic + icon 512 + manifests · CHANGELOG backfilled (beta.3/beta.4/t16).

**Final review caught**: the walkthrough's screenshot row still named the superseded Tier-2 PNGs — fixed pre-merge (the human would have uploaded the fallback set).

**Human gates (all documented in STORE-SUBMISSION.md):** ① Play developer account ($25 once) → internal track → upload the AAB → invite the 5 testers; ② Apple Developer ($99/yr) + a Mac → `cap add ios` → Archive → TestFlight; ③ keystore backup (the two git-ignored files are the only copies); ④ real-device MOB-1/MOB-3 pass; ⑤ the uploads and reviewer conversations themselves.

**Live:** https://mirror-house.seolith.com (+ /privacy) · github.com/seolithdev01/mirror-house @ `t16`.

## Artifacts

- Commits `cb2bcc3..d9fc639` + `cf3ae77` on main, tag `t16`
- New: `functions/`-side unchanged; `src/game/feedbackNet.ts` resolver; `android` signing + wrapper; `public/privacy.html`; `scripts/{android-build,crop-emulator-shots}.mjs`; `store-assets/` (feature graphic, Tier-1 JPEGs, iOS sets); `docs/STORE-SUBMISSION.md`
- Fast-follow lane: PRIVACY.md CSP-block refresh + Contact alias (then regen the page); wrapper argv guard + POSIX-honest error; sw BUILD hash folding page bytes
