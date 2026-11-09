# step005 — state-machine refactor verified, completed, merged

| | |
|---|---|
| **Step** | continuation of the state-machines request (step004 archive covers the parallel session's landing; this records the controller-side verification + completion) |
| **Local time** | 2026-11-08 23:52:58 |
| **Status** | Complete — merged to `main` (tag `m2.2`), pushed, deployed live |

## Response record

Found 9 implicit machines (inventoried in-chat; the parallel step004 session's map records 8 — it folds input-acceptance into GamePhase, defensible). Executed as `refactor/explicit-state-machines`:

- **T1 (my dispatch):** `GamePhase` master machine in `floorRun.ts` — ready/running/failing/cleared as a discriminated union; `floorFailed`/`freezeUntil`/timer-pin hack deleted; fail-after-clear race unrepresentable; reviewed + approved.
- **T2–T4 (landed by a parallel step004 session mid-dispatch):** my T2 implementer detected the worktree mutating, wrote nothing, and verified instead. The parallel session had adopted my committed plan, improved it (single `Map<id, DoorAnim>` door truth vs the plan's Set+array), gated verbs behind the FAQ pause (stricter than plan), caught its own `hidden`-inversion bug via 5 existing e2e, and archived per convention.
- **Controller verification:** personally re-ran gates at every stage — 130/130 unit, 11/11 e2e, build clean.
- **Review gate on the foreign work:** found one Important defect — the new AX map + a code comment claimed captured beacons survive a floor reset (false: `resetFloor` re-inits the runtime) — plus a wrong Echo detail. Fixed by controller (exact reviewer-specified edits), plus meta-v1 look-alike row and a hedged test-count claim.
- **Sanctioned behavior deltas (4 total, all disclosed):** movement+verbs paused behind the FAQ; Chhaya hidden on cleared/failing; timer reads frozen value from `failedAt`; post-clear simulation halts (victory freeze — M4 adds the descend-to-next-floor flow).

## Artifacts

- `docs/STATE_MACHINES.md` — the canonical AX map (policy, 7 machines + transitions, look-alikes, adding-a-machine recipe)
- Spec §7.1 state-machine policy; README pointer
- Commits `9a79e00..e310488` on main, tag `m2.2`; live at mirror-house-8fg.pages.dev (200 OK)
