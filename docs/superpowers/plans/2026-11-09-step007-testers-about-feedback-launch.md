# step007: Testers, About, Feedback, Test Cases, Overrides — Launch Kit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subgram-driven... (sic) REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Everything a stranger needs to test Mirror House and tell us about it: personalized tester invites (drafted, git-ignored), an About panel, an in-game Feedback/Suggestion flow that composes prefilled GitHub issues with diagnostics (no server, no telemetry — user-initiated only), GitHub issue templates, a manual QA suite (TEST-CASES.md), tester-mode overrides (`?test=1` unlocks the diagnostics hook + chip in PROD), and launch meta tags (description/og).

**Architecture:** All in-app surfaces reuse the dialog/overlay + i18n + a11y infrastructure (focus traps, aria, text-scale, reduced-flash). The feedback composer is pure: `buildIssueUrl(category, body, diagnostics)` returns a URL the player opens themselves. Tester mode gates the EXISTING dev hook behind a `?test=1` session flag (never persisted) + a small always-visible diagnostics chip in that mode. Nothing phones home — ever.

**Tech Stack:** unchanged; zero new dependencies.

## Global Constraints

- No-break: 336 unit + 27 e2e stay green (extended where specified); default experience unchanged (no tester chip, no About button clutter — About lives in ⚙ AND a small ⓘ next to 🌐); every new string en/hi parity.
- Privacy: tester emails NEVER committed (git-ignored `docs/invites/`); the public kickoff issue contains no addresses; the feedback flow sends nothing automatically — it opens a URL/mailto the player reviews.
- The dev hook under `?test=1` in PROD is ratified (open-beta diagnostics; banner "TESTER MODE" shown; flag session-only).
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(beta)/docs(beta)/chore(beta)`.

---

### Task 1: About panel + launch meta tags

**Files:** Create `src/ui/about.ts` · Modify `index.html` (meta description, og:title/description/image/type, twitter card; og:image = https://mirror-house-8fg.pages.dev/assets PNG? og:image must be a direct PNG URL — copy `store-assets/icon-512.png` to `public/og-image.png` and reference absolutely), `src/ui/hud.ts` (ⓘ button + ⚙ link), `src/ui/faq.ts` (+2: how to report bugs; what the beta is), tests for any pure fn.

About content (en/hi): version (from a new exported APP_VERSION const = package version, injected via vite `define`), what the game is (2 lines), Beta status, credits (original & open source; music generated live), links (Source · Privacy · Provenance · License — absolute URLs), "made of 100% original glass" tagline. Dialog a11y per house style.

- [x] Tests → RED → implement → GREEN → gates + e2e (About opens via ⓘ; FAQ count bump). Commit `feat(beta): about panel + launch meta tags`.

### Task 2: Feedback & suggestions — composer + GitHub templates

**Files:** Create `src/game/feedback.ts` (pure: `diagnosticsSnapshot(state…): string` — version, seed, floor, campaign base, phase, preset, lang, reducedFlash/captions, keymap-diff-count, venue, errors ring buffer; `buildIssueUrl(kind, title, body): string` → github.com/seolithdev01/mirror-house/issues/new?template=…&labels=…&title=…&body=…; `buildMailto(to, subject, body)`), `src/ui/feedback.ts` (overlay: category radio Bug/Suggestion/Love, title input, description textarea, [Open GitHub issue] + [Email instead] buttons; prefills diagnostics; opens via new HUD 💬→ conflict — Aaina uses 💬 already? check hud ids; use 📮), `.github/ISSUE_TEMPLATE/config.yml` (blank issues disabled? keep enabled), `.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `playtest.md` · Modify `src/main.ts` (error ring buffer: window errorreplay of console.error + pageerror into a capped 10-entry ring for diagnostics; wire overlay + key F6? no — button + ⚙ entry), README (Feedback section).

Diagnostics snapshot is READ-ONLY truth from live state; the player SEES the exact body before anything opens (textarea contains it).

- [x] Tests (snapshot shape incl. error ring; URL encoding incl. newlines; mailto fallback) → RED → implement → GREEN → gates + e2e (+1: overlay opens, GitHub button href contains template+encoded body). Commit `feat(beta): feedback + suggestion composer, issue templates`.

### Task 3: Tester mode `?test=1` + overrides documentation

**Files:** Modify `src/main.ts` (hook condition `DEV || testMode`; TESTER chip: small fixed chip "TESTER · {fps} · {seed}:{floor}" visible only in test mode; banner once), `docs/URL-PARAMS.md` (every param: seed, floor, look, lang, perf, venue, test — what each does, examples), `docs/TESTERS.md` (tester guide: quick start, the 5-minute smoke, pointers to TEST-CASES + feedback, "your data stays on your device", personal-seed convention) · tests for the pure flag parse.

- [x] Tests → RED → implement → GREEN → gates + e2e (+1: `?test=1` in dev shows hook + chip — assert chip text contains seed). Commit `feat(beta): tester mode, URL params + testers guide`.

### Task 4: Manual test cases + invites + kickoff issue prep

**Files:** Create `docs/TEST-CASES.md` (~28 cases across: Smoke 6, Campaign 8, Views 3, A11y 5, Saves 3, Audio 2, Venue 2, Mobile/Touch 2 — each: ID, steps, expected), `docs/invites/` (GIT-IGNORED: 5 personalized `invite-<tag>.md` emails + `_all.md`; tags/seed bases: TESTIS, TESTRS, TESTSK, TESTNY, TESTMJ), `.gitignore` (+`docs/invites/`), `docs/invites/TEMPLATE.example.md` (committed, redacted). gh actions at merge time (controller): labels `feedback`/`from-game`/`playtest`, kickoff issue (no emails).

- [x] Write TEST-CASES (cross-checked against real UI ids/keys from source). [x] Invites (each: greeting, what Mirror House is in 2 lines, their personal link `…?seed=TESTXX`, the 15-min smoke pointer + full suite pointer, feedback links, deadline ask "within a week", privacy line). [x] gitignore + template. Commit `docs(beta): manual test suite, tester invites (redacted), kickoff prep`.

### Task 5: Close-out + merge + deploy

- [x] README/CHANGELOG/spec §13.4 notes; plan ticks; full gates + e2e (27→30).
- [ ] Merge to main; controller: `gh label create` ×3, kickoff issue (public, no emails), deploy, verify live (og meta + /og-image.png 200).
- [ ] Archive prompts-history + memory.

## Plan Self-Review

Coverage vs the ask: invites ✓ (drafted, privacy-safe + rationale), FAQ ✓ (exists; +2 beta entries), About ✓, Feedback+Suggestions ✓ (in-game + templates), manual test cases ✓, overrides ✓ (?test=1 + URL-PARAMS), "other necessary" ✓ (og/meta launch tags, diagnostics ring, kickoff issue). Placeholders: none — composer/panel/cases fully specified. Types: APP_VERSION via vite define; feedback.ts pure; no hook renames.
