# M5 — accessibility, perf presets, beta hardening (merged, live)

| | |
|---|---|
| **Step** | M5 milestone (user: "go") |
| **Local time** | 2026-11-09 15:04:43 |
| **Status** | Complete — merged to `main` (tag `m5`), pushed, deployed live |

## Request (verbatim)

> go

## Response

M5 executed per plan `docs/superpowers/plans/2026-11-09-m5-a11y-perf-hardening.md` — 7 tasks + final review + one fix wave. **318 unit + 24 e2e green; 168.56 KB gz; Lighthouse a11y 97 desktop + 97 mobile (controller-run via chrome-devtools MCP against the branch preview).**

**Shipped:**
- **⚙ Settings** (text scale 1/1.25/1.5, reduced-flash, captions, performance, controls) — persisted, exported with the save.
- **Reduced-flash**: Taal's lantern + all pulses static; overlays fade ≥320ms with no ghost tab stops. **Text scale** on every HUD/overlay font. **Captions**: 13 event types (echo sight/chase/confusion, Chhaya appearance with live delay, Taal, anger, fail/clear/descend/tier, hints, audio) — en/hi, aria-live.
- **Full key remapping** — 15 actions, conflict-guarded, capture UI that can't leak into gameplay, strict import gate (Aaina moved to I; Q/E pure turning).
- **Perf presets** — auto (FPS hysteresis, live-proven dropping a throttled run to low) + manual; low path disables hero RT (true mirrors exempt — gameplay-critical).
- **Beta hardening** — PRIVACY/PROVENANCE/PLAYTEST docs; aria-labels + dialog/focus-trap everywhere; export/import round-trip e2e (real download → real import); restart <2s e2e; 10-min soak **leak-free** (heap Δ 0.00 MB, 182 restart cycles) + `npm run soak -- --minutes 120` runbook.
- Backlog: 7 fixes incl. Dwaar re-clear banking gate and the six-second copy retirement.

**Process record:** the final review's live probe found the milestone's one true embarrassment — Space (step-through) globally swallowed keydowns, making the a11y checkboxes themselves keyboard-inoperable. Fixed with a dialog-activation-key stand-down + a keyboard-toggle e2e. Two gates remain OPEN by design (need humans): the 5-stranger playtest (kit shipped: PLAYTEST.md) and the 2h soak run.

**Live:** https://mirror-house-8fg.pages.dev (200 OK) · github.com/seolithdev01/mirror-house @ `m5`.

## Artifacts

- Commits `7d414fd..314682a` on main (10), tag `m5`
- New: `ui/settings`, `ui/captions`, `ui/dialog`, `game/quality`, `scripts/soak.mjs`, PRIVACY/PROVENANCE/PLAYTEST/A11Y docs
