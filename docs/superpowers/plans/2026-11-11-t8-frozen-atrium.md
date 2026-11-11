# T8: Frozen Atrium — Floors 71–80, Pre-Fogged Mirrors, Thaw-to-Lure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tier 8 per spec §4.6 row 8: floors 71–80 — **every standing/beacon mirror arrives pre-fogged (frozen)**, inverting the campaign's oldest tool: frost now THAWS frozen glass, and a thawed pane becomes a live Echo eye **plus a lure** — wardens within radius walk to the thawed glass and stand watching it. Thaw to pull guards off your route; leave glass frozen to keep corridors blind. Aavart returns from rest (Chhaya + Aavart walk the Atrium; Taal/Gher rest), the ice palette + austere suspended scale with a cold string voice, Dwaar VIII at floor 80 (all four in the frozen atrium), `✦ Truth-Shard VIII`.

**Architecture:** The proven tier pattern: campaign to 80 (+`DWAAR_VIII_LAYOUT` atrium — grand central ring + radial galleries); `MirrorRuntime` gains `frozen: boolean` (tier-8 spawn state; frozen renders frost-white, eye-blind like fogged); `applyFog` on frozen = THAW (permanent for the attempt: frozen=false, foggedUntil=null, thawed=true → eye ON + lure event); applyFog on thawed = fog (foggedUntil = now + 600000 — cold fog never meaningfully expires); `mirrorVisual` adds 'thawed' (clear). Lure: thaw emits `lureAt(cell)` — echoes within `THAW_LURE_RADIUS = 10` get `patrolOverrideCell = mirrorCell` (walk there, linger; chase overrides; cleared on reset). Fog duration tier 8 = 600000 (cold holds). Rotation: Chhaya + Aavart walk 71–79; Dwaar VIII = all four.

**Tech Stack:** unchanged; zero new dependencies.

**Spec:** §4.6 row 8 (all mirrors pre-fogged — you unfog to lure), §4.4 (Aavart returns; row-9 apex stays tier 9), §2.3, §13.1.

## Global Constraints

- **BINDING (×6 held, ×7 now):** save validator widens to `TIER_EIGHT_FLOORS = 80` in the SAME commit as the ramp (pinning: 81 = first rejection; round-trips 75 + 80). Grep validators before declaring done.
- No-break: 777 unit + 42 e2e stay green (extended where specified); floors 1–70 unchanged except ratified: (a) Dwaar VII joins the interstitial cascade, (b) t7 minors rider in T4 (hearing-e2e drift-race hardening: raise pick margin to `bestD < 9` … it already is — instead re-verify patrol inside the wait loop; noiseChaseAnnounced per-attempt reset consistency ONE-LINE).
- Tier-8 ramp (71–80): echoes 4 all (Dwaar VIII 5); beacons 4; braid `0.38 + 0.004·(f−71)`; chhayaDelay `max(2600, 3200 − 60·(f−71))` (Dwaar VIII 2500); portraits/pools/distort/decoys/water/heat gates unchanged (pinned; frozen adds NO floorObjects draws).
- New constants: `TIER_EIGHT_FLOORS = 80`, `THAW_LURE_RADIUS = 10`, `COLD_FOG_MS = 600000`, `DWAAR_VIII chhayaDelay 2500` (ramp row).
- TS strict; zero `any`; SPDX; no Math.random; conventional commits `feat(t8)/test(t8)/docs(t8)`. PORT RULE: previews 4199.

---

### Task 1: Campaign to 80 — ramp, Dwaar VIII, validator

**Files:** `src/game/campaign.ts` (TIER_EIGHT_FLOORS, tierOf→8, isDwaar +80, ramp 71–80, `DWAAR_VIII_LAYOUT` 13×13 atrium — grand central ring (6×6 ring walls with 4 gaps) + 4 radial galleries to the corners, 180°-symmetric+connected, ~100 open), `src/game/save.ts` (→ 80 same commit + tests: 75/80 round-trip, 81 rejected), constants, main/hud (chips `L74 · T8` / `DWAAR VIII ✦`; `✦ Truth-Shard VIII claimed — Tier VIII complete` full screen; Dwaar VII cascades to interstitial), presence fns (rotation: taal `(11–50) || ≥60`? — current taal gate is `(11–50) || ≥66`; extend for tier 8: all-four at Dwaar VIII → `taalPresent (11–50) || f === 80`; gher `(21–40) || 50 || 80`; aavart `(31–40) || 50 || f >= 71` — Aavart returns; pins: 71→C+A (T,F,F,T), 79→same, 80→all T), tests (ramp 71–80; layout predicates; tierOf 8; validator; rotation rows 71/79/80 + 1–70 identical; descend-no-op-at-80).

- [ ] Tests → RED → implement → GREEN; gates + 42/42. Commit `feat(t8): campaign to floor 80 — frozen atrium, aavart returns, validator widened`.

---

### Task 2: Frozen/thaw — the inversion

**Files:** Modify `src/game/frost.ts` (`MirrorRuntime` + `frozen`/`thawed` flags; `mirrorVisual`: frozen → 'fogged', thawed → 'clear'; `applyFog(rt, id, now, thawMode?: boolean)`: frozen+thaw → {frozen=false, thawed=true, lure event}; thawed+fog → {foggedUntil = now + COLD_FOG_MS}; frozen + normal fog → no-op (can't fog ice)), `src/game/floorObjects.ts` (tier-8 spawn flag `frozenSpawn: boolean` on params — frost.ts init reads tier via a param `initMirrorRuntime(mirrors, opts?: { frozenSpawn?: boolean })` setting frozen=true on standing/portrait/distort — NOT beacons, NOT true), `src/game/echo.ts` (lure: `lureAt(cell, radius)` — echoes within THAW_LURE_RADIUS of a thaw event get `patrolOverrideCell = cell` until chase/resets; patrol arrival at override lingers), `src/game/mirror.ts` (frozen render: frost-white pane material; thawed: clear-glass base), `src/main.ts` (F verb routes: frozen → thaw; thawed → fog with COLD_FOG_MS; captured/fogged standing → refog normal), captions (`The ice gives way — the glass watches.` once per floor; lure caption none — discovery), Aaina hint `frozenNear` (floor ≥71): "The Atrium freezes every pane. Your breath thaws them — and thawed glass draws the wardens. Choose what they watch." (en/hi, orderings updated), tests (frozen spawn state; thaw transitions + lure emission; fog-after-thaw permanent; capture unaffected; visual states; tier gates: frozenSpawn only tier 8).

- [ ] Tests → RED → implement → GREEN; gates + 42/42. Commit `feat(t8): frozen atrium — thaw to lure, fog to blind`.

---

### Task 3: Ice palette + cold strings + e2e

**Files:** `src/game/palette.ts` (TIER_EIGHT_PALETTE: void 0x08101a, floorBase 0x14243a, floorLines 0x1e3450, teal→ice 0x9ad4e8, ivory 0xeef4fa, gold 0xd9a441, rose→frost-blue 0x6a9ac2, wallTop 0x7c96ac, wallBottom 0x31465c, lantern 0xd8f0ff, entrance 0x9ad4e8, exit 0xd9a441), `src/audio/theory.ts` (TIER_EIGHT_SCALE [0,2,5,7,10]), `src/audio/engine.ts` (`setVoice` map gains 'sawtooth' — cold strings; voiceByTier: {3: sine, 7: sine, 8: sawtooth}), main wiring, hook (`tier()`→8), e2e 42→44: (a) `t8: floor 71 loads the atrium frozen` — `?seed=T8RUN&floor=71` → tier 8, chip `L71 · T8`, mirrors snapshot frozen count ≥ 4 (hook `mirrors()` gains `frozen: number`), frost on a frozen pane → thawed (mirrorVisual via hook `mirrorState(id)` additive or extend `mirrors()` entries), lure: an echo within radius walks to the pane (assert echoMode/position drifts toward pane); (b) `t8: aavart ambush returns` — warp onto avartPos → house().failed; frost the same pane → fogged (blind again).

- [ ] Tests → implement → e2e 44/44 → gates; live :4199 check (floor 71 ice look + thaw lure witnessed; floors 61/41/1 unchanged). Commit `feat(t8): ice palette, cold strings, tier-eight e2e`.

---

### Task 4: Close-out + t7 minors rider

**Files:** Spec §4.6 row 8 delivered + §4.4 rotation note (Aavart returns 71; Taal/Gher rest to Dwaar VIII); STATE_MACHINES (Campaign@80, mirror state machine extension: frozen/thawed row — mirrorVisual union grows, register), README (Tier 8), CHANGELOG `[t8]`, FAQ +2 (the Atrium; thaw-to-lure), plan ticks; **t7 minors rider:** hearing-e2e drift hardening (re-verify patrol inside the wait loop), noiseChaseAnnounced reset per-attempt (one line in resetFloor); full gates + 44/44; bundle check.

- [ ] Docs + rider → gates → commit `docs(t8): delivery marks, how to read the ice` + `fix(t8): t7 minors — patrol-verify in hearing e2e, warden-caption per attempt`.

## Plan Self-Review

Coverage vs §4.6 row 8: mechanic (pre-fogged; unfog-to-lure) ✓, mood (cold strings/ice palette) ✓, rotation (Aavart returns; Taal/Gher to Dwaar VIII) ✓, Dwaar VIII ✓. Validator binding honored T1 (×7). Types: `frozen`/`thawed` on MirrorRuntime consumed T2→T3; hook additive. Frozen spawn = flag not floorObjects draws (streams pinned). No placeholders.
