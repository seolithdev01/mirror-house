# T2 — Hall of Ancestors (merged, live) + 2h soak passed

| | |
|---|---|
| **Step** | Tier 2 content milestone (user: "continue") |
| **Local time** | 2026-11-10 06:07:29 |
| **Status** | Complete — merged to `main` (tag `t2`), pushed, deployed live |

## Request (verbatim)

> continue

## Response

**Two things completed this session:**

**1. The 2-hour soak criterion PASSED** (run in the background during the build): 2181 fail-restart cycles, zero crashes, heap 9.5→14.5 MB during warm-up then **flat for the final hour**, geometries warm-up-stable at 28, textures flat. The last machine-checkable §13.3 exit criterion is closed (recorded in the spec).

**2. Tier 2 — The Hall of Ancestors** shipped per plan `docs/superpowers/plans/2026-11-10-t2-hall-of-ancestors.md` (5 tasks + final review + a critical fix wave). **416 unit + 32 e2e; 172.4 KB gz.**
- **Floors 11–20** with a pinned ramp (echoes to 6, beacons 4, Chhaya tightening to 3.8s); floor chip `L14 · T2`; **Dwaar II** at floor 20 — a new handcrafted pillar-hall layout (96 cells, symmetric, verified); **✦ Truth-Shard II — Tier II complete**; Dwaar I clear now shows a brief `✦ Truth-Shard I` interstitial before descending.
- **Taal the Sentinel** — the floor-5 cameo keeps his anger-only touch; from floor 11 he walks EVERY floor and **contact catches you**. Still beat-paced: cross on the dim beat. Aaina learned the hint.
- **Ancestor portraits** — 2–3 amber wall-mirrors per tier-2 floor, each with a dim procedural figure in the glass; fog them like any standing mirror (they're Echo eyes too).
- **The Hall looks and sounds like itself** — amber/brown palette (tier-1 floors pixel-exact unchanged — verified 100.000%), and the score switches to the Durga pentatonic (finally wired, two milestones after it was composed).
- **The final review caught a release-blocking Critical**: the save validator still capped floors at 10 — the first reload after reaching floor 11 would have silently WIPED a player's entire save (shards, streak, settings, progress), and an old test was pinning the bug as correct. Fixed (bound widened to 20, the misleading test corrected to pin 21 as the first rejection, and a serialize→validate round-trip regression added for floor-15 saves). Venue floors also reset the melody scale now.

**Live:** https://mirror-house-8fg.pages.dev (200 OK) · github.com/seolithdev01/mirror-house @ `t2`.

## Artifacts

- Commits `2af7135..c4caaac` on main (7), tag `t2`
- Modified: campaign (20 floors + Dwaar II), taal (sentinel), floorObjects (portraits), palette/textures/floorScene (tier-aware), audio engine (setScale), save validator (critical), main/hud/i18n/FAQ/README/CHANGELOG/spec/STATE_MACHINES
