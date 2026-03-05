# PAX ROMANA Tracker (2026-03-05)

Single source of truth for one-by-one execution on branch `wip-q2-safe-rollout`.

## Rules

1. One change-set at a time.
2. Each change-set must include: feature flag, checks, rollback note.
3. Do not start the next change-set until current one is green.

## Change-Sets

| Change ID | Scope | Flag | Status | Validation | Rollback |
| --- | --- | --- | --- | --- | --- |
| S0-01 | Central rollout flag registry scaffold; wire existing `historyModelV2` default through registry (no behavior change expected) | `historyModelV2` | Completed | `npx tsc -b --pretty false`; `npm run test -- --run src/store.test.ts src/hooks/useFlowHistory.test.ts` | Revert `src/config/rolloutFlags.ts` and `src/store/defaults.ts` |
| S0-02 | Baseline execution checklist template and acceptance gate doc sync | N/A | Completed | Manual consistency check across plan/tracker/checklist docs | Revert tracker/doc updates |
| S0-03 | Snapshot baseline list for critical canvas states | N/A | Completed | `npm run test -- --run src/components/flow-canvas/flowCanvasTypes.test.ts`; docs consistency check | Revert snapshot additions |
| S1-01 | React Flow package migration prep audit and breaking-API checklist | `reactFlowV12Migration` | Todo | Typecheck + checklist review | Revert checklist/docs only |

## Activity Log

| Timestamp (IST) | Change ID | Note |
| --- | --- | --- |
| 2026-03-05 | S0-01 | Started rollout flag centralization with zero-feature-change intent. |
| 2026-03-05 | S0-01 | Completed: typecheck passed and targeted history/store tests passed (29/29). |
| 2026-03-05 | S0-02 | Added `PAX_CHANGESET_CHECKLIST_2026-03-05.md` and linked it from the safe execution plan. |
| 2026-03-05 | S0-03 | Added snapshot baseline matrix and node/edge registry inline snapshot tests. |
| 2026-03-05 | S0-03 | Completed: targeted canvas registry snapshot test passed (5/5). |
