# M4 — Tier-1 campaign, save chain, PWA, i18n (merged, live)

| | |
|---|---|
| **Step** | M4 milestone (user: "continue") |
| **Local time** | 2026-11-09 10:33:59 |
| **Status** | Complete — merged to `main` (tag `m4`), pushed, deployed live |

## Request (verbatim)

> continue

## Response

M4 executed per plan `docs/superpowers/plans/2026-11-09-m4-campaign-saves-pwa-i18n.md` — 8 tasks, every task reviewed (T6's review folded into T7's dispatch), final whole-branch review: **merge, yes** (no Critical/Important). **242 unit + 19 e2e green; 161.65 KB gz.**

**What's new in the game:**
- **The campaign:** floors 1–9 ramp (more echoes, more beacons, tighter Chhaya — 7s → 4.6s), clear = walk the Stair Door → descend. Floor 5: **Taal** walks the corridors on the music's beat — a touch raises House Anger, never kills. Floor 10: **Dwaar I**, a handcrafted symmetric threshold hall; clear it → **✦ Truth-Shard I — Tier I complete**, with Play-again/Stay.
- **Saves, done right:** IndexedDB on-device (strictly validated, one-time migration from the old localStorage), debounced write-throughs with flushes at every irreversible moment, 💾 export / 📂 import as a single JSON file. Reload resumes mid-campaign.
- **Installable + offline:** manifest + lantern icon + a hand-rolled service worker — PROD offline reload proven in a real browser smoke.
- **नमस्ते:** full English/Hindi UI chrome (🌐 cycles; auto-detected; persisted) — 48 keys, parity-tested; Aaina's wisdom stays English until the content pass.
- Backlog: unified `◆ banked (+pending)` chip, pointer-lock releases when the map opens.

**Process record:** one stale dev-server process (left over from an implementer's verification) wedged the release-day e2e by hijacking port 5173 — detected via netstat, killed, clean 19/19. Four minors recorded for M5 (HeroMirror material leak, import-under-URL-seed, "six-second" copy holdovers, Dwaar re-clear farming — local-only). **The 5-strangers playtest gate is OPEN** — the one M4 criterion needing real humans.

**Live:** https://mirror-house-8fg.pages.dev (/, /manifest.webmanifest, /sw.js, /icon.svg all 200) · github.com/seolithdev01/mirror-house @ `m4`.

## Artifacts

- Commits `c6abaf7..4ae7b28` on main (9), tag `m4`
- New modules: `campaign`, `taal`, `save`; `ui/i18n`; `public/{manifest,icon,sw}`; STATE_MACHINES §11
