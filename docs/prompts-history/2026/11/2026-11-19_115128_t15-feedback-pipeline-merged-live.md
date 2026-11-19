# T15 — Feedback pipeline: shot + text → production → triage (merged, live)

| | |
|---|---|
| **Step** | Feedback milestone (user: "Users/Testers should be able to take a screenshot with a feedback/suggestions button and that should be collected and arrive in production for you to triage and work on fixing/updating the software") |
| **Local time** | 2026-11-19 11:51:28 |
| **Status** | Complete — merged to `main` (tag `t15`), pushed, deployed live, **production smoke passed** |

## Request (verbatim)

> Users/Testers should be able to take a screenshot with a feedback/suggestions button and that should be collected and arrive in production for you to triage and work on fixing/updating the software.

## Response

The existing 📮 composer upgraded into a direct channel (5 tasks + final review: "with fixes" — 1 Critical + 2 MUST-FIX landed, re-review: **ready to merge: yes**; gates at merge: **1107/1107 unit, 59/59 e2e, app 75.83 kB gz (+~1.8)**).

**Shipped (`a239cdf..6c09f70`, 7 commits):**
- **The moment, held** — opening the composer captures the WebGL canvas (preserveDrawingBuffer already on) into a ≤1280 box-fit JPEG preview: the exact frame the player was looking at ships with the report.
- **SEND TO THE HOUSE** — one click POSTs {version, kind, title, body, shot, ctx(floor/tier 0=venue/mode/view/lang/preset/seed/dpr/ua/heap)} to same-origin `/api/feedback`; honest sending/sent/failed states; draft never lost on failure; GitHub/email stays as fallback anchors.
- **`/api/feedback`** (Pages Function + R2 binding in new `wrangler.toml`) — ONE shared validator (`src/game/feedbackNet.ts`, imported by both ends), whole-payload refusal, unknown keys stripped, 4/hour/IP via R2 prefix counting with rate markers (`--sweep-markers`), truncated-SHA-256 IP hash only, **no read API** — reports leave only via the private bucket + wrangler.
- **Triage script** (`scripts/feedback-triage.mjs`) — REST listing via wrangler's own OAuth creds (wrangler v4 has no `r2 object list`), `--key` decodes the bare-base64 shot to a real JPEG, `--del`, `--sweep-markers`; runbook in LAUNCH.md.
- **Truth sweep** — the promise amended everywhere it was absolute: *"Nothing leaves your device unless you send it."* (start.credits en/hi, FAQ, meta description, README, PRIVACY.md canonical section, TESTERS, invites template, PROVENANCE). v0.2.0-beta.4.
- **Final review's Critical caught pre-merge**: the CI deploy job had no checkout — push-to-main would have shipped static-only and the feature would 404 in production while CI stayed green. Fixed (checkout before artifact download; dist still artifact-born).

**Production smoke (2026-11-19 11:51):** valid POST → **201** `{ok:true}`; garbage → 400 `invalid JSON`; wrong content-type → 400; GET → 405. Triage round-trip: listed with real meta (colo EWR, country US, truncated ipHash), shot decoded to a real JPEG under the unique-stamp name, `--del` + `--sweep-markers` → bucket left **empty**.

**Process:** implementer/reviewer pairs per task; three plan self-corrections caught by implementers and ratified — box-fit+ceil `targetShotSize` (plan's snippet failed its own pinned tests), the rate-marker put (plan's limiter counted objects nothing ever wrote), REST listing (wrangler v4 reality). Task-3's proofs ran on the REAL Pages runtime before merge.

**Live:** https://mirror-house.seolith.com (200 OK) · github.com/seolithdev01/mirror-house @ `t15`.

## Artifacts

- Commits `a5d2d71..6c09f70` merged `1e11ae1..6c09f70`, tag `t15`
- New: `src/game/feedbackNet.ts`, `functions/api/feedback.ts`, `functions/tsconfig.json`, `wrangler.toml`, `scripts/feedback-triage.mjs`, R2 bucket `mirror-house-feedback` (private)
- Modified: ui/feedback.ts (capture+SEND), main.ts (snapshot+version wiring), i18n (en/hi ×11 + truth rewords), index.html (plate CSS), ci.yml (deploy checkout), docs (README/PRIVACY/PROVENANCE/USE-CASES UC-51/TEST-CASES FBK-*/LAUNCH/TESTERS)
