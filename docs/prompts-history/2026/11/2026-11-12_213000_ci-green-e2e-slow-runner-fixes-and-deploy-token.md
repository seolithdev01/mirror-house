# ci-green — e2e fixed for slow runners, CI deploy unblocked

|                |                                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| **Step**       | ci-green                                                                        |
| **Local time** | 2026-11-12 ~21:30                                                               |
| **Status**     | CI fully green on `a07dd23` (check, e2e, deploy); CI deployment `06fdf69a` live |

## Requests (verbatim)

> fix the failing e2e tests on GitHub CI

> push it and confirm CI passes

> i have logged into cloudflare in the integrated browser. create the token and gie me the token

> secret is set, re-run the deploy job

> add the prompts-history record for the CI fix

## Response

**Diagnosis**

The e2e job failed on GitHub's software-rendered runners in tests that pass
locally. An opt-in CDP CPU slowdown (`MH_CPU_THROTTLE=<rate> npm run e2e`,
added to `tests/e2e/smoke.spec.ts`) reproduced the failures locally. All
three were the test losing a race against the game across Playwright
round-trips — no game code was at fault, and none changed.

- **t5 — water rises and decoy walks.** Once the run starts, Chhaya replays
  the player's path ~3 s behind on floor 41. The test stepped, then stood
  for about that long, so on a slow runner the player was caught and the
  floor reset before the decoy touch.
- **t8 — floor 71 loads the atrium frozen.** The thawed pane sees the
  re-frost stand spot, so the lingering warden caught the player in the gap
  between the warp and the F press; the floor reset and the pane was frozen
  again.
- **t10 — the glazier hunts and the door opens.** Surfaced on the first
  push, once t5 and t8 passed: it ran out of the default 30 s budget and
  had the same stale-position races.

**Fixes** (test-only, `tests/e2e/smoke.spec.ts`)

- t5: the decoy leg runs first, in the `ready` phase (no path is recorded,
  nothing follows yet), chasing the copy's live position in-page; the flood
  leg holds W until the water answers and waits for a higher level instead
  of sleeping 2 s.
- t8: warp, aim check, frost keydown and retreat happen in one in-page turn.
- t10: 120 s budget; the hunt warps onto the Glazier's live spot until the
  fail lands; the re-arm waits on state, not a fixed sleep; W is held until
  the player has moved; each capture is one in-page turn.

**Verified**

- Locally: 48/48 unthrottled and 48/48 at 6× CPU slowdown; t5 and t8 also
  pass at 25×. t10 still fails at 30× (the master catches the player between
  captures) — far beyond CI, which runs roughly 2–3× slower than local.
- GitHub CI: e2e 48 passed on `a07dd23`.

**CI deploy**

- With e2e green the `deploy` job ran for the first time and failed: no
  `CF_API_TOKEN` secret.
- Created a Cloudflare API token in the owner's signed-in browser, on their
  request: `mirror-house github-actions pages deploy 20261112` — Cloudflare
  Pages: Edit only, scoped to the one account, expires 2027-11-12. The value
  was left on the page for the owner to copy; it was never read into the
  session. The owner set it as the repo secret.
- Re-ran the failed job: `deploy` succeeded (deployment `06fdf69a`),
  `mirror-house.seolith.com` 200. Pushes to `main` that pass check and e2e
  now deploy automatically; the manual `wrangler pages deploy` step is no
  longer needed.

## Open items (need the owner)

1. **Donations** — still no GitHub Sponsors / Ko-fi account; set
   `VITE_SUPPORT_URL` once one exists.
2. **Token expiry** — the CI deploy token expires 2027-11-12; rotate before
   then.

## Artifacts

- Commit `7852089` — `test(e2e): make t5 and t8 hold on slow CI runners`
- Commit `a07dd23` — `test(e2e): harden t10 for slow CI runners`
- CI run `43350113590` (check, e2e, deploy: success) · Deployment `06fdf69a`
- [tests/e2e/smoke.spec.ts](../../../../tests/e2e/smoke.spec.ts) · [.github/workflows/ci.yml](../../../../.github/workflows/ci.yml)
