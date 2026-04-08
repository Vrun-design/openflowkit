# Mermaid Import Implementation Log
**Date:** 2026-04-07

## Implemented

### Import pipeline hardening
- Made `enrichNodesWithIcons()` import-aware and diagram-aware in [src/lib/nodeEnricher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.ts).
- Added conservative technology/query guards in [src/lib/semanticClassifier.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/semanticClassifier.ts).
- Moved Mermaid paste imports onto strict enrichment behavior before ELK layout in [src/components/flow-canvas/useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts).
- Changed import spacing to `loose -> normal -> compact` with compact floor raised above the old 40px behavior in [src/services/elk-layout/options.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elk-layout/options.ts).

### Layout reliability
- Added automatic layout selection based on graph structure in [src/services/elkLayout.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elkLayout.ts).
- Added cycle detection and branching-factor heuristics so star/tree graphs can use `mrtree`, while dense/cyclic graphs switch to `force` or `stress`.
- Preserved architecture ordering from imported boundary/group order via `archLayerRank` metadata in [src/diagram-types/architecture/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/architecture/plugin.ts) and [src/lib/types.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/types.ts).
- Improved ELK handle inference to use route direction vectors instead of nearest-side guesses in [src/services/elkLayout.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elkLayout.ts).

### Parser hardening
- Strengthened flowchart edge parsing in [src/lib/mermaidParserHelpers.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParserHelpers.ts).
- Added support for chained edges on one line.
- Stopped arrow detection from breaking on arrow-like text inside quoted labels or `|edge labels|`.
- Normalized additional bidirectional extended arrow variants.

### Diagram plugin improvements
- Added state-diagram note rendering and fork/join control parsing in [src/diagram-types/stateDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/stateDiagram/plugin.ts).
- Added visible sequence fragment nodes and improved note placement metadata in [src/diagram-types/sequence/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.ts).
- Tightened journey score validation and mapped scores to visual color states in [src/diagram-types/journey/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/journey/plugin.ts).
- Added generic-class normalization and relation cardinality parsing in [src/diagram-types/classDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/classDiagram/plugin.ts).
- Upgraded ER field parsing from raw strings to structured field objects in [src/diagram-types/erDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/erDiagram/plugin.ts).

### Edge polish
- Applied sibling-aware ELK label staggering in [src/components/custom-edge/pathUtils.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/custom-edge/pathUtils.ts).
- Improved self-loop sizing so loops scale from actual node dimensions in [src/components/custom-edge/pathUtils.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/custom-edge/pathUtils.ts).
- Added import-time icon enrichment failure isolation in [src/components/flow-canvas/useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts).

### Test coverage added/updated
- Expanded focused coverage in:
  - [src/lib/semanticClassifier.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/semanticClassifier.test.ts)
  - [src/lib/nodeEnricher.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.test.ts)
  - [src/services/mermaid/parseMermaidByType.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaid/parseMermaidByType.test.ts)
  - [src/diagram-types/stateDiagram/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/stateDiagram/plugin.test.ts)
  - [src/diagram-types/sequence/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.test.ts)
  - [src/diagram-types/journey/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/journey/plugin.test.ts)
  - [src/diagram-types/classDiagram/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/classDiagram/plugin.test.ts)
  - [src/diagram-types/erDiagram/plugin.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/erDiagram/plugin.test.ts)
  - [src/services/elkLayout.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elkLayout.test.ts)

## Plan Changes

### Refined away stale audit assumptions
- The audit proposed a subgraph `end` guard in the legacy parser. That guard already exists in [src/lib/mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts), so no new code was added there.
- The audit described `[*]` state terminals as rendering plainly. The current core parser already gives state start nodes terminal styling, so the work was redirected to truly missing state features: notes and fork/join controls.

### Replaced raw-source architecture ordering with node metadata
- The audit suggested teaching `elkLayout.ts` to read semantic layer order directly from Mermaid source.
- That would have coupled layout to source text it does not own. Instead, the architecture plugin now emits stable `archLayerRank` metadata, and layout consumes that metadata.
- This is more reliable because the parse stage remains the single source of truth and layout stays source-agnostic.

### Replaced sequence fragment “section nodes” with annotation-style fragment markers
- The audit suggested styled section nodes for sequence fragments.
- Existing ELK behavior and the current sequence lane model make container sections high-risk because they distort participant layout and grouping.
- Fragment markers were implemented as visible annotation nodes instead. This preserves visibility without destabilizing sequence layout.

### Refined the journey gap
- The audit said actors were ignored.
- In the current implementation, actors were already preserved as journey sublabels.
- The higher-value fix was strict score enforcement plus score-based visual differentiation, which directly improves correctness and readability.

### Expanded generic parsing beyond the audit wording
- The audit called out `<T>` generics.
- Mermaid syntax commonly uses `~T~`, so the class parser now normalizes `~T~` to `<T>` and accepts both forms.
- This improves real-world Mermaid compatibility instead of only satisfying one notation.

## Why These Decisions Improved Reliability

- Import-time iconing is now conservative by default, which removes the most visible false-positive behavior without breaking existing manual/icon-explicit nodes.
- Layout selection is now based on structure, not just size, which prevents tree-like imports and dense cyclic imports from being forced through the same algorithm.
- Parser edge scanning now respects Mermaid syntax boundaries, which is the difference between “works on demos” and “survives real pasted diagrams”.
- Class and ER plugins now emit structured data closer to the rest of the editor’s internal node model, which reduces downstream hacks and makes future rendering improvements safer.

## Code Simplification Pass

### Step 1
- Scope: [src/diagram-types/sequence/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/sequence/plugin.ts)
- Behavior preserved:
  - Fragment node colors remain identical.
  - Note lane placement remains identical.
  - No parser semantics changed.
- Simplification:
  - Replaced nested fragment-color ternaries with `getSequenceFragmentColor()`.
  - Extracted `getParticipantLaneIndex()` to make note placement logic explicit.
- Validation:
  - `pnpm vitest run src/diagram-types/sequence/plugin.test.ts` -> passed
- Rollback note:
  - Revert only the helper extraction in `src/diagram-types/sequence/plugin.ts` if this refactor ever causes a regression.

### Step 2
- Scope: touched Mermaid implementation files
- Behavior preserved:
  - No syntax support was removed.
  - No layout heuristics were weakened.
  - No icon-enrichment policy was broadened.
- Simplification:
  - [src/components/flow-canvas/useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts): converted import enrichment isolation into a stable callback helper.
  - [src/lib/nodeEnricher.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeEnricher.ts): extracted icon-enrichment policy calculation into a focused helper.
  - [src/diagram-types/classDiagram/plugin.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/diagram-types/classDiagram/plugin.ts): removed repeated class-record bootstrap branches via `ensureClassRecord()`.
  - Reviewed the remaining touched Mermaid files for simplification opportunities and left already-clear code unchanged to avoid churn-only edits.
- Validation:
  - `pnpm vitest run src/components/custom-edge/pathUtils.test.ts src/lib/nodeEnricher.test.ts src/services/mermaid/parseMermaidByType.test.ts src/diagram-types/classDiagram/plugin.test.ts src/diagram-types/stateDiagram/plugin.test.ts src/diagram-types/sequence/plugin.test.ts src/diagram-types/journey/plugin.test.ts src/diagram-types/erDiagram/plugin.test.ts src/services/elkLayout.test.ts` -> passed
  - `pnpm exec tsc --noEmit` -> passed
- Rollback note:
  - Revert only the helper extractions above if a maintenance-oriented refactor ever needs to be undone separately from behavior fixes.

## Validation Summary

- `pnpm vitest run src/lib/semanticClassifier.test.ts src/lib/nodeEnricher.test.ts src/services/mermaid/parseMermaidByType.test.ts src/diagram-types/stateDiagram/plugin.test.ts src/diagram-types/sequence/plugin.test.ts src/diagram-types/journey/plugin.test.ts src/diagram-types/classDiagram/plugin.test.ts src/diagram-types/erDiagram/plugin.test.ts src/services/elkLayout.test.ts` -> passed
- `pnpm vitest run src/diagram-types/sequence/plugin.test.ts` -> passed
- `pnpm vitest run src/components/custom-edge/pathUtils.test.ts src/lib/nodeEnricher.test.ts src/services/mermaid/parseMermaidByType.test.ts src/diagram-types/classDiagram/plugin.test.ts src/diagram-types/stateDiagram/plugin.test.ts src/diagram-types/sequence/plugin.test.ts src/diagram-types/journey/plugin.test.ts src/diagram-types/erDiagram/plugin.test.ts src/services/elkLayout.test.ts` -> passed
- `pnpm exec tsc --noEmit` -> passed
