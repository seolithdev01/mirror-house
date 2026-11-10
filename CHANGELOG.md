# Changelog

One line per milestone — the full step-by-step record (every request and
response) lives under [docs/prompts-history/](docs/prompts-history/README.md),
and the arc from first brief to blueprint is
[the design doc](docs/superpowers/specs/2026-11-08-mirror-house-design.md).
Versions follow the store line: `0.1.0` carried everything through M5,
`0.2.0-beta.1` is the public beta.

## [t3] — 2026-11-10 — the Reflecting Gardens (Tier 3, floors 21–30)

The campaign deepens to thirty — a garden tier where the water watches.

- **Floors 21–30** — the Reflecting Gardens: a tier-3 ramp (six Echoes on
  every floor, four beacons, braids to 0.272 by floor 29, Chhaya 4.2 s behind
  tightening to 3.7 s), the `L24 · T3` floor chip, and **Dwaar III** at floor 30 — the
  garden hall, the most open threshold yet (107 open cells: dotted hedge
  runs, never a solid wall, two 11-cell sightlines for the water's long
  view). Dwaar II's clear now takes Dwaar I's interstitial banner (Act II
  continues into the Gardens); the full tier screen is Dwaar III's —
  `✦ Truth-Shard III claimed — Tier III complete`. The save validator
  widened to 30 in the same commit as the ramp (the binding T2 lesson).
- **Gher the Encircler** — the third Sentinel, and he does not sense at all:
  pure prediction. He reads your commit against the road ahead and glides at
  one steady 1.9 m/s to seal the corridor ~3 cells ahead of you (a 1 s
  retarget tick). The counter is the **feint** — break the commit and his
  prediction dies while he holds. The ladder **accumulates** (spec §4.4):
  Taal stays — his spawn gate widened to every floor from 11 — so both
  Sentinels walk the Gardens; both now always spawn at the patrol anchor
  farthest from you (the fairness fix that killed a caught-at-spawn seed).
- **Water-mirrors** — 2–4 still pools a floor, Echo eyes you cannot fog:
  walk within arm's reach to ripple one blind for ten seconds (its overhead
  dot dims; the water stills again on its own). The ripple is derived TTL
  data (a look-alike, not a state machine); the pools consume into the echo
  senses and the map, and never touch the tier-1/2 rng streams.
- **Gardens dressing** — the green/water-teal/ivory palette, the pastoral
  pentatonic scale `[0,2,5,7,9]`, and the melody voice switching to sine —
  the flute leads tier 3 from its first note (venue floors reset to the
  tier-one scale AND voice). New tester hook fields: `gherPos()`,
  `mirrors().water`, `audioState().scale`/`.voice`.
- **Close-out** — §4.6 row 3 and the §4.4 ladder annotated delivered in the
  spec; README gains the Tier 3 section; the FAQ grows to 33 (the Gardens,
  Gher's feint — the water entry landed with the pools); STATE_MACHINES'
  Campaign section refreshed for 30 floors and the accumulating Sentinels.
  487 unit + 34 e2e green.

## [t2] — 2026-11-10 — the Hall of Ancestors (Tier 2, floors 11–20)

The first post-beta content milestone — the campaign doubles downward.

- **Floors 11–20** — the Hall of Ancestors: a tier-2 ramp (echoes 5–6,
  beacons 4 a floor, tighter braids, Chhaya 4.5 s behind tightening to 4.1),
  the `L14 · T2` floor chip, and Dwaar II at floor 20 — a second
  hand-authored 13×13 threshold hall, broader than Dwaar I (96 open cells)
  because the Sentinel needs room to walk his beat.
- **Taal promoted to Sentinel** — from floor 11 through Dwaar II he walks
  every tier-2 floor and his touch **catches** (the floor-5 cameo stays
  anger-only); `taalOutcome` pins that boundary in one pure place. He surges
  on the 2-second beat and crawls between — cross on the dim beat.
- **Ancestor portraits** — 2–3 dim procedural silhouettes wall-mounted on
  every tier-2 floor; mirrors like any other, fogged like any glass.
- **Tier-2 art + music** — the amber/brown/deep-teal palette (void haze and
  walking lantern re-dress per floor), and the melody walker finally plays
  the Durga pentatonic (`setScale`, live at every floor build; venue
  side-floors stay tier-one dressed).
- **Truth-Shard I interstitial** — Dwaar I's clear now celebrates with a 1.8 s
  auto-dismiss banner (`✦ Truth-Shard I claimed — the house deepens…`, en+hi)
  and the descent continues into the Hall; floor 20 keeps the full
  tier-complete screen.
- **Close-out** — §4.6 row 2 and §13.1 annotated delivered in the spec; the
  full 2h desktop soak closed **PASSED 2026-11-10: 2181 cycles, 0 crashes,
  heap stable post-warmup (14.5MB flat final hour)**; README gains the Tier 2
  section; the FAQ grows to 30 (the Hall, crossing Taal, the portraits);
  STATE_MACHINES' Campaign section refreshed for 20 floors. 415 unit + 32
  e2e green.

## [0.2.0-beta.1] — 2026-11-09 — the beta (M6)

- **Venue side-floors** — local ventures can host a themed floor of the game:
  a strict, fully validated JSON pack (name, tagline in en+hi, two accent
  colours, maze shape) builds an isolated side-floor that never touches the
  campaign, shards, or bests; ships with the ☕ Glasshouse Café demo pack,
  reachable via ⚙ → Floors or `?venue=`.
- **Store builds** — Capacitor wraps the same web bundle for Android
  (`com.amtocsoft.mirrorhouse`, `versionName 0.2.0-beta.1`), with the
  build/sign/runbook in [docs/BUILD-STORES.md](docs/BUILD-STORES.md) and the
  ready-to-paste listing copy in [docs/STORE-LISTING.md](docs/STORE-LISTING.md).
  The debug APK builds green from a clean tree (4.08 MiB, manifest
  `aapt`-verified; unsigned release APK proven too) — Play submission waits
  on the store account.
- **Launch kit** — beta announcement drafts (en+hi), the venue-pilot pitch and
  pack checklist, and the launch-day checklist:
  [docs/LAUNCH.md](docs/LAUNCH.md). This changelog. Version bumped to
  `0.2.0-beta.1`.
- **Service worker turned** — cache `mh-v5`, and the demo venue pack rides the
  precache (with `/venues/*` served cache-first), so the shipped side-floor
  works offline with the shell.
- **Carried minors** — Escape closes only the topmost of stacked dialogs (one
  layer per press); the arrow alternates stand down while ⚙ is open (its
  radios own Arrow* — the player stops moving); Aaina refuses hint sales on
  venue floors ("Return to your campaign to ask Aaina", en+hi); FAQ gains the
  sponsored-floor entry (25 questions).

### step007 — the tester & feedback kit (2026-11-09)

- **About ⓘ + launch meta** — the About panel (the small ⓘ beside 🌐, or
  ⚙ → About: version, pitch, beta status, credits, the four launch links) and
  the share-card meta tags (description, og/twitter, `/og-image.png`) so link
  previews stop guessing.
- **📮 Feedback & suggestions** — the in-game composer (top right): pick
  🐞 Bug / 💡 Suggestion / 💙 a kind word, and the message comes pre-carried
  with a read-only diagnostics block — version, seed (`BASE:floor`), preset,
  language, accessibility flags, a remap _count_ (never the bindings), venue,
  user agent, the last runtime errors. Nothing is sent until you press a
  button: it opens a prefilled GitHub issue (bug/suggestion/playtest
  templates live in the repo) or a mailto — you see the exact text first.
- **Tester mode `?test=1`** — session-only, never persisted, and live on the
  deployed site: unlocks the diagnostics hook (the dev gate became "dev OR
  tester" — one gate, three doors: dev, testers, soak) and shows the TESTER
  chip (`TESTER · {fps} · {seed}`) plus a one-time banner; `?test=0` resets.
- **The kit** — the tester guide with the 5-minute smoke
  ([docs/TESTERS.md](docs/TESTERS.md)), the 31-case manual suite
  ([docs/TEST-CASES.md](docs/TEST-CASES.md)), every URL parameter documented
  ([docs/URL-PARAMS.md](docs/URL-PARAMS.md)), and personalized tester invites
  (git-ignored; only the redacted
  [template](docs/invites/TEMPLATE.example.md) is committed). 366 unit +
  30 e2e green.

## [0.1.0] — 2026-11-08/09 — the road to beta (M0–M5)

- **m0 — scaffold.** Vite+TS scaffold with eslint/prettier/vitest, CI
  (lint/type/test/build/e2e), Cloudflare Pages deploy, CSP headers.
- **m1 — the first floor.** Deterministic seeded maze generation (xmur3 +
  mulberry32, backtracker with braiding and rooms), Wolf3D-lineage movement
  (strafe-run, wall clamp+slide), the FOCUS first-person view on a fixed-step
  loop, seed share codes, and the Playwright smoke suite.
- **step003 — the house gets dressed.** Tier-one art direction (palette,
  procedural floor/wall textures), the configurable surveyor avatar with real
  planar-RT self-reflection at hero mirrors, three complete input modes
  (keyboard-only, mouse-only, hybrid), and the meta layer: floor timer, local
  bests, daily seed, streak.
- **m2 — the glass wakes.** The Frost Lantern (fog mirrors to blind them),
  Echoes hunting through clear glass, Chhaya replaying your exact path, house
  anger from sprint-cracked mirrors, beacon-gated exits, and the shard
  economy's pending/banked split.
- **step004/005 — explicit state machines.** Every lifecycle rebuilt as a
  discriminated-union machine with pure transitions (the GamePhase master,
  mirror frost, doors), mapped in
  [docs/STATE_MACHINES.md](docs/STATE_MACHINES.md).
- **m3 — views, voice, music.** Quad (four live panes) and the Overhead map
  with fog-of-war, radar pings and the tactical waypoint pause; Aaina's
  diegetic panel with the shard-priced hint economy and lore unlocks;
  procedural raga-inspired audio that follows the house's temper.
- **m4 — the descent.** The ten-floor campaign spine (Stair Door, ramp,
  Taal's beat-walker cameo, the hand-authored Dwaar and Truth-Shard I),
  IndexedDB saves with strict validation + 💾 export / 📂 import, the PWA
  (manifest, runtime-cache service worker, offline play), and the en/hi
  bilingual HUD.
- **m5 — hardening.** The ⚙ settings overlay with full key remapping
  (conflict-guarded), reduced-flash, captions for sound cues and text scale;
  auto/manual quality presets; a11y aria + real dialog semantics (Lighthouse
  97/97); privacy, provenance and playtest docs; round-trip, timing and soak
  tests.
