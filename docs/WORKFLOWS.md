<!-- SPDX-License-Identifier: Apache-2.0 -->

# Workflows — the state model in motion

The normative registry of every machine lives in [STATE_MACHINES.md](STATE_MACHINES.md).
This document is the *motion* picture: how those machines chain together into the
end-to-end journeys a player (and the house) actually walks. Mermaid renders natively
on GitHub; [atlas.html](atlas.html) renders the same model animated.

---

## 1. Session workflow — open → play → leave → return

```mermaid
flowchart TD
    A[open URL] --> B{stored save in IDB?}
    B -- no --> C[defaultSave\nrandom seed · floor 1]
    B -- yes --> D[normalizeSave\nresume campaign + settings]
    B -- v1 meta --> E[migrate once\nlocalStorage untouched]
    C --> F[buildFloor\nseed · tier dressing]
    D --> F
    E --> F
    F --> G{URL overrides?}
    G -- seed/look/lang/perf/venue/test --> H[apply for session]
    G -- none --> I[phase: READY]
    H --> I
    I --> J[first input\nnoise ring arms · timer arms]
    J --> K[THE FLOOR LOOP]
```

The boot chain is `(await idbGet()) ?? migrateFromMetaV1() ?? defaultSave()` — the
order is the whole policy: IDB is truth, v1 migration is one-time and leaves
localStorage untouched, defaults are the floor. URL parameters win over the save
for this session only.

---

## 2. The floor loop — the master machine

`GamePhase` (owner: `src/game/floorRun.ts`) is the machine every other system reads.

```mermaid
stateDiagram-v2
    [*] --> ready
    ready --> running : first input\n(startRun — timer + noise arm)
    running --> cleared : all beacons + exit\n(clearRun — awards bank)
    running --> failing : contact ∨ anger 100\n(failRun — freeze 1.2 s)
    failing --> ready : tickFail ≥ resetAt\n(resetFloor — same seed,\nattempts+1, pending forfeited)
    cleared --> [*] : descend overlay →\nnext floor (or finale @100)
    note right of running
        Sim systems live here:
        Echoes · Chhaya · Taal · Gher ·
        Aavart · Glazier(100) · decoys ·
        water · noise ring · anger
    end note
    note right of cleared
        Dwaar floors cascade shard
        interstitials; floor 100 →
        THE GROUND DOOR finale
        (terminal — descend no-op)
    end note
    note right of failing
        Pending beacon shards are
        FORFEITED on reset; banked
        shards survive. Ice re-freezes,
        water drains, noise ring empties.
    end note
```

**Workflow rules the diagram implies**

| Rule | Where |
|------|-------|
| Movement, senses, contact, noise — everything — is gated on `active(phase)` (ready ∥ running) | `main.ts` sim gate |
| A same-frame fail+clear cannot happen: `clearRun` on a failed phase is a no-op returning the same reference | `floorRun.ts` (pinned by reference-identity test) |
| The timer, and therefore the Tier-5 water, is pinned to `failedAt`/`clearedAt` — the HUD clock can never tick on a corpse | `floorRun.ts:runElapsedMs` |
| Reset is same-seed by design: the maze is knowledge, and knowledge is the game | `main.ts:resetFloor` |

---

## 3. Mirror-pane workflow — the verb, per tier

`MirrorVisual` (owner: `src/game/frost.ts`) is the pane-level machine. The *verb*
routing differs by tier:

```mermaid
stateDiagram-v2
    state tier1to7 <<choice>>
    state tier8 <<choice>>
    [*] --> clear : tiers 1–7 spawn
    [*] --> frozen : Tier 8 spawns (71–80)
    clear --> fogged : F (25 s · 12.5 s in heat)
    fogged --> clear : expiry
    frozen --> thawed : F (breath thaws —\nPERMANENT for the attempt)
    thawed --> frozen : never (cold fog ≠ ice)
    frozen --> fogged : never (can't fog ice)
    thawed --> fogged : F (cold fog — COLD_FOG_MS 600 s)
    fogged --> thawed : never
    clear --> captured : beacon capture\n(+5 shards · unlocks exit)
```

**Workflow consequences**

| Tier | The F verb means | The economy |
|------|------------------|-------------|
| 1–7 (glass) | fog → eye closes 25 s (12.5 s in heat) | fog is temporary cover |
| 8 (frozen) | frozen → **thaw** = live eye + 10 m lure; thawed → **fog** = permanent blind | every pane is a switch you set once |
| 9 (apex) | heat returns AND glass spawns clear | fog evaporates in 12.5 s while all four hunt |

Captured beacons are terminal (unlocks the exit); true mirrors are never frostable;
silvered doors and the water pools have their own machines (DoorPhase; ripple TTL).

---

## 4. The descent workflow — 100 floors, three acts

`Campaign` (owner: `src/game/campaign.ts`) is pure data + three transitions.

```mermaid
flowchart TD
    subgraph ACT1["ACT I — THE TRAP (1–40)"]
        F1[floor 1 · Glass Gallery\n2 beacons · Chhaya] --> Fx[...]
        Fx --> F10[Dwaar I · 10\n✦ Shard I]
    end
    F10 --> F11[floor 11 · Taal joins]
    Fx2[...] --> F20[Dwaar II · 20\n✦ Shard II · Gher duet]
    subgraph ACT2["ACT II — THE DECEPTION (41–80)"]
        F41[floor 41 · decoys begin\nthe house copies you]
        Fx3[...] --> F50[Dwaar V · 50\nall-four preview]
        F61[floor 61 · water silence\nTaal rests 51–65]
        F66[floor 66 · Taal returns\nthe beat in the silence]
        F71[floor 71 · Aavart thaws\nfrozen atrium]
        F80[Dwaar VIII · 80\nall-four crucible]
    end
    F80 --> F81[floor 81 · ACT III banner\nTHE GROUND DOOR]
    subgraph ACT3["ACT III — THE GROUND DOOR (81–100)"]
        F81b[floor 81 · all four hunt\nheat + pools + panes]
        Fx4[...] --> F90[Dwaar IX · 90\nthe warden's own warren]
        F91[floor 91 · the Foundations\nNO MIRRORS · Chhaya alone]
        F100[floor 100 · THE GROUND\nthe Glazier hunts]
    end
    F100 --> DOOR["THE GROUND DOOR OPENS\nOne hundred floors. One door.\nYou walked out."]
    DOOR --> TERMINAL[terminal — descend is a no-op]
```

**Sentinel rotation (shipped gates, `campaign.ts` presence fns)**

| Warden | Walks | Rests |
|--------|-------|-------|
| Chhaya | 1–100 | never |
| Taal | 11–50 · 66–70 · 80–90 | 51–65 · 71–79 · 91–100 |
| Gher | 21–40 · 50–60 · 70 · 81–90 | 1–20 · 41–49 · 61–69 · 91–100 |
| Aavart | 31–40 · 50–60 · 71–90 | 1–30 · 41–49 · 61–70 · 91–100 |
| Decoys (the house) | 41–90 | 1–40 · 91–100 |
| The Glazier | 100 | 1–99 |

---

## 5. Persistence workflow — mutate → debounce → flush

```mermaid
flowchart LR
    M[any mutating action\nmode · mute · look · hint buy\nclear · descend · tier · playAgain] --> P[persist()\ndebounce 250 ms]
    P --> W[(IndexedDB\nsave v2 — validated on read)]
    M -- irreversible:\nclear · descend · tier\nimport · playAgain · daily --> PF[persist flush\nimmediate write]
    IMP[📂 import] --> V[validateSave strict] -- valid --> W2[(IDB put)] --> R[location.pathname reload]
    V -- invalid --> RJ[refused — never executed]
    EXP[💾 export] --> F[single JSON file\nplayer-owned]
```

The old `localStorage` meta v1 is migrated **once**, left untouched forever after,
and only read when IDB is empty — the ordered chain is the whole compatibility story.

---

## 6. Venue excursion workflow — a floor that never touches the campaign

```mermaid
flowchart TD
    S[⚙ → Floors · or ?venue=] --> L[load + validateVenuePack strict]
    L --> B[buildFloor with pack dressing\ncampaign floor FROZEN behind the excursion]
    B --> P[play — pack params, accent dressing\nno bests · no shard banking · no descend]
    P -- reach exit --> R[return → campaign floor rebuilds\nat the same number, fresh]
    P -- ⚙ return --> R
    R --> C[campaign resumes exactly as left]
```

Heat is explicitly gated out of venues (`heatActiveFloor() = venue === null && heatOn(...)`)
— the demo is dressed tier-one and stays tier-one, whatever the campaign floor.

---

## 7. Feedback workflow — the player owns the send

```mermaid
flowchart LR
    P[📮 in game] --> C[pick Bug / Suggestion / Love]
    C --> D[textarea prefilled with\ndiagnostics — player reviews]
    D -- Open GitHub issue --> G[github.com/.../issues/new\ntemplate + labels]
    D -- Email instead --> M[mailto support alias]
    D -- close --> X[nothing sent — ever]
```

Nothing auto-sends. The diagnostics block contains game state only (version, seed,
floor, quality, language, error ring) — no personal data beyond the player agent.

---

*Normative machine registry: [STATE_MACHINES.md](STATE_MACHINES.md). Catalog:
[USE-CASES.md](USE-CASES.md). Animated: [atlas.html](atlas.html).*
