<!-- SPDX-License-Identifier: Apache-2.0 -->

# Use-Case Catalog — grounded in the shipped build (`t10`, v0.2.0-beta.1)

Every use case below is anchored to the module that implements it. Planned-but-unshipped
work lives in the last section and is labeled as such. The normative state registry is
[STATE_MACHINES.md](STATE_MACHINES.md); the end-to-end journeys are in
[WORKFLOWS.md](WORKFLOWS.md); the animated rendering of both is
[atlas.html](atlas.html).

**Actors:** Player (human, device-local), Tester (Player + `?test=1` diagnostics),
The House (the game itself — Sentinels, Echoes, decoys, water, heat), Venue (sponsored
pack author), Developer (repo maintainer).

---

## A. Session & boot

| ID | Use case | Flow (main path) | Anchor |
|----|----------|------------------|--------|
| UC-01 | First run | Player opens the site → no stored save → `defaultSave()` → random campaign seed → floor 1 builds, tier-1 dressing | `main.ts` boot · `save.ts:idbGet→defaultSave` |
| UC-02 | Returning run | Player re-opens → `idbGet()` → `normalizeSave` → resume at saved campaign floor with look / mode / muted / lang / perf / a11y intact | `main.ts` boot · `save.ts:normalizeSave` |
| UC-03 | One-time v1 migration | Legacy `localStorage` meta v1 found and IDB empty → migrated to save v2; the old copy is left untouched | `save.ts:migrateFromMetaV1` |
| UC-04 | URL overrides | Player opens with `?seed=BASE` (campaign base), `?look=coat-glass`, `?lang=hi`, `?perf=low`, `?venue=demo…`, `?test=1` — each parameter overrides the save for the session (dev builds also honor `&floor=`) | `main.ts` boot · `seedCode.ts` |
| UC-05 | Install & go offline | Player installs the PWA / goes offline → service worker serves the precached shell + hashed assets; venue pack JSON precached | `public/sw.js` · `main.ts` SW registration |

## B. The floor loop (the spine)

| ID | Use case | Flow | Anchor |
|----|----------|------|--------|
| UC-06 | Move | WASD / arrows / touch in three input modes (keyboard-only, mouse-only, hybrid) — grid-walk with wall clamp + slide; sprint is loud (noise) and cracks glass underfoot | `player.ts:movePlayer` · `input.ts` |
| UC-07 | Change pace | sprint 6.0 / walk 3.5 / stand-still m/s — pace is the Tier-7 economy (Echoes hear) and the Aavart economy (he projects from speed) | `constants.ts` · `avart.ts:ambushCell` |
| UC-08 | Frost a standing / portrait / distort pane | F breath → eye closes (25 s; 12.5 s in heat; effectively permanent in the Atrium's cold) — removes that Echo eye and its confusion census vote | `frost.ts:applyFog` · `fogDurationMs` |
| UC-09 | Thaw a frozen pane (Tier 8) | F breath on iced glass → permanent live eye **+ lure**: wardens within 10 m walk to the pane and linger — you choose what they watch | `frost.ts` (frozen branch) · `THAW_LURE_RADIUS` |
| UC-10 | Capture a beacon | F breath on a beacon → captured (+5 shards pending); all beacons captured → the exit door unlocks | `frost.ts` · `houseState.ts` |
| UC-11 | Crack glass | Walking contact with glass cracks it (+15 anger; +25 in heat); anger 100 → the floor collapses | `houseState.ts:applyCrack` |
| UC-12 | Step through a True-Mirror pair | Space near the pair → teleport to its twin (the one teleport in the game that ignores clamp) | `passages.ts` |
| UC-13 | Push a silvered door | E near the door → slides open; secret glass, secret routes | `passages.ts` |
| UC-14 | Ripple a water pool (Tiers 3, 9) | Player adjacency ripples the pool → its eye closes 10 s (pools cannot be frosted) | `waterLevel.ts` · `echo.ts` |
| UC-15 | Stay silent (Tier 7) | Standing still emits nothing; sprinting rings 7 m every step, walking 4 m per 500 ms — hearing Echoes chase the sound | `noise.ts` · `echo.ts` |
| UC-16 | Use a decoy (Tier 5+) | The house plants a glass copy of you (max 2 alive); Echoes chase the nearer of you/copy; touch shatters it (+5 shards); from the Furnace down, Gher seals onto copies — farming is now a duel | `decoy.ts` · `gher.ts` |
| UC-17 | Evade a Sentinel | Chhaya replays your past path (never chase a corner you came from); Taal walks the beat (cross on the dim); Gher seals roads (feint); Aavart ambushes by pace (change pace); in the warrens — all four | `taal.ts` · `gher.ts` · `avart.ts` · `chhaya.ts` |
| UC-18 | Read the wardens' presence | The rotation decides who hunts per floor (Chhaya always; Taal 11–50 ∪ 66–70 ∪ 80–90; Gher 21–40 ∪ 50–60 ∪ 70 ∪ 81–90; Aavart 31–40 ∪ 50 ∪ 71–90; the Foundations: nobody) | `campaign.ts` presence fns |
| UC-19 | Fail & retry | Echo/Sentinel contact, or anger 100 → 1.2 s freeze → same-seed reset (attempts+1, pending shards forfeited, ice re-frozen, water drained) | `floorRun.ts:failRun/tickFail` · `main.ts:resetFloor` |
| UC-20 | Clear & descend | All beacons + reach the exit → descend overlay → next floor; Dwaar clears cascade shard interstitials; floor 100 clear → the Ground Door finale (terminal) | `main.ts` clear branch · `campaign.ts:descend` |
| UC-21 | Enter the Frozen Atrium economy | On 71–80 every standing pane arrives frozen: fog is meaningless until you thaw — the tier inverts the verb | `frost.ts:mirrorVisual` |

## C. Knowledge & aid

| ID | Use case | Flow | Anchor |
|----|----------|------|--------|
| UC-22 | Ask Aaina | ⓘ/Q adjacent panel with the in-game FAQ (diegetic) | `aaina.ts` · `faq.ts` |
| UC-23 | Buy a contextual hint | Hint tab → cost 5 + 5·hintsUsed shards → contextual kind (frozenNear / heatNear / whisperNear / gherNear / taalSentinel / beacons / exit / chase / anger / stuck) | `aaina.ts:nextHint/hintCost` |
| UC-24 | Unlock lore | Floors cleared 1/3/6 unlock 2/4/6 lore entries | `aaina.ts:loreUnlockedCount` |
| UC-25 | Read captions | Toggle captions → 13+ gameplay events render as an aria-live bar (en/hi) | `captions.ts` |

## D. Views & senses

| ID | Use case | Flow | Anchor |
|----|----------|------|--------|
| UC-26 | Cycle views | V → FOCUS → QUAD (four-view) → OVERHEAD; Esc from TACTICAL | `viewMode.ts` |
| UC-27 | Plan in TACTICAL | T in overhead → world pauses, click drops waypoints, Esc exits | `viewMode.ts:isTactical` · `overhead.ts` |
| UC-28 | Read the fog-of-war map | Overhead renders visited cells, wardens as pings, beacons, exit, decoy glyphs, water gauge | `overhead.ts:draw` |
| UC-29 | See through the lie (Tier 4) | Distorting panes displace your apparent position — map pings land where you *appear*; fog the pane to restore truth | `distort.ts:apparentPlayer` |

## E. Settings, a11y & audio

| ID | Use case | Flow | Anchor |
|----|----------|------|--------|
| UC-30 | Tune accessibility | ⚙ → text scale ×1/1.25/1.5, reduced-flash (static pulses), captions, remap — all persisted | `settings.ts` · `save.ts:a11y` |
| UC-31 | Remap keys | ⚙ → Controls → capture UI with conflict guard (refuses arrows/shifts/Esc/Tab, duplicate actions) | `input.ts:rebind/actionFor` |
| UC-32 | Auto quality | Perf preset auto/manual — FPS hysteresis drops pixel ratio and hero-RT on slow machines | `quality.ts:autoPreset` |
| UC-33 | Mute / hear the score | Audio starts on first gesture; M/🔊 toggles; tier scale + voice per tier (10 scales, 3 voices) | `audio/engine.ts` · `theory.ts` |
| UC-34 | Switch language | 🌐 cycles en/hi — full UI chrome parity (hints, overlays, chips, FAQ) | `i18n.ts` |

## F. Persistence

| ID | Use case | Flow | Anchor |
|----|----------|------|--------|
| UC-35 | Auto-save | Every mutating action persists through a 250 ms debounce; flush at clear/descend/tier/import/playAgain | `save.ts` · `main.ts:persist` |
| UC-36 | Export a save | 💾 → single JSON file download | `main.ts:exportSave` |
| UC-37 | Import a save | 📂 → strict `validateSave` → IDB put → reload (invalid files are refused, never executed) | `save.ts:validateSave` |
| UC-38 | Keep a streak | Clear on a calendar day → streak++ ; best time per floor-seed bucket kept | `meta.ts:nextStreak/recordRun` |

## G. Meta, community & launch

| ID | Use case | Flow | Anchor |
|----|----------|------|--------|
| UC-39 | Read About / FAQ | ⓘ About panel (version, credits, links); FAQ panel (40+ entries, en/hi) | `about.ts` · `faq.ts` |
| UC-40 | Send feedback | 📮 → Bug / Suggestion / Love → prefilled GitHub issue (or mailto) with the player-reviewed diagnostics block — nothing auto-sends | `feedback.ts:buildIssueUrl` |
| UC-41 | Play a venue floor | ⚙ → Floors → ☕ demo pack → campaign-isolated side-floor (pack dressing, no bests/shards banking) | `venue.ts` |
| UC-42 | Test with diagnostics | `?test=1` → hook + TESTER chip + banner in production builds (session-only) | `main.ts` test gate |
| UC-43 | Play the Daily | ★ → date-derived seed, one shared house per day | `meta.ts:dailySeed` |

## H. Planned (anchored, not shipped)

| ID | Use case | Status |
|----|----------|--------|
| UC-44 | iOS store build | Capacitor runbook written (`docs/BUILD-STORES.md`); requires a Mac + Apple Developer account. Android APK is proven (4.08 MiB debug). |
| UC-45 | Venue partner packs beyond the demo | System shipped; partner sign-off is a human gate (LAUNCH.md pitch template ready) |
| UC-46 | Act IV — someday is the copies' | Teased on the finale screen; no design yet |
| UC-47 | Composed soundtrack | CLA + provenance pipeline designed; procedural score ships |
| UC-48 | Playtest triage | INVITES SENT (aliases route to the owner's mailbox); reports land as labeled GitHub issues |

---

*Grounding commit: `t10` (v0.2.0-beta.1 line). If a UC and the code disagree, the code wins — file an issue.*
