# step003 — colors, avatar + self-reflection, input modes, FAQ, meta-lite

|                |                                                                 |
| -------------- | --------------------------------------------------------------- |
| **Step**       | #step003                                                        |
| **Local time** | 2026-11-08 16:07:56                                             |
| **Status**     | Complete — merged to `main` (tag `m1.1`), pushed, deployed live |

## Request (verbatim)

> Why are there no colors? Also it should be possible to make the protogonist configurable and the reflection of the person should be seeable while playing. We also need to play it with keyboard only or mouse only or keyboard/mouse and the buttons for each should be available. We need to have a FAQ, high score, streak,, retention and stickyness patterns.

## Response

All five asks shipped in one step (8 tasks, subagent-driven, every task reviewed; final whole-branch review = "ready with fixes," fixes applied and re-verified):

1. **Colors** — tier-1 art direction: procedural palette (deep indigo void, warm plaster walls with gold wainscot, patterned floor with gold lattice + rose diamonds on a 6-cell repeat), warm lantern, tinted fog. The M1 gray was placeholder material; spec §5.6 now records the art direction.
2. **Configurable protagonist + visible reflection** — low-poly Surveyor avatar (coat × lantern-glass: indigo/teal/rose/ivory × gold/teal/white via `?look=teal-white`) on render layer 1: invisible to the first-person camera, rendered by mirror cameras. Two hero mirrors per floor (entrance + exit cells, deterministic wall placement) use planar render-to-texture with a clip plane — **you see yourself in the glass at spawn**. M2's riskiest tech, de-risked early.
3. **Keyboard-only / mouse-only / hybrid** — HUD switcher buttons; keyboard mode turns with arrows/Q/E; mouse mode walks toward the cursor (hold-left) with a steering deadzone, right-hold sprints; hybrid unchanged. Pointer lock only in hybrid. Mode persists on device.
4. **FAQ** — 12 Q/As in-game (button + [H]); copy doubles as Aaina's future knowledge base.
5. **High score / streak / retention** — device-local only (no telemetry, per the privacy promise): run timer starts on first move, floor-cleared overlay, best time per seed, consecutive-day streak, and a date-derived ★ Daily seed everyone shares. Full stats dashboard deferred to M4 by design.

**Verification:** 49 unit + 6 e2e green (including live-browser checks of all three input modes, look parsing, localStorage-cleared boot, fresh-device meta); bundle **141 KB gz** (5% of budget). Three plan bugs caught by implementers/reviewers during execution (floorAccent gold-rule self-contradiction, strict-null hud fmt, page.evaluate function serialization) — all adjudicated, plan synced in-tree. Final review found the gold lattice provably never rendered (my own adjudication's blind spot) plus resize-broken mouse steering — both fixed before merge.

**Live:** https://mirror-house-8fg.pages.dev (deployed via wrangler; CI auto-deploy still awaits the user's `CF_API_TOKEN` secret). Source: github.com/seolithdev01/mirror-house @ `m1.1`.

## Artifacts

- Spec additions: §5.5 input modes, §5.6 art direction, §5.7 meta layer, §7.4 avatar/reflection
- Plan (all boxes ticked): `docs/superpowers/plans/2026-11-08-step003-color-avatar-reflection-inputs-meta.md`
- New modules: `palette.ts`, `textures.ts`, `look.ts`, `avatar.ts`, `mirror.ts`, `floorRun.ts`, `meta.ts`, `ui/hud.ts`, `ui/faq.ts`
- Commits `5bfbbce..a3a8e08` on main, tag `m1.1`
