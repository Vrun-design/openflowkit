const e=`# History Model Gap Analysis (Phase 1)

Date: 2026-03-03

## Objective

Identify gaps between current undo/redo implementation and Phase 1 goals:

- No undo/redo corruption in stress tests
- Deterministic limits by count and memory budget
- Stable behavior across tab switching and persistence

## Current Implementation Summary

- Runtime undo/redo state lives in \`useFlowHistory\` local hook state (\`past\`, \`future\`).
- \`FlowTab.history\` exists in types but is not the active source of truth for runtime history transitions.
- Global store persists \`tabs\`, \`activeTabId\`, and other settings via Zustand \`persist\`.
- Tab switching uses \`setActiveTabId\`, which saves current \`nodes/edges\` to current tab and loads target tab \`nodes/edges\`.

## Observed Gaps

1. Split-brain history ownership:
- Runtime history is hook-local.
- Tab model contains history fields but runtime logic does not consistently use them.
- Risk: history state can diverge from tab state, especially across route changes/remounts.

2. No explicit memory budget control:
- Count cap exists (\`MAX_HISTORY = 20\`), but no size-based trimming.
- Large snapshots can cause uneven memory pressure despite count cap.

3. Snapshot model is full-state only:
- Every history entry stores whole \`nodes/edges\`.
- Predictable but expensive; no patch/command compression.

4. Same-tab switch edge case in \`setActiveTabId\`:
- Calling \`setActiveTabId\` with the current id can re-save current canvas into tab before reload path.
- This can be a no-op in many flows, but is an avoidable risk and should be guarded.

5. Hydration/recovery path is implicit:
- Persisted \`tabs\`/\`activeTabId\` rehydrate, but canvas restoration behavior depends on call order.
- Recovery should be explicit and deterministic.

## Test Coverage Status (After P1-01..P1-04)

Covered:
- Undo/redo invariants
- Long mixed undo/redo stress
- Boundary no-op safety
- History cap behavior under higher snapshot load
- Tab isolation across repeated switches
- Persisted payload recovery behavior

Still missing:
- Runtime memory-budget trim assertions (bytes/estimated size thresholds)
- Per-tab history continuity assertions after tab switch + remount semantics
- Migration compatibility tests if history model changes

## Recommended Target Model (Phase 1 Scope)

1. Single source of truth:
- Move active history ownership into store/tab state.
- \`useFlowHistory\` becomes a thin adapter over store actions/selectors.

2. Explicit history policy:
- Keep count cap (\`maxEntries\`) and add memory budget (\`maxEstimatedBytes\`).
- Trim oldest snapshots until both constraints pass.

3. Deterministic tab-aware history:
- Keep \`past/future\` alongside each tab and restore when switching tabs.
- Ensure route remount does not reset history unexpectedly.

4. Safe tab switch behavior:
- Add early return in \`setActiveTabId\` when \`id === activeTabId\`.

5. Controlled rollout:
- Introduce feature flag (e.g., \`historyModelV2\`) for migration.
- Run existing history/store test suites for both old/new paths until stable.

## Proposed Implementation Steps

1. \`P1-06\`: Add same-tab guard in \`setActiveTabId\` and tests.
2. \`P1-07\`: Introduce store-level history state/actions (behind flag).
3. \`P1-08\`: Add estimated-size accounting + memory budget trimming.
4. \`P1-09\`: Wire tab switch to persist/restore per-tab history deterministically.
5. \`P1-10\`: Add migration adapter for existing persisted tabs lacking normalized history metadata.

## Success Criteria for This Workstream

- No regressions in current history/store tests.
- New tests verify memory budget trimming behavior.
- Undo/redo continuity preserved across tab switches and remount-style flows.
- Rollback path remains available via feature flag.
- Pilot rollout follows [History V2 Pilot Checklist](docs/history-v2-pilot-checklist.md).
`;export{e as default};
