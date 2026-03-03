const e=`# Release Gate Checklist (Q1 2026)

Use this checklist before merging/releasing any risky change in Q1.

## Required Inputs

- Active change ID from \`docs/q1_execution_tracker.md\`
- Baseline reference fixture(s): \`small-100\`, \`medium-300\`, \`large-1000\`
- Current benchmark artifacts under \`benchmarks/results/\`

## Gate Commands

Run in this order:

\`\`\`bash
npm run test -- --run
npm run bench:check
npm run bundle:check
\`\`\`

Optional when build-risk is high:

\`\`\`bash
npm run build:ci
\`\`\`

## Go/No-Go Criteria

Mark each criterion as \`Pass\` or \`Fail\`.

| Gate | Pass Condition | Status | Notes |
| --- | --- | --- | --- |
| Correctness | Test suite for affected scope passes with no new failures |  |  |
| Performance Artifact Integrity | \`bench:check\` passes and all required benchmark files are valid |  |  |
| Performance Delta Review | Median/p95 deltas reviewed vs prior baseline; no unexplained severe regression |  |  |
| Bundle Budget | \`bundle:check\` passes within configured limits |  |  |
| Determinism/Serialization (if touched) | Export/layout determinism checks pass for touched flows |  |  |
| Rollback Readiness | Rollback command/path documented and tested mentally |  |  |

Release decision:

- \`GO\` only if all required gates pass.
- \`NO-GO\` if any required gate fails.

## Signoff

| Field | Value |
| --- | --- |
| Change ID |  |
| Reviewer |  |
| Date (YYYY-MM-DD) |  |
| Decision (GO/NO-GO) |  |

`;export{e as default};
