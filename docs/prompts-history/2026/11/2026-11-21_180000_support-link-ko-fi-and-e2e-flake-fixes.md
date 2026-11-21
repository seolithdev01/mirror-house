# support-link — Ko-fi tip jar live, four slow-runner e2e flakes fixed

|                |                                                                      |
| -------------- | -------------------------------------------------------------------- |
| **Step**       | support-link                                                         |
| **Local time** | 2026-11-21 ~18:00                                                    |
| **Status**     | Ko-fi link live on `bd9b7d3`; e2e hardening verified locally (60/60) |

## Requests (verbatim)

> set up the donation account and add the support link

(answering the platform and sign-up questions: "Ko-fi (Recommended)", "I'll
create it (Recommended)")

> Page is ready

(answering "What is the Ko-fi handle?": "seolith", then, mid-turn:)

> https://ko-fi.com/teamseolith

> what next

> it loads

> Yes, both

(answering "Write the record and fix the four flaky e2e tests next?")

## Response

**Donation link**

- The owner created the Ko-fi page and connected payouts themself; no
  sign-in, password or payout detail passed through the session.
- `ci.yml`: the `check` job's build reads `VITE_SUPPORT_URL` from the repo
  variable of the same name; set to `https://ko-fi.com/teamseolith`.
  `safeSupportUrl` already allowed ko-fi.com, so no game code changed.
- `.github/FUNDING.yml`: `ko_fi: teamseolith` beside the host-a-floor link.
- README Donations section and CHANGELOG `[support-link]` updated.
- The handle was first set to `seolith` (`8ae3310`) and corrected to
  `teamseolith` (`bd9b7d3`) when the owner sent the page URL.
- Verified: CI check, e2e, deploy green on `bd9b7d3`; the live bundle on
  mirror-house.seolith.com contains `ko-fi.com/teamseolith`; the owner
  confirmed the Ko-fi page loads (Ko-fi answers automated requests with 403).

**E2E flakes** (test-only)

CI on `8ae3310` (a docs/config change) failed four tests on both attempts;
the next run passed. Causes, from the CI logs and the code:

- **m2 — full win flow.** The cleared banner stands only `DESCEND_MS`
  (0.8 s) before the next floor hides it; the log shows it hidden with its
  text still set. Now waits on the banked best and reads the banner text.
- **t12b — keypress locks the mode across reload.** The lock persists on a
  250 ms debounce; the fixed 500 ms sleep lost the race, the reload booted
  as a fresh save, and the touch event claimed the mode. Now polls
  IndexedDB for the stored record before reloading. (First attempt used
  `waitForFunction` with a Promise — it treats the Promise object as
  truthy and does not wait; switched to `expect.poll` + `page.evaluate`.
  The probe also never creates the database.)
- **session — pause stands down while a modal is open.** A fixed 200 ms W
  could end before the first step, leaving the run unarmed; pause refuses
  outside a running floor. W is now held until the player has moved.
- **session — stored campaign shows CONTINUE.** Timed out at the CONTINUE
  click (two reloads plus a floor rebuild); budget raised to 90 s.
- `session.spec.ts` gained the same opt-in `MH_CPU_THROTTLE` hook as
  `smoke.spec.ts`.

**Verified**

- The four tests at 1× and 10× CPU slowdown; full suite 60/60 unthrottled
  and 60/60 at 6×. The two session failures did not reproduce locally even
  at 15×, so those fixes rest on the CI logs.

## Open items (need the owner)

1. **Token expiry** — the CI deploy token expires 2027-11-12.
2. **minimatch override** — remove once eslint / typescript-eslint depend
   on minimatch ≥ 11.0.1.

## Artifacts

- Commits `8ae3310`, `bd9b7d3` (support link) and the e2e hardening commit
- [.github/FUNDING.yml](../../../../.github/FUNDING.yml) · [.github/workflows/ci.yml](../../../../.github/workflows/ci.yml)
- [tests/e2e/smoke.spec.ts](../../../../tests/e2e/smoke.spec.ts) · [tests/e2e/session.spec.ts](../../../../tests/e2e/session.spec.ts)
