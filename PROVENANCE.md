# Provenance — Mirror House

Everything in this repository is original work, created for this project, or generated at runtime by its own code. **There are no third-party assets.**

## Code, art, audio — all original

| What | Where it comes from |
| --- | --- |
| Code | Written for this project. Licensed **Apache-2.0** (see [LICENSE](LICENSE)). |
| Art | **Procedural.** Every texture, palette, and mesh is generated in code at load time (`src/game/textures.ts`, `src/game/palette.ts`, `src/game/floorScene.ts`, `src/game/mirror.ts`, `src/game/avatar.ts`) — canvas-painted stone, silvered glass, the surveyor's silhouette. The one static image is `public/icon.svg`, the gold-lantern glyph, drawn for this project. No stock art, no AI-scraped packs, no image files beyond that glyph. |
| Audio | **Synthesized live in your browser** (`src/engine` audio): raga-inspired classical-fusion built from oscillators and noise at play time. Fully original composition-by-code — **no samples, no recordings, no third-party music**. It is silent until your first input (browser gesture policy) and follows the house's anger and pursuit. |
| Words | The FAQ, Aaina's dialogue, the lore, and the docs are original writing for this project. Licensed **CC-BY 4.0** alongside the art and audio. |

The mirrors, maze, and everything they reflect are seeded procedural generation: the same seed code always builds the same floors, deterministically, on your machine.

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

## Font

The game uses your operating system's built-in UI fonts (`system-ui`, `ui-monospace` in `index.html`). No web fonts are downloaded — there are no font files to trace.
