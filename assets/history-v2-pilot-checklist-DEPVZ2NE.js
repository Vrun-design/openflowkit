const e=`# History V2 Pilot Checklist

Use this checklist for controlled pilot rollout of store-level history V2.

## Scope

- Default mode: V2 ON (unless explicitly disabled).
- Kill switch: \`VITE_HISTORY_MODEL_V2=0\` forces legacy path.
- Safety objective: verify V2 path can run without regressions and rollback remains immediate.

## Preconditions

1. \`P1-01\` through \`P1-11\` are completed in \`docs/q1_execution_tracker.md\`.
2. Latest targeted tests pass in both history and store suites.
3. Release gate checklist is available: \`docs/release-gate-checklist.md\`.

## Pilot Enablement

Run tests in default V2 mode:

\`\`\`bash
npm run test -- --run src/hooks/useFlowHistory.test.ts src/store.test.ts
\`\`\`

Optional local app verification:

\`\`\`bash
npm run dev
\`\`\`

## Pilot Validation Steps

Mark each as \`Pass\` or \`Fail\`.

| Check | Expected |
| --- | --- |
| Undo/redo core flow | Works across repeated operations |
| Tab switching continuity | Per-tab undo/redo stacks stay isolated |
| Large snapshot pressure | History remains bounded (count + memory trim) |
| Persisted state compatibility | Legacy payloads hydrate safely |
| No-op same-tab switch | No accidental state overwrite on same-tab route |

## Rollback Drill (Mandatory)

If any pilot check fails:

1. Disable V2 immediately by removing env flag:
   - stop process
   - restart with \`VITE_HISTORY_MODEL_V2=0\`
2. Re-run baseline targeted tests with default flag OFF:

\`\`\`bash
npm run test -- --run src/hooks/useFlowHistory.test.ts src/store.test.ts
\`\`\`

3. Record failure details and rollback confirmation in \`docs/q1_execution_tracker.md\`.

## Signoff

| Field | Value |
| --- | --- |
| Pilot date (YYYY-MM-DD) |  |
| Operator |  |
| V2 enabled command used |  |
| Result (GO/NO-GO) |  |
| Rollback tested? (Yes/No) |  |
| Notes |  |
`;export{e as default};
