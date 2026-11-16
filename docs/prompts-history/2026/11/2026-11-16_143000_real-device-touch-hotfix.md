# Real-device touch hotfix — beta.3 (merged, live)

| | |
|---|---|
| **Step** | Hotfix (user, on an actual phone: "ON THE ACTUAL mobile still touch is not correctly working and the UI is blocked") |
| **Local time** | 2026-11-16 14:30 |
| **Status** | Complete — merged to `main` (tag `beta.3`, v0.2.0-beta.3), deployed live |

## Request (verbatim)

> ON THE ACTUAL mobile still touch is not correctly working and the UI is blocked

## Response

The exact failure class the final reviewer predicted: emulation dispatches pointer events at `window` and bypasses element hit-testing + browser gesture handling entirely — a real phone does neither.

**Root cause (from the shipped code):** `touch-action: none` was only on `#game`. Real touches hit-test to the topmost element — the stick ring, `#ui` children, plates — none of which had it, so the browser claimed each drag for scrolling and fired `pointercancel` a few pixels in (stick dies mid-drag), and consumed gestures never synthesized clicks (dock taps dead → "UI blocked"). Long-press callouts/selection stole touches too.

**Hotfix (2 commits: `49f71b4` + `45a41d4`, tag `beta.3`, v0.2.0-beta.3, SW mh-v7):**
1. Gesture-kill blanket: `touch-action: none` on html/body + the game surface + HUD chrome (adapted to real ids); scrollable panels keep `pan-y`; buttons keep `manipulation` (tap→click intact); `user-select`/`-webkit-touch-callout` killed on the app surface.
2. Stick visual mirror set `pointer-events: none` (input lives on the window collector — the DOM never intercepts).
3. `?diag=1` touch diagnostics overlay (prod-usable): live last-10 pointer events (type/pointerType/x/y/target), resolved input mode, coarse-pointer + compact state — the ground-truth tool on the actual phone.
4. SW_CACHE `mh-v7` + version bump so phones receive the fix past their cached shell.

**Verified:** 1056/1056 unit, 53/53 e2e, `elementFromPoint` chain all `touch-action: none`, HUD-button wobble → heading drift exactly 0, diag overlay live, `sw.js` shows v7.

## What the user should do on the phone

1. Open the site, wait ~5 s (new service worker installs in the background), then **reload once more** (or clear site data for the domain) — the old cached shell must be replaced.
2. Play. If ANYTHING is still off, add **`?diag=1`** to the URL and try touching — the on-screen panel logs every pointer event live; send a screenshot and that's the exact ground truth.

## Artifacts

- Commits `49f71b4`, `45a41d4` on main, tag `beta.3`, deployed (both URLs 200)
