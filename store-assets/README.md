# Store assets — Mirror House

Everything here is **generated**: `npm run icons` (`scripts/gen-icons.mjs`) re-renders
the icon PNGs from `public/icon.svg`, `node scripts/gen-store-art.mjs` renders the
Play feature graphic, and `node scripts/gen-store-shots.mjs` rasterises the two
consoles' interim phone-screenshot sets from a PROD build — never edit the PNGs
by hand; edit the source (SVG / script copy) and re-run. The listing copy that
goes with these assets lives in
[`docs/STORE-LISTING.md`](../docs/STORE-LISTING.md); the upload runbook is
[`docs/BUILD-STORES.md`](../docs/BUILD-STORES.md).

## Manifest

| File                            | Size | Variant                                | Upload to                                         |
| ------------------------------- | ---- | -------------------------------------- | ------------------------------------------------- |
| `icon-512.png`                  | 512² | Solid rounded-square (night `#0b1026`) | **Play Console → App icon** (32-bit PNG w/ alpha) |
| `icon-512-transparent.png`      | 512² | Glyph on transparent (80% height)      | Compositing / iOS alternate                       |
| `icon-192.png` / `-transparent` | 192² | same two variants                      | PWA manifest scale / xxhdpi legacy reference      |
| `icon-180.png` / `-transparent` | 180² | same two variants                      | iOS apple-touch scale (when a Mac build happens)  |
| `icon-144.png` / `-transparent` | 144² | same two variants                      | xxhdpi legacy reference                           |
| `feature-graphic-1024x500.png`  | 1024×500 | Lantern + MIRROR HOUSE + yellow plate (24-bit RGB, no alpha) | **Play Console → Feature graphic** |
| `screenshots/play/*.png`        | 1080×1920 ×3 | Interim Playwright-device-emulation phone set (`play-01-start`, `play-02-maze`, `play-03-pause`) — **superseded by the real-emulator pass**. Opaque RGBA (PNG color type 6); Google's spec prefers 24-bit no-alpha (type 2) — if this interim set ever becomes the upload set, flatten first (a one-line compositor change in `scripts/gen-store-shots.mjs`) or expect the uploader's soft warning | **Play Console → Phone screenshots** |
| `screenshots/ios/*.png`         | 1290×2796 + 1170×2532, ×3 each | Interim emulation set for the 6.7"/6.1" App Store slots (see [`screenshots/ios/README.md`](screenshots/ios/README.md)) — refreshed from TestFlight before App Review | **App Store Connect → screenshots** |

The icon run also writes the launcher set into `android/app/src/main/res/mipmap-*`
(legacy `ic_launcher`/`ic_launcher_round` at 48/72/96/144/192 and the adaptive
`ic_launcher_foreground` at 108/162/216/324/432 — glyph at 60% height, inside
the 66/108 safe zone, over the `@color/ic_launcher_background` night indigo).

## Feature graphic — generated (`node scripts/gen-store-art.mjs`)

Play requires one 1024×500 feature graphic (JPEG or 24-bit PNG, **no alpha**) —
the script emits exactly that (24-bit RGB, opaque; the script asserts the
header). Composition, per the PoD boot-poster language:

- Background: night `#0b1026` (matches the icon backdrop).
- Subject: the lantern glyph from `icon.svg` (measured live, like the icons),
  large on the left third.
- Copy: `MIRROR HOUSE` in Big Shoulders Display cream, a yellow skew(-9°)
  plate reading `DESCEND · 100 FLOORS · ONE DOOR`, and Mukta small print
  `free · no ads · your save stays on your device`.
- All text/ink keeps the 10% margin — Play crops and zooms this graphic for
  the video-preview thumbnail.

One honest review note: Google's asset guidance discourages pricing/badge text
("free") on feature graphics. The small print is a deliberate, truthful choice
(it is the app's actual promise); if Play review ever objects, delete the
`.fine` block in `scripts/gen-store-art.mjs` and re-run — one line.
