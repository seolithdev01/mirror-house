# step007 — testers invited (kit), About, feedback, test cases, overrides (live)

| | |
|---|---|
| **Step** | #step007 |
| **Local time** | 2026-11-09 22:28:23 |
| **Status** | Complete — merged to `main`, pushed, deployed live; kickoff issue #1 created |

## Request (verbatim)

> Invite testers itsupport01@seolith.com, dev2025.rs@gmail.com, dev2026.sk@gmail.com, dev2026.ny@gmail.com, dev2026.mj@gmail.com to test. Add faq, about, feedback, suggestions, manual test cases, overrides and other necessary things to make it launch.

## Response

Beta launch kit shipped per plan `docs/superpowers/plans/2026-11-09-step007-testers-about-feedback-launch.md` (5 tasks + final review: merge-yes; one copy fix applied). **366 unit + 30 e2e; 176 KB gz.**

**The invitations — prepared, not sent (I cannot send email from the owner's address; drafts ready to fire):** 5 personalized invite emails + a combined copy live in **`docs/invites/`** (GIT-IGNORED — privacy: this repo is public and emails get scraped; leak-proof verified twice). Each tester gets their own seed base (TESTIS / TESTRS / TESTSK / TESTNY / TESTMJ) and personal link `…?seed=<TAG>&test=1`. A redacted TEMPLATE.example.md is committed. **User action: open `docs/invites/_all.md`, paste into their mail client, send 5.** The public kickoff issue (#1, playtest label) deliberately contains NO addresses.

**Shipped in-game:** ⓘ **About** (version-injected, credits, license/privacy/provenance links, en/hi); 📮 **Feedback/Suggestions** (bug/idea/love → composes a prefilled GitHub issue or mailto with a player-reviewed diagnostics snapshot — seed/floor/preset/flags/error-ring; nothing auto-sends, zero telemetry); **?test=1 tester mode** (PROD-probe-proven: diagnostics hook + TESTER chip + banner, session-only); launch **meta/og tags** + og-image; FAQ +2; error ring (capped 10).

**Shipped docs:** `docs/TEST-CASES.md` (31 scripted manual cases, source-verified keys/ids), `docs/TESTERS.md` (5-min smoke guide), `docs/URL-PARAMS.md` (every override documented), GitHub issue templates (bug/feature/playtest) + labels (feedback/from-game/playtest created).

**Live:** https://mirror-house-8fg.pages.dev (200; /og-image.png 200) · kickoff: https://github.com/seolithdev01/mirror-house/issues/1

## Artifacts

- Commits `285541c..e02093a` on main (7): about+meta, feedback composer+templates, tester mode, test-cases+invites, close-out, copy fix
- New: `ui/about`, `game/feedback`+`ui/feedback`, `URL-PARAMS/TESTERS/TEST-CASES`, `.github/ISSUE_TEMPLATE/*`, `public/og-image.png`, `docs/invites/` (ignored)
