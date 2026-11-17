# T12b — Device detection ladder (merged, live)

| | |
|---|---|
| **Step** | Device auto-detect milestone (user: "I want the app to detect what device it is and switch to default touch for mobile/ipad/tablet and touchscreen devices, second keyboard and thirdly mouse.") |
| **Local time** | 2026-11-12 21:35:09 (t12b merged; carried through the atlas + touch milestone sessions) |
| **Status** | Complete — merged to `main` (tag `t12b`), pushed, deployed live |

## Request (verbatim)

> I want the app to detect what device it is and switch to default touch for mobile/ipad/tablet and touchscreen devices, second keyboard and thirdly mouse.

## Response

The device-detection ladder shipped (2 commits + docs, final review: **merge-yes, zero Critical/Important** — "the save contract is the best-defended piece of the codebase"). **1070 unit + 54 e2e.**

**Shipped:**
- **Boot detection ladder** (`detectMode(DeviceSignals)`, pure, 16-row truth table): `touchCapable` (maxTouchPoints > 0) → **touch** — phones, tablets, iPads with keyboards, touchscreen desktops: the touchscreen wins per the priority order; everything else → **hybrid** (keyboard movement + mouse look — "keyboard second, mouse third" means the desktop owns the pair; hybrid IS keyboard+mouse). Pure 'keyboard'/'mouse' stay one ⚙ tap away; a mouse-only kiosk is undetectable and documented honestly.
- **First-input lock** — on a fresh save (no stored mode), the first modality that actually fires locks the choice and persists: a tap locks touch, a keypress locks hybrid (keeping mouse look alive — not the keys-only mode), mouse events never lock (they prove nothing). Stored modes always win — zero save wipes.
- **README/FAQ/TEST-CASES** document the ladder; the m4-era chip assertions reverted to hybrid and pass unchanged.
- Carried through this branch: the full t12 touch milestone (see its own archive) and the gesture-hardening fixes.

**Process:** the implementer corrected the controller twice — the two-arm ladder's desktop arm first shipped 'keyboard' (killing mouse-look on fresh desktops; controller-corrected to hybrid with byte-identical e2e legs passing), and the plan's own truth-table rows contradicted its formulas (resolved per the formulas + design intent, ratified). The final review re-ran all gates and verified the t12 gesture fixes at HEAD.

**Live:** https://mirror-house.seolith.com (200 OK) · github.com/seolithdev01/mirror-house @ `t12b`.

## Artifacts

- Commits `ee02157..ba10b8c` on main, tag `t12b`
- Modified: input.ts (DeviceSignals/detectMode/lock reducer), main.ts (signals + lock wiring + persist), smoke.spec (chip assertions), docs
