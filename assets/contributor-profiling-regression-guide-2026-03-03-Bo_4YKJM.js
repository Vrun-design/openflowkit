const n=`# Contributor Profiling and Regression Triage Guide (2026-03-03)

This guide defines the standard contributor workflow for performance profiling and regression triage in Q1 scope.

## Prerequisites

1. Node \`>=18\` (Q1 baseline captured on Node \`v22.18.0\`).
2. Install dependencies:

\`\`\`bash
npm install
\`\`\`

3. Verify benchmark artifact integrity before analysis:

\`\`\`bash
npm run bench:check
\`\`\`

## Standard Profiling Workflow

Run the full benchmark sequence for each fixture:

- \`small-100\`
- \`medium-300\`
- \`large-1000\`

Commands per fixture:

\`\`\`bash
npm run bench:harness -- --fixture <fixture> --mode initial-render --iterations 8
npm run bench:harness -- --fixture <fixture> --mode drag-frame-budget --iterations 8
npm run bench:harness -- --fixture <fixture> --mode layout --iterations 8
npm run bench:harness -- --fixture <fixture> --mode routing-hotspot --iterations 8
npm run bench:harness -- --fixture <fixture> --mode heap-growth --iterations 8
npm run bench:summary -- --fixture <fixture>
\`\`\`

## Regression Triage Flow

1. Identify failing or shifted metric in \`benchmarks/results/<fixture>.summary.latest.json\`.
2. Compare \`median\` first, then \`p95\` to confirm tail behavior.
3. Confirm harness schema/integrity still valid:

\`\`\`bash
npm run bench:check
\`\`\`

4. Run correctness gates for touched area:

\`\`\`bash
npm run test -- --run
\`\`\`

5. If UI/runtime behavior changed, run release budget gate:

\`\`\`bash
npm run bundle:check
\`\`\`

6. If regression remains, isolate by subsystem:
- Routing path: run targeted routing suites (\`smartEdgeRouting\`, drag routing policy tests).
- History path: run targeted history/store suites.
- Determinism path: run layout/export deterministic suites.

## Add a New Performance Fixture

1. Add fixture JSON under:
- \`benchmarks/fixtures/<name>.json\`

2. Keep deterministic topology (stable IDs and edge wiring) to avoid noisy comparisons.

3. Validate fixture quickly:

\`\`\`bash
npm run bench:harness -- --fixture <name> --mode dry-run
\`\`\`

4. Run full mode set + summary for the new fixture:

\`\`\`bash
npm run bench:harness -- --fixture <name> --mode initial-render --iterations 8
npm run bench:harness -- --fixture <name> --mode drag-frame-budget --iterations 8
npm run bench:harness -- --fixture <name> --mode layout --iterations 8
npm run bench:harness -- --fixture <name> --mode routing-hotspot --iterations 8
npm run bench:harness -- --fixture <name> --mode heap-growth --iterations 8
npm run bench:summary -- --fixture <name>
\`\`\`

5. Re-run integrity checker:

\`\`\`bash
npm run bench:check
\`\`\`

## “No Regression” Validation Checklist

1. Correctness:
- \`npm run test -- --run\` passes.

2. Benchmark integrity:
- \`npm run bench:check\` passes.

3. Bench summary status:
- all touched fixture summaries show \`status: ok\` for all modes.

4. Budget gate (if runtime bundle-impacting changes):
- \`npm run bundle:check\` passes.

5. Determinism gate (if layout/export changed):
- deterministic tests in touched suites pass (layout/export/parser round-trip coverage).

## Reporting Template (PR / Tracker)

Use this compact structure:

1. Scope and subsystem touched.
2. Baseline commands and environment (Node/OS).
3. Metric deltas (median and p95).
4. Correctness + benchmark integrity + bundle checks.
5. Rollback path.

## Known Caveats

1. Benchmark metrics are Node harness proxy metrics, not browser render/FPS/heap truth.
2. Use median trend as primary signal and p95 as confidence bound.
3. Treat one-off spikes as noise unless repeated runs show persistent shift.
`;export{n as default};
