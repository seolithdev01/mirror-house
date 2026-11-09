# step002 — M0–M1 implementation plan (spec approved)

|                |                                                                   |
| -------------- | ----------------------------------------------------------------- |
| **Step**       | #step002                                                          |
| **Local time** | 2026-11-08 10:18:51                                               |
| **Status**     | Plan written + self-reviewed; execution approach question pending |

## Request (verbatim)

> Love it.. Proceed.

(Approval of the step001 design blueprint, including the Wolfenstein 3D / Prince of Persia lineage refinements and the four locked decisions. "Proceed" = go for step002 as proposed: turn M0–M1 into a concrete implementation plan.)

## Response

Step002 was authored with the writing-plans skill: a 12-task, TDD, bite-sized implementation plan for milestones M0–M1, saved to `docs/superpowers/plans/2026-11-08-m0-m1-scaffold-maze-focus.md`.

**Task map:**

1. Project scaffold (Vite + TS strict + ESLint flat + Prettier + Vitest, hand-rolled — no `create-vite` in a non-empty repo)
2. CI (lint/typecheck/test/build/e2e) + Cloudflare Pages deploy via wrangler-action + CSP `_headers` — includes the one-time human prerequisite (wrangler login, Pages project, API token, GitHub secrets)
3. Deterministic RNG (xmur3 + mulberry32) — pure, fully tested
4. Grid model (wall bitmasks, world-space wall segments, dead-end counting)
5. Seeded maze generation (backtracker → braiding → rooms → farthest-cell exit; connectivity proven by BFS tests)
6. Seed share codes (`/^[A-Z2-9]{1,16}$/`, unambiguous alphabet, Web Crypto)
7. Wolf3D movement (walk/sprint strafe-run, axis-clamped wall collision with slide, tunnel-proof dt clamp, spawn faces first open direction)
8. Keyboard/mouse input (pointer-lock yaw, pure `keysToMoveInput` mapper)
9. three.js floor scene (instanced walls, floor/ceiling, entrance/exit markers — node-testable)
10. FOCUS view bootstrap (fixed-timestep loop, lantern point light, fog, diagnostics overlay, `?seed=` URL param, dev debug hook)
11. Playwright smoke (loads, walks with W, same seed ⇒ same spawn, zero page errors)
12. Acceptance close-out (README quickstart, fps ≥ 60 check, ≤ 3 MB gz bundle check, tag `m1`)

Global constraints carried from the spec: Apache-2.0 SPDX headers, zero `any`, no `Math.random` in src, exact movement constants, CSP, determinism, conventional commits. Self-review passed (spec coverage / placeholders / type consistency); one authoring placeholder was found and fixed inline before commit.

**Execution handoff offered** (per writing-plans skill): subagent-driven (fresh subagent per task, review between tasks) vs inline (executing-plans, batched with checkpoints).

## Artifacts

- `docs/superpowers/plans/2026-11-08-m0-m1-scaffold-maze-focus.md` — the plan
- Commit: `docs(step002): M0–M1 implementation plan`
