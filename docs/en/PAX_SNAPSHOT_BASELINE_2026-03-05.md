# PAX Snapshot Baseline (2026-03-05)

Critical canvas safety baseline for Phase `S0-03`.

## Baseline Matrix

| Area | Baseline Target | Current Test Anchor |
| --- | --- | --- |
| Flow canvas node registry | Stable set of registered node type keys | `src/components/flow-canvas/flowCanvasTypes.test.ts` |
| Flow canvas edge registry | Stable set of registered edge type keys | `src/components/flow-canvas/flowCanvasTypes.test.ts` |
| Mermaid parser dispatch | Stable family detection and parse result behavior | `src/services/mermaid/parseMermaidByType.test.ts` |
| Export routing | Stable architecture-vs-flowchart export path | `src/services/exportService.test.ts` |
| Large graph guardrails | Stable safety mode behavior by thresholds | `src/components/flow-canvas/largeGraphSafetyMode.test.ts` |

## S0-03 Gate

1. Node/edge registry snapshot test passes.
2. Baseline matrix is tracked and linked in the PAX tracker.

