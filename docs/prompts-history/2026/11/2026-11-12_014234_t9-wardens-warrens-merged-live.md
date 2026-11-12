# T9 — Warden's Warrens: the apex (merged, live)

| | |
|---|---|
| **Step** | Tier 9 content milestone — the apex (user: "continue") |
| **Local time** | 2026-11-12 01:42:34 |
| **Status** | Complete — merged to `main` (tag `t9`), pushed, deployed live |

## Request (verbatim)

> continue

## Response

Tier 9 — the spec's reserved apex (§4.6 row 9: "all four hunt together") — executed per plan `docs/superpowers/plans/2026-11-11-t9-wardens-warrens.md` (4 tasks + final review: **merge-yes**, zero Critical/Important; one two-line count-drift fix applied by controller). **900 unit + 46 e2e; 195.24 KB gz.** Floors 81–90 playable — **ACT III — THE GROUND DOOR** opens, and all four Sentinels hunt together on every procedural floor.

**Shipped:**
- **The apex rotation** — floors 81–90: Chhaya, Taal, Gher, AND Aavart hunt simultaneously (the shipped t8 gates rested everyone on 81+; T1 widened taal/gher `=== 80` → `≥ 80`, aavart already covered, with a byte-identical 1–80 oracle proving nothing below changed).
- **The texture stack returns** — every mastered mechanic as thin texture on the apex: heat (fog 12.5 s, cracks 25 anger), 2–3 water pools, 1–2 distort panes per floor. Floors 1–80 rng streams byte-identical (water's Gardens `int(3)` roll preserved; the Warrens roll `int(2)`).
- **Dwaar IX — the Warden's own warren** — hill-climbed so (11,11) is the UNIQUE farthest cell at exactly 20 BFS steps: 85 cells, twelve dead ends, zero big rooms, three-door waist. The hardest duel in the game: all four Sentinels, heat, six echoes. `✦ Truth-Shard IX — Tier IX complete`. Campaign terminal at 90 until Tier 10.
- **ACT III — THE GROUND DOOR** banner on floor 81: *"The door is real. So is what guards it."*
- Reviewer's winnability judgment: "barely-winnable — as designed, and not accidentally impossible": the player holds a permanent speed edge over every sentinel, every sense has a live counter under heat, and Dwaar IX's twelve dead ends are predictable cache positions for the 4 beacons. Hard by exactly the increments the plan ratified.

**Process:** the implementer corrected the controller's dispatch text (the apex did NOT auto-hunt — shipped gates rested on 81+; the minimal `≥80` widening with a 1–80 byte-identity oracle is the right fix). Final review ran an independent out-of-repo BFS geometry verification of Dwaar IX and swept all validators for stale floor-80 bounds — none found (binding held ×8, same-commit).

**Live:** https://mirror-house-8fg.pages.dev (200 OK) · github.com/seolithdev01/mirror-house @ `t9`.

## Artifacts

- Commits `73ecc19..984665e` on main (6), tag `t9`
- Modified: campaign (90 + apex rotation + Dwaar IX), heat (two-band), floorObjects (t9 pools/distort), save (validator ×8), palette/theory/engine, main, docs
