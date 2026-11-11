# T6 — Furnace Wings (merged, live)

| | |
|---|---|
| **Step** | Tier 6 content milestone (user: "go") |
| **Local time** | 2026-11-11 06:32:40 |
| **Status** | Complete — merged to `main` (tag `t6`), pushed, deployed live |

## Request (verbatim)

> go

## Response

Tier 6 executed per plan `docs/superpowers/plans/2026-11-11-t6-furnace-wings.md` (5 tasks + final review + one fix wave). **715 unit + 40 e2e; 189.48 KB gz.** Floors 51–60 playable — the campaign now spans 60 floors, three acts' worth of tiers with one to go.

**Shipped:**
- **Heat** — the Furnace re-tunes the fight: frost evaporates in **12.5 s** (half the Flood Halls' 25 s), and every sprint-crack costs **25 anger** (was 15). The furnace breathes: warm haze, an ember glow low near the floor, a static shimmer (reduced-flash safe). Frost still works — it just doesn't *stay*.
- **Gher + Aavart return from rest; Taal rests** — floors 51–59 hunt with Chhaya + Gher + Aavart (the Furnace is their home); **Dwaar VI brings all four** in the twin-forge crucible (Taal returns only for the crucible). The rotation's first rest, spec §4.4-consistent.
- **The house guards its copies** — the deferred Act II escalation: Gher's seal now reads alive decoys as objectives. Shatter a copy for shards while Gher's nearby, and he seals *onto it*. Once-per-floor caption: *"The warden guards the copy."*
- **Dwaar VI** — twin forge corridors joined by a crucible chamber, 101 cells; `✦ Truth-Shard VI — Tier VI complete`; Dwaar V cascades to its interstitial. Campaign terminal at 60 until Act III.
- Dark urgent scale [0,1,5,7,8]; ember/copper palette; Taal's rest and the decoy-ward start-at-the-Wings decision documented in spec/STATE_MACHINES/CHANGELOG.

**Process:** the implementer caught my rotation shorthand breaking the ratified 41–49 rest (fixed to preserve floors 1–50 exactly, truth-table pinned); the final review caught a venue-isolation leak (heat modifiers bled into ☕ venue floors entered from 51+) — fixed with a shared `heatActiveFloor()` gate, live venue probe proof. Validator binding held a FIFTH time.

**Live:** https://mirror-house-8fg.pages.dev (200 OK) · github.com/seolithdev01/mirror-house @ `t6`.

## Artifacts

- Commits `91f57bb..9247fac` on main (7), tag `t6`
- New: `game/heat`; modified: campaign (60 + rotation + Dwaar VI), frost (caller-owned duration), houseState (caller-owned anger), gher (decoy objectives), palette/theory, main, docs
