# M6 — venue packs, store builds, beta launch (merged, live)

| | |
|---|---|
| **Step** | M6 milestone — the launch milestone (user: "go") |
| **Local time** | 2026-11-09 18:39:09 |
| **Status** | Complete — merged to `main` (tag `m6`), pushed, **beta deployed live** (mh-v5) |

## Request (verbatim)

> go

## Response

M6 executed per plan `docs/superpowers/plans/2026-11-09-m6-venue-stores-launch.md` — 5 tasks + final review (verdict: merge) + three review one-liners applied by controller. **336 unit + 27 e2e green; web bundle 169.9 KB gz; the SW cache bumped to mh-v5 with venue-pack offline precache.**

**Shipped:**
- **☕ Venue floors** — the local-venture system: strictly-validated venue packs (colors, floor params, en/hi taglines), campaign-isolated side-floors (no bests/shards/descend — proven by e2e; hint-buy blocked), daily-seeded, banner + return. **DEMO pack live: "Glasshouse Café"** (rose/gold) — playable at `?venue=demo-glasshouse-cafe` or via ⚙ → Floors. PROVENANCE carries the venue-trademark policy; LAUNCH.md carries the venue pitch template.
- **🤖 Android is real** — Capacitor 8.6.0 platform (`com.amtocsoft.mirrorhouse`, v0.2.0-beta.1, आईना घर label, minSdk 24), 23 pixel-audited lantern icons (adaptive safe-zone verified), and a **proven build: 4.08 MiB debug APK + 3.28 MiB unsigned release APK, aapt-verified**, after solving Capacitor 8's JDK-21 requirement with a portable Temurin (recipe in BUILD-STORES.md). iOS: full runbook, Mac required.
- **🏪 Store kit** — STORE-LISTING.md: en+hi copy, keywords, 6-shot screenshot checklist, **IARC answers drafted (E10+/PEGI 7)**, Data Safety = collects nothing, privacy URL. Repo hygiene verified: zero keystores/secrets; allowBackup deliberately false.
- **🚀 Launch kit** — LAUNCH.md (Reddit announcements en+hi, venue pitch template, launch-day checklist incl. the splash-swap before Play upload), CHANGELOG m0→m6, version 0.2.0-beta.1.

**Open human gates (honest):** Play/App Store submissions (user's accounts + keystore + a Mac for iOS + the splash swap), venue partner sign-off (machinery + demo live; pitch a real venture via LAUNCH.md), the 5-stranger playtest, the 2h soak run.

**Live:** https://mirror-house-8fg.pages.dev (200 OK; /venues/demo-glasshouse-cafe.json 200) · github.com/seolithdev01/mirror-house @ `m6`.

## Artifacts

- Commits `2a7938a..c9458f5` on main (8), tag `m6`
- New: `game/venue`, `public/venues/*`, `capacitor.config.ts`, `android/` (54 files), `scripts/gen-icons.mjs`, docs LAUNCH/STORE-LISTING/BUILD-STORES/CHANGELOG, `store-assets/` (8 PNGs)
