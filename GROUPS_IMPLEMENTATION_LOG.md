# Groups Implementation Log

Date: 2026-04-07

## Implemented

- Made parent assignment opt-in for `extent: 'parent'` in [src/lib/nodeParent.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/nodeParent.ts), so grouped nodes are no longer physically trapped by default.
- Updated Mermaid and OpenFlow DSL import paths to preserve `parentId` without forcing parent drag constraints in [src/lib/mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts) and [src/lib/flowmindDSLParserV2.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/flowmindDSLParserV2.ts).
- Aligned Mermaid-created section sizes with the real section minimums in [src/lib/mermaidParser.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/lib/mermaidParser.ts).
- Unified ELK root/container padding with the section bounds model and enabled compound hierarchy handling in [src/services/elk-layout/options.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elk-layout/options.ts) and [src/services/elkLayout.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elkLayout.ts).
- Added explicit ELK absolute-to-relative position normalization for parented nodes in [src/services/elkLayout.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elkLayout.ts).
- Centralized post-layout section auto-fit in [src/services/composeDiagramForDisplay.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/composeDiagramForDisplay.ts) so imports and other composed layouts get the same safety net.
- Routed Mermaid paste imports through the shared display composition path in [src/components/flow-canvas/useFlowCanvasPaste.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/components/flow-canvas/useFlowCanvasPaste.ts).
- Added focused coverage for parser sizing/parenting and ELK parent-relative layout conversion in [src/services/mermaidParser.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/mermaidParser.test.ts), [src/hooks/node-operations/utils.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/hooks/node-operations/utils.test.ts), and [src/services/elkLayout.test.ts](/Users/varun/Desktop/Dev_projects/flowmind-ai/src/services/elkLayout.test.ts).

## Plan Refinements

- Did not add a separate drag-stop escape path in `useNodeDragOperations.ts`.
  Reason: the audit was stale on this point. The real trap was unconditional `extent: 'parent'`, while `applySectionParenting()` already knows how to unparent on drop outside a section once movement is no longer DOM-constrained.

- Did not model a larger floating-header offset in ELK.
  Reason: the current source of truth in `sectionBounds.ts` uses `SECTION_CONTENT_PADDING_TOP = SECTION_HEADER_HEIGHT = 16`, not the older `-36` header model described in the audit. Reusing the actual shared constants is safer than reintroducing stale geometry assumptions.

- Applied section auto-fit at the shared display composition layer instead of only Mermaid paste.
  Reason: this makes grouped layout reliability consistent across Mermaid import, code-panel apply flows, and any other caller that uses composed display layout.

- Extended the import parenting change to the OpenFlow DSL parser as well.
  Reason: the groups reliability issue is not Mermaid-specific. Keeping grouped imports on the same unconstrained parent model avoids inconsistent behavior between import paths.

## Why These Decisions Improved Reliability

- Removing unconditional parent constraints fixes the escape problem at the root cause instead of layering special-case drag logic on top.
- Shared padding/min-size constants eliminate geometry drift between hit testing, section fitting, and ELK.
- Converting ELK absolute child coordinates back to parent-relative React Flow coordinates fixes the main grouped-layout correctness bug.
- Centralized post-layout fitting gives a deterministic last-mile correction even when ELK sizing is slightly conservative.
- Reusing the same composition path for imports reduces divergence and makes future layout fixes apply everywhere.

## Simplification Pass

- Ran a code simplification/cleanup pass over the touched files after implementation.
- Applied Prettier formatting to the modified files to keep the new helpers and tests consistent with repo style.

## Validation

- `pnpm vitest run src/services/mermaidParser.test.ts src/hooks/node-operations/utils.test.ts src/services/elkLayout.test.ts`
- `pnpm exec tsc --noEmit`
