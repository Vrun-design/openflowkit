# Browser Performance Baseline

This harness measures the shipped production bundle in Chromium. It imports the
existing 100, 300, and 1,000-node fixtures through OpenFlowKit's real JSON import
control; no benchmark-only hook is compiled into the application.

## Capture

```bash
npm run bench:browser
```

The command builds the production bundle, serves it locally, runs the serial
Playwright scenario, and writes
`results/reactflow-baseline.latest.json` and
`results/pixi-spike.latest.json`.

## Validate an existing result

```bash
npm run bench:browser:check
```

## Production hardware pair

From a clean committed worktree on a graphical machine with system Chrome:

```bash
npm run bench:browser:hardware
```

This headed runner uses the same hashed fixtures and five repetitions per
fixture in React Flow and OpenCanvas. It rejects SwiftShader/software WebGL,
dirty or mismatched commits, different runner identities, and unequal fixture
runs before writing `results/hardware-pair.latest.json`.

## Measurements

- cold and warm JSON-import-to-interactive time.
- application-reported import time.
- animation-frame median, p95, worst, and threshold counts.
- pointer/wheel event timestamp to next animation frame.
- Long Animation Frame and long-task entries when supported.
- Chromium JavaScript heap before and after each phase.
- fixture hash, commit, branch, runner, browser, viewport, and hardware hints.
- raw metric samples in the JSON result and a DevTools trace attachment per fixture.

The Pixi spike also verifies WebGL capability failure, context loss/restoration,
and DOM editor alignment. Playwright uses SwiftShader so CI can exercise WebGL
deterministically. Treat that capture as lifecycle evidence only; accept or reject
the renderer performance gate using a same-machine run on production GPU hardware.

Animation-frame intervals measure pacing. On a 60 Hz display, roughly 16.7ms is
normal and does not imply 16.7ms of renderer work. The stricter 12ms renderer-work
budget must be evaluated from the DevTools timeline trace, not inferred from rAF
spacing.

Budget status is informational until repeated-run variance is established. Compare
React Flow and OpenCanvas on the same machine, browser, viewport, fixtures, commit,
and scenario. Do not compare these values with the Node proxy benchmarks in
`benchmarks/results/`.

## Rollback

Remove `benchmarks/browser/`, the two `bench:browser*` package scripts, and
`scripts/check-browser-benchmark-results.mjs`. Application runtime is unaffected.
