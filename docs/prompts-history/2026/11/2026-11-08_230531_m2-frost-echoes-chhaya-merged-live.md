# M2 — Frost Lantern, Echoes, Chhaya, House Anger, passages (merged, live)

|                |                                                               |
| -------------- | ------------------------------------------------------------- |
| **Step**       | M2 milestone (user: "go")                                     |
| **Local time** | 2026-11-08 23:05:31                                           |
| **Status**     | Complete — merged to `main` (tag `m2`), pushed, deployed live |

## Request (verbatim)

> go

(Go for M2, per the step003 close: "Say go for M2 — or tell me what to tweak first.")

## Response

M2 executed per plan `docs/superpowers/plans/2026-11-08-m2-frost-echoes-chhaya.md` — 9 tasks + final review + one fix wave, every task reviewed. **The game now has its core loop, machine-proven winnable and losable (10/10 e2e incl. a scripted full win and both fail paths).**

**What's new in the game:**

- **Frost Lantern (F)** — fog standing mirrors (25s) to blind enemy sight; breath meter recharges; **beacon mirrors** (3/floor, teal) capture permanently when frosted — capture all three to unlock the gold exit door.
- **Echoes** (4/floor) — glass figures that see you ONLY through un-fogged mirrors (reflected line-of-sight), patrol on flow fields, chase on sight, and get **confused/stuck** when their local mirrors are all fogged (the trap mechanic, +10 shards each).
- **Chhaya** — a dark copy of the player replaying your exact path 6 seconds behind. Break your line-of-path or use a True Mirror.
- **House Anger** — sprinting into mirrors cracks them (+15 each); 7 cracks = collapse = floor restart. Caught by any enemy = restart. Fail = same seed, 1.2s freeze, attempts counted.
- **Passages** — gold-framed **True Mirror** pairs: Space steps you through to the twin (legality-checked); **silvered doors**: E pushes them open into real secret passages.
- **Shards** — 5/beacon, 10/stuck echo, 25/flawless floor; persisted on-device with best times, streak, daily.

**Process record:** 116 unit + 10 e2e green; bundle 148 KB gz (4.9% of budget). Reviewer-caught plan bugs adjudicated along the way: 60° frost cone (my constant contradicted my own test), teleport heading formula (my formula faced into the wall on E/W mounts), emergence clearance offset (raw mirror spot fails the legality gate), same-frame fail+clear race. Final review verdict "ready with fixes" → three one-liners landed (mouse-drain on restart, door z-fight from frame one, no breath waste on captured beacons). Deferred to M3 polish: E-key dual-use, in-cell echo pursuit, frost LOS check, prettier sweep (17 files).

**Live:** https://mirror-house-8fg.pages.dev (200 OK verified) · github.com/seolithdev01/mirror-house @ `m2`.

## Artifacts

- Commits `6c124be..8233263` on main (11), tag `m2`
- New modules: `floorObjects`, `frost`, `los`, `flowField`, `echo`, `echoView`, `chhaya`, `houseState`, `passages`; HUD: breath/anger bars, beacons/shards chips, fail overlay, hint line
- CI hardened: least-privilege permissions, concurrency cancel, immutable `/assets/*` caching
