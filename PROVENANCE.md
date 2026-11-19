# Provenance — Mirror House

Everything in this repository is original work, created for this project, or generated at runtime by its own code — with one deliberate exception: the two self-hosted UI font families (see **Fonts** below), permissively licensed under the SIL Open Font License and committed unmodified. **There are no third-party game assets.**

## Code, art, audio — all original

| What | Where it comes from |
| --- | --- |
| Code | Written for this project. Licensed **Apache-2.0** (see [LICENSE](LICENSE)). |
| Art | **Procedural.** Every texture, palette, and mesh is generated in code at load time (`src/game/textures.ts`, `src/game/palette.ts`, `src/game/floorScene.ts`, `src/game/mirror.ts`, `src/game/avatar.ts`) — canvas-painted stone, silvered glass, the surveyor's silhouette. The only static images are the gold-lantern glyph itself, drawn for this project — `public/icon.svg`, and `public/og-image.png` (the share-card PNG, a committed copy of `store-assets/icon-512.png` rendered from the same glyph; step007). No stock art, no AI-scraped packs, no image files beyond that glyph. |
| Audio | **Synthesized live in your browser** (`src/engine` audio): raga-inspired classical-fusion built from oscillators and noise at play time. Fully original composition-by-code — **no samples, no recordings, no third-party music**. It is silent until your first input (browser gesture policy) and follows the house's anger and pursuit. |
| Words | The FAQ, Aaina's dialogue, the lore, and the docs are original writing for this project. Licensed **CC-BY 4.0** alongside the art and audio. |

The mirrors, maze, and everything they reflect are seeded procedural generation: the same seed code always builds the same floors, deterministically, on your machine.

The one server component is ours too: the same-origin feedback POST (`functions/api/feedback.ts`, sharing the `src/game/feedbackNet.ts` wire contract with the client) is written for this project like every other line of code, and the reports it stores land in this project's own **private** R2 bucket — no third-party service ever sees them.

## Venue packs (M6)

`public/venues/*.json` are **venue packs** — optional, versioned side-floors (a sponsored café floor, a shop hall) validated strictly by `src/game/venue.ts` before anything loads them. Two rules keep this table honest:

- **The DEMO pack is fiction.** `public/venues/demo-glasshouse-cafe.json` ("Glasshouse Café — DEMO") names no real business. Its name, taglines, and colors are original to this project and the DEMO label ships in-game (banner + settings card). No venue pack may imply an endorsement that does not exist.
- **Real venues need permission first.** A pack naming a real business, brand, or trademark may ship only with that venue's **written trademark/usage permission on file** (checked before merge, held by the project owner). Until a grant exists, packs stay fictional or the DEMO. Trademark law, not courtesy: names, logos, and trade dress belong to their owners.

Packs never merge into the core game: they live under `public/venues/`, load only through the strict validator, and a venue floor never touches campaign progress, bests, or shard banking (a side-excursion with its own daily seed — the game says so on the banner).

## Dependencies

One runtime dependency and a small toolchain. Versions are the pinned ranges from `package.json`; licenses read from the installed packages.

| Package | Version | Role | License |
| --- | --- | --- | --- |
| `three` | ^0.187.0 | WebGL renderer (the only runtime dependency) | MIT |
| `vite` | ^8.3.6 | Dev server + production bundler | MIT |
| `vitest` | ^5.1.0 | Unit test runner | MIT |
| `@playwright/test` | ^1.65.0 | End-to-end tests | **Apache-2.0** |
| `eslint` | ^10.14.0 | Lint | MIT |
| `typescript-eslint` | ^8.72.1 | ESLint rules for TypeScript | MIT |
| `prettier` | ^3.9.10 | Formatter | MIT |
| `typescript` | ^6.0.3 | Type-checker | **Apache-2.0** |
| `@types/three` | ^0.187.0 | Type definitions for three | MIT |
| `@types/node` | ^26.6 | Type definitions for node (e2e/soak scripts) | MIT |

Note: the toolchain is not "all MIT" — Playwright and TypeScript are Apache-2.0, per their own package manifests. Both are dev-only (they never ship in the game bundle); the only code that reaches your browser besides our own is `three`, which is MIT.

## Fonts

ui-pod re-dressed the UI chrome in the design language of our sibling project People of Delhi, which means self-hosted type for the first time. Both families are licensed under the **SIL Open Font License 1.1** (free for any use, including commercial, redistribution, and bundling — no attribution required inside the product, given here as good practice) and were fetched as static woff2 subsets from Google Fonts, then committed to `public/fonts/` and precached by the service worker. **No font is loaded remotely** — the CSP allows `font-src 'self'` only.

| Family | Weights | Subsets | Foundry | License | Files |
| --- | --- | --- | --- | --- | --- |
| **Big Shoulders Display** | 700 / 800 / 900 | latin | Tyler Finck / Etcetera Type Co (via Google Fonts) | SIL OFL 1.1 | `bsd-latin.woff2` (one variable latin file; each `@font-face` pins a weight, exactly as Google's own css2 serves it) |
| **Mukta** | 400 / 500 / 600 / 700 / 800 | latin, latin-ext, devanagari | Indian Type Foundry (via Google Fonts) | SIL OFL 1.1 | `mukta-{weight}-{latin,latin-ext,devanagari}.woff2` (15 files; unicode-range per subset) |

The `unicode-range` descriptors are copied verbatim from Google Fonts' css2 output; the woff2 binaries are unmodified copies of the files Google served (v24 of Big Shoulders Display, v17 of Mukta, fetched 2026-11-16). Mukta's devanagari subset is what renders the Hindi UI chrome in the house's own type. The dev diagnostics and feedback textarea keep the operating system's `ui-monospace` — no font files beyond the two families above.
