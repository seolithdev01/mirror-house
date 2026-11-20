# Store submission walkthroughs — Mirror House

The human's step-by-step path through both consoles. Every field is named as
the console names it and every value is pre-filled here — copy, paste, move on.
The truth hierarchy, in order:

1. [PRIVACY.md](../PRIVACY.md) — the canonical privacy sentence ("nothing
   reaches us unless you send it"). Every Data Safety / nutrition-label answer
   traces to it (row-by-row tables in [STORE-LISTING.md](STORE-LISTING.md)).
2. [STORE-LISTING.md](STORE-LISTING.md) — listing copy, IARC answers, the
   asset manifest, the 2026-11-20 Data Safety truth.
3. [BUILD-STORES.md](BUILD-STORES.md) — the build/signing mechanics both
   sections below assume.

Console forms get reworded by their owners; where a field's exact live name
cannot be verified from this repo's docs it carries
**(verify at entry)**. The contact email everywhere is
`itsupport01@seolith.com` (`SUPPORT_EMAIL`, `src/game/feedback.ts` — the same
address the 📮 composer's mailto exit uses).

---

## Part A — Google Play Console

### A0. HUMAN GATE — the developer account

**If the $25 developer account does not exist yet, create it first** —
nothing else in this section is possible without it:
play.google.com/console → sign up → one-time **$25 registration fee** →
identity verification (personal or organization; a personal account is fine to
start). New personal accounts carry the closed-testing requirement noted in
§A6 — start this gate early.

### A1. Create the app

Play Console → **All apps** → **Create app**, exactly:

| Field                  | Value                                              |
| ---------------------- | -------------------------------------------------- |
| App name               | `Mirror House`                                     |
| Default language       | **English (United States)**                        |
| App or game            | **Game**                                           |
| Free or paid           | **Free**                                           |
| Declarations           | accept both (Developer Program Policy + US export laws) |

→ **Create app**. Add the Hindi locale later in the store listing's
**Manage translations** (hi-IN: app name `आईना घर` + the hi copy in
[STORE-LISTING.md](STORE-LISTING.md)) **(verify at entry — the translations
entry point has moved between console versions)**.

### A2. Upload the build — Internal testing track first

1. Left nav: **Testing → Internal testing** → **Create new release**.
2. **Google Play App Signing**: accept the default (Play keeps the signing
   key; your `android/mirror-house-release.jks` stays the upload key —
   back both it and `android/key.properties` up per BUILD-STORES.md).
3. **Upload**: `android/app/build/outputs/bundle/release/app-release.aab`
   (Task 2's artifact — **versionCode 4, versionName 0.2.0-beta.4** as pinned
   in `android/app/build.gradle`; bump both on every re-upload, versionCode
   strictly increasing).
4. **Release name** auto-fills from the version; **Release notes**: one line
   from the top of [CHANGELOG.md](../CHANGELOG.md).
5. **Review release → Start rollout to Internal testing.**
6. **Testers** tab → create an email list (suggest name `mirror-house-beta`)
   → add the five tester addresses from the **git-ignored invites list**
   ([docs/invites/](invites/), see [TESTERS.md](TESTERS.md) — never commit
   real addresses) → copy the **opt-in URL** into each tester's invite file.

### A3. App content (the one-time gates) — Policy → App content

Field by field (names as of this drafting; the form shifts — verify at
entry):

| Form section                | Answer                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Privacy policy**          | `https://mirror-house.seolith.com/privacy.html` (Task 3 — live once the branch merges)                                                                       |
| **Ads**                     | **No, my app doesn't contain ads** (the build carries no ad SDKs)                                                                                            |
| **Advertising ID**          | **No, the app doesn't use an advertising ID** (nothing in the build generates or reads one — `package.json` ships no ad/ads-tracking dependency; trace: PRIVACY.md "no beacon, no fingerprint, no 'phone home'") |
| **App access**              | **All functionality is available without restrictions** — no login, no gated features, no special access credentials **(verify at entry)**                   |
| **Content rating**          | **IARC questionnaire** — category Game; answer the questions exactly as drafted in [STORE-LISTING.md §Content rating (IARC)](STORE-LISTING.md); contact email `itsupport01@seolith.com`. **Expected outcome E / PEGI 3** (a fear answer can land E10+/PEGI 7 instead — the questionnaire decides, and its result is final; record whatever it returns) |
| **Target audience**         | **13+** (select the oldest bracket 18 and under to **exclude** under-13, i.e. every bracket from 13 up) — a deliberate, honest choice: the game is not directed at children, which keeps it outside Families-policy obligations. **"Is your app directed to children?" → No** |
| **News app**                | **No**                                                                                                                                                        |
| **COVID-19 apps**           | **No**                                                                                                                                                        |
| **Government app**          | **No**                                                                                                                                                        |
| **Financial features**      | none — check nothing (no lending, banking, wallet, gambling) **(verify at entry)**                                                                            |
| **Data safety**             | field-by-field below                                                                                                                                          |

**Data safety, field by field** — the truth table is
[STORE-LISTING.md §Play Data safety (2026-11-20 truth)](STORE-LISTING.md);
enter it exactly:

1. "Does your app collect or share any of the required user data types?" →
   **Yes** (the 📮 SEND flow is user-initiated off-device transmission).
2. Data type **Photos and videos → Photos**: Collected **Yes** (user-initiated,
   feedback only) · Shared **No** · Purpose **App functionality (player
   feedback)** · Ephemeral **No** (stored privately, deletable on request).
3. Data type **Other user-generated content → Text**: same four columns.
4. Every other data type: **Not collected** (leave unchecked).
5. Security: "Is data collected by this app encrypted in transit?" → **Yes**
   · "Do you provide a way for users to request data deletion?" → **Yes**
   (requests via `itsupport01@seolith.com` reach the bucket's only operator).
6. Submission question: "Does your app collect or share any of the required
   user data types" appears once per type — answer from the table only; do
   **not** add tracking/location/ID types that the app does not have.

### A4. Main store listing (Grow → Main store listing)

| Field                        | Value / asset                                                              |
| ---------------------------- | -------------------------------------------------------------------------- |
| App name (30)                | `Mirror House`                                                             |
| Short description (80)       | the en line (75 chars) from [STORE-LISTING.md](STORE-LISTING.md)           |
| Full description (4000)      | the en block from [STORE-LISTING.md](STORE-LISTING.md)                     |
| **App icon** (512², 32-bit PNG w/ alpha) | `store-assets/icon-512.png`                                    |
| **Feature graphic** (1024×500, no alpha) | `store-assets/feature-graphic-1024x500.png`                    |
| **Phone screenshots** (9:16) | `store-assets/screenshots/play/play-01-start.png`, `play-02-maze.png`, `play-03-pause.png` (1080×1920) — the real-emulator set preferred; the Playwright interim set is acceptable |
| Contact website              | `https://mirror-house.seolith.com`                                          |
| Contact email                | `itsupport01@seolith.com`                                                   |
| Contact phone                | optional — leave empty                                                       |

Per-image captions (Play allows one per screenshot): use the en captions in
[STORE-LISTING.md §Screenshots](STORE-LISTING.md).

### A5. Countries, then roll out

- **Internal testing has no country gate** — rollout to the track is enough.
- When promoting to **Production** (later): Production → **Countries/regions**
  → add countries deliberately (each is a tax/compliance commitment) → then
  the production review.

### A6. Review-latency reality (honest, no guarantees)

- **Internal testing**: rollout is effectively instant — new testers play
  within **minutes to hours** of the release.
- **Production from a NEW personal account**: Google's published requirement
  is a closed test with at least **20 testers for 14 continuous days** before
  the production-access application, then a review that can take **days**.
  The five-tester internal run does not satisfy this — plan the invites
  list accordingly **(verify the exact current bar in the console — it
  applies to personal accounts created after Nov 2023)**.
- Established-account production review: typically **hours to days**.

---

## Part B — App Store Connect

### B0. HUMAN GATE — Apple Developer Program + a Mac (first, blocking)

1. **$99/year Apple Developer Program** enrollment (developer.apple.com).
2. A **Mac** — Xcode only runs there. Then the
   [BUILD-STORES.md](BUILD-STORES.md) runbook, verbatim:
   `npm i -D @capacitor/ios && npx cap add ios` → open Xcode → set the
   **signing team** → test on a real device → **Product → Archive** → upload
   (**Xcode Organizer** or the standalone **Transporter** app).
3. Xcode pins the version pair: `CFBundleShortVersionString` = `0.2.0-beta.4`,
   `CFBundleVersion` (build number) = `4` — matching the Android pair; bump
   the build number on every re-upload.

Nothing in §B1–B6 exists until a build lands in App Store Connect.

### B1. Create the app record

App Store Connect → **Apps** → **+** → **New App** **(field names as of this
drafting — verify at entry)**:

| Field                | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| Platform             | **iOS**                                                       |
| Name (30)            | `Mirror House`                                                |
| Primary language     | **English (U.S.)**                                            |
| Bundle ID            | `com.amtocsoft.mirrorhouse` (registered by Xcode at §B0)      |
| SKU                  | `mirrorhouse` (internal only — never shown)                   |

### B2. TestFlight — internal testing

- **TestFlight → Internal testing**: up to **100 App Store Connect users**
  (anyone with a role on the team in App Store Connect); each tester gets the
  build through the TestFlight app; **no beta review** for internal builds;
  builds expire after 90 days.
- **What to Test**: one line from [CHANGELOG.md](../CHANGELOG.md).

### B3. Metadata

On the version page + **App Information** **(verify at entry)**:

| Field                       | Value / source                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Subtitle (30)               | `A 100-floor mirror-maze escape` (exactly 30 — drafted here; STORE-LISTING carries no subtitle line) |
| Description                 | the en block from [STORE-LISTING.md](STORE-LISTING.md)                                              |
| **Keywords** (100)          | the 86-char line from [STORE-LISTING.md](STORE-LISTING.md)                                          |
| **Support URL**             | `https://mirror-house.seolith.com`                                                                  |
| **Marketing URL**           | `https://mirror-house.seolith.com` (same)                                                           |
| **Privacy policy URL**      | `https://mirror-house.seolith.com/privacy.html` (Task 3)                                            |
| Copyright                   | `© 2026 amtocsoft` **(verify at entry)**                                                            |
| Category                    | Games → **Puzzle** (secondary: Adventure) — STORE-LISTING §Identity                                 |
| Release notes ("What's New") | one line from [CHANGELOG.md](../CHANGELOG.md)                                                      |
| **Pricing and Availability** | **Free**; availability: decide deliberately (start with the same countries as Play)                 |

### B4. Age rating

The **age rating questionnaire** (age-category band 4+/9+ expected — the
questionnaire decides): answer from the same drafted truth as IARC —
[STORE-LISTING.md §Content rating (IARC)](STORE-LISTING.md): fantasy violence
only (no injury/blood/gore/weapons), mild fear (dark palace, a following
shadow), no profanity/sexual content/gambling/drugs, no user-generated
content or chat, fully offline single-player. Expected band **4+ (US) / 9+
(Mexico-style older-age descriptors may apply if the fear answers weigh
heavier)** — record whatever the questionnaire returns.

### B5. App Privacy (the nutrition labels)

**App Privacy → Start** — from
[STORE-LISTING.md §App Store privacy nutrition labels](STORE-LISTING.md),
which traces each row to PRIVACY.md:

1. "Do you use this app's data for tracking?" / "Is this data used for
   tracking?" → **No** for every type — **Data Used to Track You: None**.
2. **Data Linked to You: None** — no identity exists to link.
3. **Data Not Linked to You**: **User Content** — the feedback note text and
   one screenshot, purpose **App Functionality**, collected only when the
   player presses SEND (Apple's type-picker names drift; "User Content" /
   "Other User Content" as of this drafting — verify at entry).

### B6. Export compliance

**Export compliance** (version page, or the wizard after the first upload)
**(verify at entry)**: the app **uses standard encryption only** (HTTPS to its
own origin — no proprietary/custom crypto) → answer **"standard encryption
only"** → **exempt** from the annual self-classification report. If France's
declaration is prompted, answer it as prompted. (If Xcode asks at archive
time, `ITSAppUsesNonExemptEncryption = NO` in Info.plist is the standing
declaration — one rider for the BUILD-STORES.md runbook.)

### B7. Screenshots, build, submit

1. **Screenshots**: the 6.7" slot takes
   `store-assets/screenshots/ios/ios-67-1290x2796-*.png` (1290×2796), the
   6.1" slot takes `ios-61-1170x2532-*.png` (1170×2532). **These are the
   documented interim emulation captures**
   ([store-assets/screenshots/ios/README.md](../store-assets/screenshots/ios/README.md))
   — refresh both sets from TestFlight builds on real devices **before App
   Review** (the Mac run's screenshot step).
2. **Build**: select the uploaded build (§B0) on the version page; TestFlight
   processes first.
3. **Submit for Review** → App Review.

### B8. Review-latency reality (honest, no guarantees)

- **TestFlight internal testing**: available to the team as soon as the build
  finishes processing — effectively **immediate**, no review.
- **External TestFlight testing** (public beta testers): a **Beta App Review**
  that Apple's published norm puts at **about 1–2 days**.
- **App Store review**: Apple's published norm is **days** (most apps within
  ~24–48 h; the median has historically been under 24 h — no guarantee).

---

*Both sections share one rule: if the console's live form disagrees with this
doc, the form wins the naming and PRIVACY.md wins the truth — update this doc
the same day.*
