# UI reskin — People of Delhi language (merged, live)

| | |
|---|---|
| **Step** | UI/UX milestone (user: "I want the ui/ux from http://peopleofdelhi.com/") |
| **Local time** | 2026-11-16 10:19:56 |
| **Status** | Complete — merged to `main` (tag `beta.2`, v0.2.0-beta.2), pushed, deployed live on both URLs |

## Request (verbatim)

> I want the ui/ux from http://peopleofdelhi.com/

## Response

The People-of-Delhi design language (the sibling Three.js project, same owner) extracted from its shipped CSS and applied to Mirror House's UI chrome — the scene keeps its tier palettes; the frame around it is re-dressed as an Indian street-poster.

**Shipped (5 commits + review-fix commit, 975 unit + 48 e2e):**
- **Boot poster** — once per session: yellow `MIRROR` kicker → giant cream `HOUSE` → tagline (now localized en/hi), auto-fades, never blocks input, skipped under `?test=1`
- **District plate HUD** — floor chip becomes the PoD plate: kicker + big display number + tier area label, 5px accent border, skew(-9°)
- **Keys bar** bottom-left (`WASD` · `F` · `V` · `I` · `H` · `M`, fed live from the keymap — rebinds update it) · **action dock** bottom-right
- **Panels re-dressed** — ink plates, border-top accent, slide-in, backdrop blur; yellow primary buttons with hard shadows; flat yellow-active tabs
- **Self-hosted fonts** — Big Shoulders Display + Mukta (Devanagari-native: the Hindi chrome finally gets proper type), 16 woff2 subsets, `font-display: swap`, SW-precached, `/fonts/*` immutable headers, OFL texts committed; **zero remote loads** — CSP and the privacy promise intact (grep-proven: no googleapis/gstatic in the bundle)
- **Atlas** moved to `/atlas.html` on-site, re-themed, offline-reachable (SW fallback fixed after review)
- v0.2.0-beta.2, SW `mh-v6`, PROVENANCE fonts note (SIL OFL), vignette overlay

**Process:** final review verdict merge-yes with one Important (atlas precache unreachable offline — SW fallback fixed) + four minors (OFL texts committed, boot tagline localized, view chip re-inerted). All landed with a live offline probe before merge.

**Live:** https://mirror-house.seolith.com · https://mirror-house-8fg.pages.dev (both 200) · github.com/seolithdev01/mirror-house @ `beta.2`.

## Artifacts

- Commits `34bd0c5..eb8bac1` + `eb8bac1..main` on main, tag `beta.2`
- `public/fonts/` (16 woff2 + 2 OFL), `public/atlas.html` + `atlas.js`, SW `mh-v6`, boot overlay component
