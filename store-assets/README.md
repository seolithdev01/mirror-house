# Store assets — Mirror House

Everything here is **generated**: `npm run icons` (`scripts/gen-icons.mjs`) re-renders
all PNGs from `public/icon.svg` — never edit the PNGs by hand; edit the SVG and
re-run. The listing copy that goes with these assets lives in
[`docs/STORE-LISTING.md`](../docs/STORE-LISTING.md); the upload runbook is
[`docs/BUILD-STORES.md`](../docs/BUILD-STORES.md).

## Manifest

| File                            | Size | Variant                                | Upload to                                         |
| ------------------------------- | ---- | -------------------------------------- | ------------------------------------------------- |
| `icon-512.png`                  | 512² | Solid rounded-square (night `#0b1026`) | **Play Console → App icon** (32-bit PNG w/ alpha) |
| `icon-512-transparent.png`      | 512² | Glyph on transparent (80% height)      | Compositing / feature graphic / iOS alternate     |
| `icon-192.png` / `-transparent` | 192² | same two variants                      | PWA manifest scale / xxhdpi legacy reference      |
| `icon-180.png` / `-transparent` | 180² | same two variants                      | iOS apple-touch scale (when a Mac build happens)  |
| `icon-144.png` / `-transparent` | 144² | same two variants                      | xxhdpi legacy reference                           |

The same run writes the launcher set into `android/app/src/main/res/mipmap-*`
(legacy `ic_launcher`/`ic_launcher_round` at 48/72/96/144/192 and the adaptive
`ic_launcher_foreground` at 108/162/216/324/432 — glyph at 60% height, inside
the 66/108 safe zone, over the `@color/ic_launcher_background` night indigo).

## Feature graphic — NOT generated, notes for the 1024×500

Play requires one 1024×500 feature graphic (JPEG or 24-bit PNG, **no alpha**).
Recipe:

- Background: flat night `#0b1026` (matches the icon backdrop).
- Subject: the lantern glyph from `icon-512-transparent.png`, placed
  centre-left, ~70–80% of the 500px height.
- Copy, right of the lantern: `Frost the mirrors. Outrun your shadow.`
  (Hindi variant for the hi listing: `आईने बर्फ़ करो। छाया से आगे निकलो।`)
- Keep all text/ink inside a 10% margin — Play crops and zooms this graphic
  for the video-preview thumbnail.
- No badge text ("free", "download"), no store logos — Play rejects those.
