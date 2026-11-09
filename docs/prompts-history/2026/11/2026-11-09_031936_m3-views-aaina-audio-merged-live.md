# M3 — views, Aaina, audio (merged, live)

| | |
|---|---|
| **Step** | M3 milestone (user: "go") |
| **Local time** | 2026-11-09 03:19:36 |
| **Status** | Complete — merged to `main` (tag `m3`), pushed, deployed live |

## Request (verbatim)

> go

(Go for M3 per the step005 close.)

## Response

M3 executed per plan `docs/superpowers/plans/2026-11-09-m3-views-aaina-audio.md` — 7 tasks + final review + fix wave, every task reviewed. **174 unit + 15 e2e green; 154.5 KB gz.**

**What's new in the game:**
- **Views (V):** FOCUS → **QUAD** (front/left/right/back scissor panes, alternate-frame side rendering) → **OVERHEAD** (2D tactical map: fog of war, gold you-arrow, beacons, enemy pings, Chhaya pings) — press **T** for **TACTICAL** (paused planning, click waypoints, Esc exits). The wall clock keeps running under any pause — best times are pause-proof by design.
- **Aaina ([Q] or 💬):** the lantern speaks — Ask (the FAQ, now diegetic), **Hint** (contextual guidance that costs shards: 5, then +5 each), Lore (unlocked by floors cleared: 1→2, 3→4, 6→6 entries). She does NOT pause the game; she talks while you run.
- **Sound (first input starts it; M/🔊 mutes):** the fully-original procedural score — tanpura-style drone, raga-mood melody walker (tier-1 Ahir-Bhairav-inspired scale), tabla-style percussion on an 8-beat cycle, threat-adaptive (anger/chase/fail drive intensity), persists mute preference.
- **Polish:** frost now requires line-of-sight (no fogging through walls), echoes close on your exact position in-cell, E no longer swings the camera when pushing doors (shared `withoutKey` claim pattern with Q), repo-wide prettier sweep.

**Process record:** every task reviewed; reviewer escalations adjudicated (my brief's square-pane contradiction → side-cam aspect fix; wall-clock-under-pause ratified; preserveDrawingBuffer tradeoff documented). Final review caught a real audio defect — background-tab throttling made the scheduler blast every missed beat on return — fixed with a clamp before merge. Deferred to M4/M5: shards chip pending-vs-banked semantics, pointer-lock vs tactical Esc ergonomics, low-tier Android quad/preserveDrawingBuffer measurement, audio mix feel.

**Live:** https://mirror-house-8fg.pages.dev (200 OK) · github.com/seolithdev01/mirror-house @ `m3`.

## Artifacts

- Commits `f90c045..d6b0766` on main (10), tag `m3`
- New modules: `audio/theory`, `audio/engine`, `game/viewMode`, `game/aaina`, `ui/aaina`, `ui/overhead`; machines registry rows 8–10
