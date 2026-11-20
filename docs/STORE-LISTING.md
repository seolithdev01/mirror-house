# Store listing kit — Mirror House

Ready-to-paste listing copy and drafted form answers for Google Play (and, when
a Mac build happens, App Store Connect — the copy is store-agnostic). The icon
PNGs live in [`store-assets/`](../store-assets/); upload mechanics are in
[`BUILD-STORES.md`](BUILD-STORES.md). The app itself sends nothing unless a
player explicitly presses SEND — see [PRIVACY.md](../PRIVACY.md), the
canonical source every form answer here traces to. The console walkthrough is
[`STORE-SUBMISSION.md`](STORE-SUBMISSION.md).

## Identity

| Field                 | Value                                                               |
| --------------------- | ------------------------------------------------------------------- |
| App name (en)         | Mirror House                                                        |
| App name (hi)         | आईना घर                                                             |
| App ID                | `com.amtocsoft.mirrorhouse`                                         |
| Category (Play)       | **Game** — tags: **Puzzle**, **Adventure**, Casual                  |
| Category (App Store)  | Games → **Puzzle** (secondary: Adventure)                           |
| Price                 | Free · no ads · no in-app purchases                                 |
| Privacy policy URL    | <https://mirror-house.seolith.com/privacy.html>                     |
| Privacy policy mirror | <https://github.com/seolithdev01/mirror-house/blob/main/PRIVACY.md> |
| Contact email         | `itsupport01@seolith.com` (`SUPPORT_EMAIL`, `src/game/feedback.ts` — the 📮 composer's mailto exit; use it for Play Console contact + data-deletion requests) |

## Short description (≤ 80 chars)

- **en** (75): `Descend a palace of mirrors: frost the beacons, outrun your shadow, escape.`
- **hi** (75): `आईना घर — शीशे के महल की भूलभुलैया। बीकन आईने बर्फ़ करो, छाया से बचकर उतरो।`

## Full description

### English

Mirror House is a 100-floor, first-person mirror-maze escape. You descend a
century-old palace of glass where reflections deceive you — and the things
hunting you. Every floor is one loop: frost every beacon mirror with your
lantern's breath, then reach the gold stair door before the glass catches you.

**The descent.** Ten floors per tier, each deeper floor braiding the maze
tighter and shortening the leash of Chhaya — the shadow that walks your exact
path behind you. Never retrace your steps; you will meet yourself. Floor 10 is
the Dwaar, a hand-carved threshold labyrinth, and the ✦ Truth-Shard waiting
past it.

**The frost is your only defence.** Fog a mirror and its reflection dies —
Echoes see you only through clear glass, so a fogged pane is a door closed in
their face. Each breath spends a third of your lantern's air.

**Three ways to walk, four ways to see.** Play keyboard-only, mouse-only
(one-handed), or hybrid. Cycle Focus (first person), Quad (all four walls at
once), and the Overhead map — a walking 2D map of what you have explored — and
pause tactically to draw waypoints on it. The map views are first-class play:
low-vision players run whole floors from Overhead.

**Built for everyone it hunts.** Remap all 15 keys. Reduce flashing. Captions
for sound cues. Text at 100/125/150%. The whole house also speaks हिंदी —
flip the language any time.

No account. No ads. No tracking — your save never leaves your device. Plays
fully offline. Floors are sharable by seed. Free and open source.

### हिंदी

आईना घर — सौ मंज़िलों की पहले-व्यक्ति आईना-भूलभुलैया। आप शीशे के एक सौ साल
पुराने महल में उतरते हैं, जहाँ परछाइयाँ आपको धोखा देती हैं — और पीछा करती हैं।
हर मंज़िल एक ही लूप है: अपनी लालटेन की साँस से हर बीकन आईने को बर्फ़ करो, फिर
सुनहरे सीढ़ी-दरवाज़े तक पहुँचो — शीशे के आपको पकड़ने से पहले।

**उतराई।** हर पायदान में दस मंज़िलें। जितनी गहराई, उतनी कसी भूलभुलैया — और उतनी
छोटी छाया (च्हाया) की रस्सी, जो आपके रास्ते पर सात सेकंड पीछे चलती है। अपने
कदमों पर लौटकर मत चलो — आप खुद से भिड़ जाओगे। दसवीं मंज़िल द्वार है: 13×13 की हाथ
से बुनी भूलभुलैया, और उसके पार ✦ सत्य-शार्ड।

**बर्फ़ ही आपका एकमात्र बचाव है।** एक आईना को कोहरा दो — उसका प्रतिबिंब मर
जाता है। प्रतिध्वनियाँ (एकोज़) आपको साफ़ शीशे से ही देखती हैं। हर साँस
लालटेन की एक-तिहाई हवा खर्च करती है।

**चलने के तीन तरीके, देखने के चार।** सिर्फ़ कीबोर्ड, सिर्फ़ माउस (एक हाथ
से), या दोनों। फ़ोकस (पहला व्यक्ति), क्वॉड (एक साथ चार दीवारें), और ओवरहेड
नक़्शा — जो आपने छुआ है बस वही दिखाता है — और रुककर रणनीति के वेपॉइंट बनाओ।

**सबके लिए।** सभी 15 कुंजियाँ बदलें। चमक घटाएँ। ध्वनि-संकेतों के कैप्शन।
टेक्स्ट 100/125/150%। खेल अंग्रेज़ी और हिंदी दोनों में है।

कोई खाता नहीं। कोई विज्ञापन नहीं। कोई ट्रैकिंग नहीं — आपकी सेव आपके डिवाइस
से बाहर नहीं जाती। पूरी तरह ऑफ़लाइन। सीड से मंज़िलें साझा करें। निःशुल्क।

## Keywords / tags

- **Play tags** (pick up to 5, as offered): `Puzzle`, `Adventure`, `Casual`,
  `Brain Games`, `Single player`.
- **App Store keywords** (100-char field, 86 used):
  `mirror,maze,puzzle,escape,labyrinth,first person,shadow,frost,glass,offline,free,hindi`

## Screenshots — shipped set + manifest

Play takes 2–8 phone screenshots per device (JPEG or 24-bit PNG, no alpha,
9:16 portrait); App Store Connect requires the 6.7" set (1290×2796) **and**
the 6.1" set (1170×2532). The game is responsive, so a device render is the
honest capture. Two tiers, by authority:

**Tier 1 — real-device renders (the upload set, landed 2026-11-20).** The
Android-emulator smoke captured three scenes from the signed release build
(`medium_phone_gapi`, API 35); `scripts/crop-emulator-shots.mjs` trimmed the
status bar + gesture area and emitted 1080×1920 JPEG (no alpha) —
**superseding** the interim set below (the walkthrough is
[`STORE-SUBMISSION.md`](STORE-SUBMISSION.md)).

**Tier 2 — the shipped interim set** (generated 2026-11-20 by
`node scripts/gen-store-shots.mjs` against a PROD build via Playwright device
emulation, `?test=1`; kept as the regen path). Every file is an exact-size
PNG, header-asserted by the script. The iOS pair is emulation-only until a
Mac refreshes it from TestFlight builds (see
[`store-assets/screenshots/ios/README.md`](../store-assets/screenshots/ios/README.md)).

| File (`store-assets/`)                    | Size           | Scene                                        | Caption (en)                              | Caption (hi)                      |
| ----------------------------------------- | -------------- | -------------------------------------------- | ----------------------------------------- | --------------------------------- |
| `screenshots/play/emulator-01-maze.jpg`   | 1080×1920      | Focus corridor — compact HUD, touch stick, dock | _Frost the beacons, outrun your shadow_ | _बीकन बर्फ़ करो, छाया से आगे निकलो_ |
| `screenshots/play/emulator-02-map.jpg`    | 1080×1920      | Pac-minimap open (gold arrow, teal beacons, live Sentinel dots) | _The whole floor, one glance_ | _पूरा फ़्लोर, एक नज़र में_           |
| `screenshots/play/emulator-03-feedback-sent.jpg` | 1080×1920 | the 📮 composer after a real SEND (screenshot + note + diagnostics) | _Found something? Tell the architects_ | _कुछ मिला? वास्तुकारों को बताओ_      |
| `screenshots/play/play-01-start.png`      | 1080×1920      | (Tier 2) the front door — BEGIN THE DESCENT plated    | _One door in. A hundred floors down._     | _एक द्वार। सौ मंज़िलें नीचे।_          |
| `screenshots/play/play-02-maze.png`       | 1080×1920      | (Tier 2) Focus gameplay, minimap open | _Frost the beacons, outrun your shadow_ | _बीकन बर्फ़ करो, छाया से आगे निकलो_ |
| `screenshots/play/play-03-pause.png`      | 1080×1920      | (Tier 2) the PAUSED plate mid-run                     | _Pause, plan, then walk_                  | _रुको, सोचो, फिर चलो_                |
| `screenshots/ios/ios-67-1290x2796-*.png`  | 1290×2796 (×3) | same three scenes (App Store 6.7" slot)      | (same captions)                           | (same)                            |
| `screenshots/ios/ios-61-1170x2532-*.png`  | 1170×2532 (×3) | same three scenes (App Store 6.1" slot)      | (same captions)                           | (same)                            |

Production-refresh menu — the fuller scene list for the real-device pass
(captions carry over):

- **FOCUS + reflection** — a beacon mirror and its (deceptive) reflection in
  frame. _The house reflects what hunts you_ · घर उसे दिखाता है जो आपका शिकार करता है
- **QUAD** — the four-pane view mid-floor. _All four walls at once — Quad
  view_ · एक साथ चार दीवारें — क्वॉड दृश्य
- **OVERHEAD + tactical** — the explored-only 2D map with ivory waypoints.
  _Plan the route, then walk it_ · रास्ता बनाओ, फिर चलो
- **Dwaar** — floor 10's threshold hall (`L10 · DWAAR I ✦` chip visible).
  _Floor 10: the Dwaar waits_ · मंज़िल 10: द्वार इंतज़ार कर रहा है
- **Settings + accessibility** — the ⚙ overlay on Access or Controls.
  _Remap every key. Calm every flash_ · हर कुंजी बदलें, हर चमक शांत करें
- **Hindi UI** — HUD in Hindi (🌐 toggle). _The whole house speaks हिंदी_ ·
  पूरा घर हिंदी में बोलता है

Feature graphic (1024×500) is generated — `node scripts/gen-store-art.mjs`
(recipe, copy and the review note in
[`store-assets/README.md`](../store-assets/README.md)).

## Content rating (IARC) — drafted answers

Answer honestly; the questionnaire decides the mark. Expected outcome — the
lowest band if the fear answer lands mild, one step up if it weighs the horror
atmosphere: **ESRB E or E10+ / PEGI 3 or 7** (USK 6, ACB PG sit in the same
band). The working expectation carried into
[`STORE-SUBMISSION.md`](STORE-SUBMISSION.md) is **E / PEGI 3** — whatever the
questionnaire returns is final; record it here.

| Question                                        | Drafted answer                                                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Violence present?                               | **Yes — fantasy violence only**                                                                                                                                                              |
| Violence is realistic?                          | No                                                                                                                                                                                           |
| Nature of fantasy violence                      | Mirrors crack and shatter into glass shards (no injury); a shadow entity (Chhaya) catches the player; a lantern-walker bumps the player. **No blood, no gore, no weapons, no injury detail** |
| Violence rewarded / players encouraged to harm? | No — frost-breath is defence/puzzle-solving, not harm                                                                                                                                        |
| Fear / horror atmosphere                        | Mild: dark palace, a shadow follows the player; no graphic or gruesome imagery                                                                                                               |
| Profanity / crude humour                        | No                                                                                                                                                                                           |
| Sexual content / nudity                         | No                                                                                                                                                                                           |
| Drugs, alcohol, tobacco                         | No                                                                                                                                                                                           |
| Simulated or real gambling                      | No                                                                                                                                                                                           |
| User-generated content, chat, multiplayer       | No — fully offline, single-player                                                                                                                                                            |

Adjacent Play "App content" answers: **Ads — none** (the build has no ad SDKs);
**In-app purchases — none**; **Target audience — 13+**, not directed at
children, not a "Made for kids" app; not a News/Financial/Health/Government
app.

## Play Data safety (2026-11-20 truth)

Canonical source: [PRIVACY.md](../PRIVACY.md) — every answer below traces to
it (row-by-row in the traceability table). Console form wording drifts over
time; the form/field names here are as of this drafting — **verify against the
live form at entry**.

**Security question first** (the form asks it up front):

- "Does your app collect or share any of the required user data types?" —
  **Yes**. The honest answer, not the flattering one: pressing **SEND** in the
  📮 composer transmits user content off-device (PRIVACY.md §Feedback).
  Everything else in the app stays on the device.
- "Is all of the user data collected by your app encrypted in transit?" —
  **Yes** (HTTPS only — the POST goes to the project's own HTTPS origin; the
  CSP's `connect-src 'self'` leaves no other network door).
- "Do you provide a way for users to request that their data is deleted?" —
  **Yes** — on request via the support email
  (`itsupport01@seolith.com`, the 📮 composer's email exit); the request
  reaches the feedback bucket's only operator, who deletes the report(s).

**Per-type rows** (every other data type stays **Not collected**):

| Form row (category → type)            | Collected                              | Shared | Purpose                                  | Ephemeral                            |
| ------------------------------------- | -------------------------------------- | ------ | ---------------------------------------- | ------------------------------------ |
| Photos and videos → **Photos**        | Yes — user-initiated (feedback only)¹  | No     | App functionality (player feedback)      | No — stored privately, deletable on request |
| Other user-generated content → **Text** | Yes — user-initiated (feedback only)¹ | No     | App functionality (player feedback)      | No — stored privately, deletable on request |

¹ Collected **only** when the player explicitly presses SEND; nothing
auto-sends (PRIVACY.md: "The GitHub-issue and email buttons are always there
instead — nothing auto-sends"). **Data shared with third parties: none.**

**Row-by-row traceability** (each answer → the PRIVACY.md sentence it comes
from):

| Answer                         | Traces to PRIVACY.md                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Photos — collected, user-initiated | §Feedback: "one screenshot (the moment you opened the form — previewed in the form itself)", shipped "only when you press SEND" |
| Text — collected, user-initiated   | §Feedback: "your note (the exact text you see and can edit)"                                                          |
| Not shared (both rows)         | §"No accounts, no cookies, no telemetry": "The Content-Security-Policy … allows no third party at all"; §CSP: the only writable door is this origin's own |
| Ephemeral: No                  | §Feedback: reports land in the **private** `mirror-house-feedback` R2 bucket; "reports leave the bucket only when the maintainer reads or deletes them from their own terminal" |
| Encrypted in transit: Yes      | §Feedback: the SEND POST goes to "this site's own `/api/feedback`" over the site's HTTPS; no other connection is possible (CSP `connect-src 'self'`) |
| Data deletion: on request      | §Feedback (maintainer deletes from the bucket) + the support email in the 📮 composer (`itsupport01@seolith.com`)      |

Kept-true bullets (unchanged by T15 — they describe everything **around** the
SEND moment):

- **No ads, no analytics, no telemetry, no crash SDKs, no accounts.**
- **The save is device-local** — one IndexedDB record (`mirror-house`/`save`/`main`);
  uninstalling or clearing app data deletes it completely and unrecoverably.
- The only declared permission is `INTERNET` (a WebView system requirement);
  the app's only self-initiated network call is the SEND POST — from the store
  WebView, to the project's own production origin
  (`https://mirror-house.seolith.com/api/feedback`, `src/game/feedbackNet.ts`),
  schema-validated and rate-limited server-side (4 reports/hour/IP).

## App Store privacy nutrition labels

Drafted from the same PRIVACY.md truth; Apple's type-picker names drift —
**verify at entry** ("User Content" family, as of this drafting).

| Label                   | Answer                                                                                     | Traces to PRIVACY.md                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Data Used to Track You  | **None**                                                                                    | No tracking tokens exist: "no beacon, no fingerprint, no 'phone home'"; CSP allows no third party |
| Data Linked to You      | **None**                                                                                    | No identity exists to link — "no name, email, device identifiers, or tracking tokens, because none are ever collected" (§The export file) |
| Data Not Linked to You  | **User Content** — feedback note text + one screenshot; purpose: App Functionality          | §Feedback: note + screenshot ship in one POST, only on SEND                  |
