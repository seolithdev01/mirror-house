# step001 — Mirror House brief → design blueprint

| | |
|---|---|
| **Step** | #step001 |
| **Local time** | 2026-11-08 09:19:43 |
| **Status** | Response delivered; spec awaiting user review |

## Request (verbatim)

> Initialize Git if not already done so. Save every request and response in a date time stamped markdown file inside prompts-history directory inside docs directory and keep them organized in an hierarchical year month folder structure after consolidation every new month. #step001 Mirror House is a 100 Storied building where each and every floor is a 3D room with well defined maze with zombies and surprise NPC's who obstruct like inky, blinky, chinky and clyde with their own pace allowing active player to escape with thoughtfulness which eventually get's tougher as they level up every 10 levels. The play and interactively should be an RPG like DOOM with maps and views allowed to view the whole floor in one view, the current front view, the left view, right view, back view in different view ports. The sound and music should be original and should have an A R Rahman'ish touch. The user can be dropped on level 1 which is the top most level and they must proceed to capture/defeat various objectives in a house full of mirror which will cause reflections/confusion/delusions and deceptions which has to be tactically and strategically overcome without collapsing mirrors but somehow turning off reflections where need to get enemies confused and fall in trap and get stuck while they move out to the end zone and escape the room. This is a escape room, puzzle like adventure which in future should tie up with various local ventures. The game play should be snappy, intuitive, effective with an helper NPC character which will allow interactivity and answer some questions based on level of the players and points gather. Before Implementing come up with a back story arc, purpose, difficulties, UX/UI, cross platform ability, monetization, security, compliance without infringing on any existing IP. The game will be open source and completely hosted on cloud flare pages with all data for each user saved on their devices. Think through completely what will work and what will not. Prepare for a beta launch after the plan. Guide me.

## Decisions defaulted (no answers received to the clarifying questions; all overridable)

1. **License:** MIT (code) + CC-BY 4.0 (assets)
2. **Beta platform:** Web PWA only, on Cloudflare Pages
3. **Monetization lead:** Donations first; venue-floor pack format designed in from day one
4. **Music at beta:** Procedural synth score via Web Audio (fully original)

## Response

**step001 complete — the blueprint is ready for your review.**

Git was initialized fresh on `main` (the directory was empty; the parent workspace repo is unrelated). This exchange is being archived per your convention, and the convention itself is documented so every future step follows it automatically.

**The game in one breath:** you are the Surveyor, trapped on the roof of a 100-storey, 100-year-old palace of mirrors. You descend floor by floor (level 1 = top). Your only weapon is the **Frost Lantern** — you don't break mirrors, you *fog* them: a fogged mirror reflects nothing, so enemies that see through glass go blind, wander into fully-fogged "mirror boxes," and get stuck. **Aaina**, a truth-telling shard-spirit in your lantern, is the helper NPC — she answers questions and sells hints for **shards** (points), with deeper answers unlocking as your mastery level rises. Four **Sentinels** — Chhaya (shadows your past path), Taal (moves on the music's beat), Gher (seals your exits), Aavart (predicts and ambushes) — escalate every 10 floors through ten themed tiers, from the Glass Gallery down to the mirrorless Foundations. Views: FOCUS, QUAD (front/left/right/back), OVERHEAD tactical map, and a paused TACTICAL mode. Audio is a fully original, live-generated Indian classical-fusion score (raga-mood per tier, tabla-style percussion that Taal literally patrols to). All IP-distant: original names, original designs, no samples, no borrowed melodies — "inspired-by idioms, never imitations."

**What won't work is as load-bearing as what will** — 12 explicit cuts with replacements (§12 of the spec): no 100 handcrafted floors (seeded archetypes + 10 handcrafted threshold halls), no everywhere-planar reflections (hero-mirror portals + cheap fakes; fogging makes rendering *cheaper*), no full-res quad viewports on mobile (half-res alternate frames; the overhead map is 2D), no LLM helper or accounts or telemetry at beta (offline/local promise), no native stores at beta (PWA), no breaking mirrors (collapse is a fail-state, frost is the only attack).

**Beta = Tier 1 (floors 1–10 + first threshold duel), ~10 part-time weeks, milestones M0–M5**, deployed on Cloudflare Pages with device-local saves and file export/import.

## Artifacts

- [`docs/superpowers/specs/2026-11-08-mirror-house-design.md`](../../superpowers/specs/2026-11-08-mirror-house-design.md) — full design & product blueprint
- [`docs/prompts-history/README.md`](../README.md) — the archiving convention (incl. monthly consolidation rule)
- [`README.md`](../../../README.md) — repo overview, step convention, license split
- [`LICENSE`](../../../LICENSE) — MIT (step001 default, overridable)
- [`.gitignore`](../../../.gitignore)
- Initial commit: `feat(step001): blueprint, repo init, prompts-history convention`
