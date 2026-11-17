# T14 — Polish wave: six review riders closed (merged, live)

| | |
|---|---|
| **Step** | Polish milestone (user: "continue" — the accumulated fast-follow riders from T8/T11/T13 reviews + the 2 h soak) |
| **Local time** | 2026-11-17 11:49:19 |
| **Status** | Complete — merged to `main` (tag `t14`), pushed, deployed live |

## Request (verbatim)

> continue

## Response

The T14 polish wave closed all six accumulated review riders (implementer → reviewer pairs per task, final whole-wave review: "Ready to merge — with one fix", fix landed, merge). **1095/1095 unit + 58/58 e2e; +0.12 kB gzip.**

**Shipped (6 commits, `2c2363c..222d0fe`):**
- **Heat shimmer spans the viewport aspect** (`a5d2d71`) — the T8 shimmer plane was sized for square viewports; it now scales to the actual camera aspect.
- **The pause stands down while a modal is open** (`8fb500c`) — KeyP/PAUSE chip are no-ops while any dialog is open (`anyDialogOpen()` = `openOrder.length > 0`), with focus bookends restored on stand-down/resume.
- **Fresh saves render no empty stats line** (`4271da1`) — the T13 start screen's stats row is skipped entirely for brand-new campaigns instead of rendering empty.
- **The WIDENING_ACTIONS covenant** (`2d1bc12`) — the save-wipe lesson turned into policy + enforcement: a policy comment pins the rule (keymap vocabulary may only widen) and a snapshot test mutation-fails with "you widened the vocabulary — update WIDENING_ACTIONS and this snapshot" if the next keymap change (18 actions today) ever breaks the widening migration.
- **Docs truth** (`dc846b0` + `222d0fe`) — A11Y.md and TEST-CASES.md aligned to shipped behavior; the final review's single required fix applied: line 148's claim that the pause plate lines are captions was false (the plate announces via role=dialog/aria-labelledby + the focused RESUME button) — reworded to say exactly that.

**Also running:** the second 120-minute soak (`node scripts/soak.mjs --minutes 120`, port 4180) — started 10:40, verdict lands ~12:40; recorded in spec §13.3 when it exits. First soak: 2181 cycles, flat memory.

**Process:** two plan self-contradictions caught by implementers and ratified — the shimmer fix's aspect handling and the pause×modal gate's interaction with the start plate; the final review gated the wave on the one A11Y.md sentence ("fails this wave's own contract for fix 5") — fixed before merge.

**Live:** https://mirror-house.seolith.com (200 OK) · github.com/seolithdev01/mirror-house @ `t14`.

## Artifacts

- Commits `a5d2d71..222d0fe` on main (6), tag `t14`
- Touch points: `ui/dialog.ts` (`anyDialogOpen`), `floorRun.ts` (pause decision), `ui/startScreen.ts` (stats skip), `engine/input.ts` (covenant comment), `tests/*` (snapshot + pause×modal + stats), docs A11Y/TEST-CASES
