# step001 (review) — Wolfenstein 3D / Prince of Persia lineage + decisions locked

| | |
|---|---|
| **Step** | #step001 (review continuation) |
| **Local time** | 2026-11-08 09:53:26 |
| **Status** | Resolved — lineage folded into spec; all four decisions answered and locked |

## Request (verbatim)

> I was away and am back.. I was thinking more like Wolfeinstein 3D like play if it is different from Doom and also the original Prince of Persia like effects/play.. What were you questions?

## Response

**Wolfenstein 3D vs DOOM:** Wolf3D is a *flat grid maze* — every wall the same height, axis-aligned corridors, no stairs/jumping/vertical look, pure fast strafe-run, plus push-wall secrets. DOOM is *architecture* — variable room heights, stairs, angled walls, lighting-driven ambushes. Wolf3D-style fits Mirror House better than the DOOM-ish framing: floors are already deterministic grid mazes, flat uniform-height corridors render cheap (mobile), and push-walls become **silvered doors** (secret mirror-doors that frost unevenly — their tell).

**Prince of Persia (1989) contributes three things:** (1) deliberate weight — stance system (sprint/walk/creep/careful-step with auto edge-stop) and committed verbs (frost breath wind-up, uncancellable True-Mirror step); (2) timed trap gauntlets, in glass — beat-synced swinging blades, pressure-crack floors that fracture under sprint, frost-jammable guillotine mirror doors, pendulum shard chimes as Echo lures; (3) the shadow-through-the-mirror motif — already in the design as Chhaya (replays your past path) and Act II mirror-you decoys; now declared as lineage. Blend in one line: *arcade feet (Wolf3D), deliberate hands (PoP)*. IP hygiene unchanged: mechanics only, never names/characters/art.

**Spec updated (8 places):** genre line; silvered doors in mirror table; Chhaya lineage note; new §4.7 "Movement & trap language"; render-budget note (Wolfenstein-constrained geometry); §11.1 lineage bullet; §12 anti-list row (platforming cut); §13.1 beta scope (silvered doors + one trap family).

**The four questions were re-presented and answered:**

| Question | Answer |
|---|---|
| License | **Apache-2.0 code + CC-BY 4.0 assets** (was MIT default → swapped LICENSE, README, §0, §11.3) |
| Beta target | **Web + Android + iOS stores** via Capacitor (was PWA-only → new milestone M6, ~13-week plan, store-account prerequisites documented; web beta at M5 never waits on store review) |
| Monetization | **Venue pilot inside beta** — one real local venture's sponsored floor ships in beta (partner signed by M3; pack is optional so beta launches regardless; recruit 2 candidates by M2) |
| Music | **Procedural synth score** (default kept) |

## Artifacts

- Spec updated: `docs/superpowers/specs/2026-11-08-mirror-house-design.md` (§0 decisions locked; §4.7, §8, §9, §11, §12, §13, §14 updated)
- `LICENSE` → Apache-2.0; `README.md` license section updated
- Commit: `feat(step001): lock decisions (Apache-2.0, stores+venue beta), fold in Wolf3D/PoP lineage`
