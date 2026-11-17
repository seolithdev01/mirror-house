# T13 — Start screen + pause/resume (merged, live)

| | |
|---|---|
| **Step** | Session UX milestone (user: "as soon as we open the link the game directly get started. instead a play or start button is needed to start playing. Also a pause/resume button is required to pause the game in between. verify") |
| **Local time** | 2026-11-17 10:25:42 |
| **Status** | Complete — merged to `main` (tag `t13`), pushed, deployed live |

## Request (verbatim)

> In mirror house as soon as we open the link the game directly  get started. instead a  play or start button is needed to start playing. Also a pause/resume button is required to pause the game in between. verify

## Response

Both shipped (3 tasks + final review: merge-yes with fast-follows, all landed pre-merge). **1092 unit + 57 e2e.**

**Shipped:**
- **Start screen** — the PoD boot poster now *becomes the door*: after the 1.6 s hold it resolves into an opaque ink plate — kicker MIRROR / giant HOUSE / tagline / **BEGIN THE DESCEND** (fresh) or **CONTINUE — FLOOR N** + **NEW HOUSE** (stored campaigns) / mini-stats / credits. Focus-trapped dialog, Escape-proof (it gates the session), keys deaf while plated, world live behind in `ready`. Dismiss → the floor is exactly as boot built it.
- **PAUSE/RESUME** — dock chip PAUSE⇄RESUME + **KeyP** (keymap 17→18 with migration, rebinds-win). PAUSED plate with the honesty line: **the clock keeps counting — the house doesn't wait** (pause-proof bests, ratified). Fails blocked while paused and fire exactly on resume; Echoes/Sentinels/decoys/water-feed/noise/Chhaya all freeze; arms running-only (before the first input there's no clock to betray).
- **Fast-follows from the final review, landed pre-merge**: boot-poster TDZ guard (slow-IDB first visits no longer lose the gate), water-wording truth (the flood's flow freezes, the level keeps climbing — pause-proof too), NEW HOUSE composition pin.

**Verified:** the session e2e proves the full arc — plated = deaf + clock unarmed → BEGIN opens → held W walks + arms → PAUSE freezes a held walk for 600 ms while the timer counts through the plate → RESUME releases. Plus CONTINUE — FLOOR 2 via a validateSave-clean IDB seed, and the NEW HOUSE composition.

**Live:** https://mirror-house.seolith.com (200 OK) · github.com/seolithdev01/mirror-house @ `t13`.

## Artifacts

- Commits `a58a961..161d9c7` on main (7), tag `t13`
- New: `ui/startScreen.ts`, `floorRun.ts:pauseDecision`, session.spec.ts (3 tests); docs: USE-CASES UC-49/50, STATE_MACHINES row 12, FAQ +2, TEST-CASES +3
