const e=`# Benchmark Baseline Runbook (Q1 2026)

This runbook defines how to run and capture benchmark baselines for the Q1 plan.

Published reproducibility artifact:

- \`docs/benchmark-reproducibility-2026-03-03.md\`
- \`benchmarks/results/q1-2026-baseline-package-2026-03-03.json\`

## Scope

- Fixtures:
  - \`benchmarks/fixtures/small-100.json\`
  - \`benchmarks/fixtures/medium-300.json\`
  - \`benchmarks/fixtures/large-1000.json\`
- Harness scripts:
  - \`npm run bench:harness\`
  - \`npm run bench:summary\`

## Important Metric Caveat

Current metrics are **proxy metrics** from Node.js harness workload simulation.
They are useful for relative comparisons and regression checks, but they are not browser paint/FPS/heap truth.

## Modes

- \`initial-render\`: fixture processing proxy for first-load work.
- \`drag-frame-budget\`: per-frame drag proxy and \`>16ms\` frame count.
- \`layout\`: deterministic layout workload proxy timing.
- \`routing-hotspot\`: smart-routing CPU pressure proxy timing over full edge-set traversal.
- \`heap-growth\`: Node.js heap growth proxy across repeated workload iterations.

## Per-Mode Output Files

Each mode writes to:

- \`benchmarks/results/<fixture>.<mode>.latest.json\`

Examples:

- \`benchmarks/results/small-100.initial-render.latest.json\`
- \`benchmarks/results/medium-300.layout.latest.json\`
- \`benchmarks/results/large-1000.heap-growth.latest.json\`

Summary writes to:

- \`benchmarks/results/<fixture>.summary.latest.json\`

## Standard Baseline Command Set

Run this sequence per fixture (\`small-100\`, \`medium-300\`, \`large-1000\`):

\`\`\`bash
npm run bench:harness -- --fixture <fixture> --mode initial-render --iterations 8
npm run bench:harness -- --fixture <fixture> --mode drag-frame-budget --iterations 8
npm run bench:harness -- --fixture <fixture> --mode layout --iterations 8
npm run bench:harness -- --fixture <fixture> --mode routing-hotspot --iterations 8
npm run bench:harness -- --fixture <fixture> --mode heap-growth --iterations 8
npm run bench:summary -- --fixture <fixture>
\`\`\`

## Baseline Capture Checklist

1. Ensure fixture files exist under \`benchmarks/fixtures/\`.
2. Run all five modes for each fixture.
3. Generate summary for each fixture.
4. Confirm \`status: ok\` for all modes in each summary file.
5. Log run details in \`docs/q1_execution_tracker.md\`.

## Interpreting Results Safely

- Compare **median** and **p95** first; do not optimize for single-sample outliers.
- Treat sudden large p95 shifts as investigation triggers, not immediate regression conclusions.
- Keep caveat language when reporting numbers externally:
  - "Proxy benchmark from Node harness, not browser runtime metrics."
`;export{e as default};
