# Engineering Remediation Tracker (2026-03-07)

Single source of truth for phased remediation following [ENGINEERING_AUDIT_2026-03-07.md](/Users/varun/Desktop/Dev_projects/flowmind-ai/docs/ENGINEERING_AUDIT_2026-03-07.md).

This tracker follows the repo's one-by-one safe-execution model.

## Rules

1. One change-set at a time.
2. No phase advances until the current phase gate is green.
3. Every change-set must include:
- files touched
- feature flag or `N/A`
- acceptance checks
- rollback steps
4. Use `code-simplifier` only inside the active change-set scope.
5. Do not mix architecture cleanup with gate-restoration bug fixes unless strictly required.

## Baseline

Captured on 2026-03-07 from the current branch state.

- `npm run lint`: failed
- `npm run test -- --run`: failed
- `npm run build:ci`: passed
- `npm run e2e:ci`: failed

Current known blockers from the audit:

1. Lint failure set includes declaration-order, effect-state, ref-during-render, memoization, and style errors.
2. Unit test regression: handle fill centralization policy violated by `MindmapNode`.
3. Playwright smoke suite is stale relative to `/flow/:id` and collaboration URL behavior.
4. Several large editor/runtime modules need simplification after gates are restored.

## Phases

### Phase R0: Tracking And Baseline Lock

Goal: establish a safe execution record and freeze the starting evidence.

Exit gate:

1. Tracker exists.
2. Baseline failures are recorded.
3. First executable change-set is defined.

### Phase R1: Restore Green Gates

Goal: get back to a trustworthy branch state before broader cleanup.

Exit gate:

1. `npm run lint` passes.
2. `npm run test -- --run` passes.
3. `npm run build:ci` passes.
4. `npm run e2e:ci` passes.

### Phase R2: Simplify React Runtime Hotspots

Goal: reduce churn in hooks/components currently fighting React lint/compiler rules.

Exit gate:

1. Touched runtime modules are smaller or clearer.
2. No new lint/test regressions.
3. Targeted editor/canvas regression tests pass.

### Phase R3: UX Consistency Cleanup

Goal: replace rough edges that undermine product quality without changing core behavior.

Exit gate:

1. Home/dashboard destructive and rename flows use app-native UI.
2. Loading/fallback behavior is improved.
3. Relevant component/integration tests pass.

### Phase R4: Store And Architecture Debt Reduction

Goal: reduce integration pressure from the monolithic store and giant orchestration surfaces.

Exit gate:

1. At least one concrete domain boundary is extracted safely.
2. Persistence/selection/UI concerns are clearer.
3. Regression checks for touched families and collaboration paths pass.

### Phase R5: Release Readiness Re-Baseline

Goal: confirm the post-remediation branch is again release-credible.

Exit gate:

1. All main gates pass.
2. Tracker log is complete.
3. Residual risks are documented.

## Change-Sets

| Change ID | Phase | Scope | Files Touched | Flag | Status | Acceptance Checks | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R0-01 | R0 | Create remediation tracker and baseline record | `docs/ENGINEERING_REMEDIATION_TRACKER_2026-03-07.md` | N/A | Completed | Manual doc review; audit file linked; baseline commands recorded | Revert tracker file |
| R1-01 | R1 | Fix immediate lint blocker in `FlowCanvas` declaration ordering and rerun targeted checks | `src/components/FlowCanvas.tsx` | `canvasInteractionsV1` | Completed | `npx eslint src/components/FlowCanvas.tsx`; `npm run test -- --run src/components/flow-canvas/useFlowCanvasMenusAndActions.test.tsx src/components/flow-canvas/useFlowCanvasSelectionTools.test.tsx src/components/FlowEditorPanels.test.tsx` | Revert `FlowCanvas.tsx` |
| R1-02 | R1 | Restore handle-style centralization contract for custom nodes and rerun targeted tests | `src/components/custom-nodes/MindmapNode.tsx`; related shared chrome if needed | `visualQualityV2` | Completed | `npx eslint src/components/custom-nodes/MindmapNode.tsx`; `npm run test -- --run src/components/handleInteractionUsage.test.ts src/components/custom-nodes/ClassEntityNode.handleInteraction.test.tsx src/components/custom-nodes/VisualNodes.handleInteraction.test.tsx src/components/properties/families/MindmapNodeProperties.test.tsx` | Revert touched node/chrome files |
| R1-03 | R1 | Update smoke tests to current route, home-launch, and collaboration URL contract | `e2e/smoke.spec.ts`; `src/components/top-nav/TopNavMenu.tsx` | `collaborationV1` | Completed | `npx eslint e2e/smoke.spec.ts src/components/top-nav/TopNavMenu.tsx`; `npm run e2e:ci` | Revert touched e2e/menu files |
| R1-04 | R1 | Clear remaining React lint/compiler blockers in active hotspot files with no feature changes | `src/components/StudioCodePanel.tsx`; `src/components/Toolbar.tsx`; `src/components/command-bar/AssetsView.tsx`; `src/components/flow-canvas/useFlowCanvasViewState.ts`; `src/components/flow-canvas/useFlowCanvasZoomLod.ts`; `src/components/properties/CustomColorPopover.tsx`; `src/components/properties/EdgeProperties.tsx`; `src/hooks/useEdgeOperations.ts`; `src/hooks/useFlowEditorCollaboration.ts`; `src/hooks/useNodeOperations.ts`; `src/services/elkLayout.ts`; `src/services/smartEdgeRouting.ts`; `src/components/MemoizedMarkdown.tsx` | Mixed existing flags / `N/A` | Completed | `npm run lint`; targeted tests for touched modules; `npm run test -- --run` if shared surfaces are impacted | Revert only touched files from this change-set |
| R1-05 | R1 | Phase gate verification and signoff record for restored branch baseline | tracker + optional signoff doc | N/A | Completed | `npm run lint`; `npm run test -- --run`; `npm run build:ci`; `npm run e2e:ci` | Revert docs-only signoff updates |
| R2-01 | R2 | Simplify `useFlowCanvasViewState` and adjacent view-state derivation with no behavior change | `src/components/flow-canvas/useFlowCanvasViewState.ts`; dependent tests | N/A | Completed | `npx eslint src/components/flow-canvas/useFlowCanvasViewState.ts`; `npm run test -- --run src/components/flow-canvas/useFlowCanvasViewState.test.ts src/components/flow-canvas/largeGraphSafetyMode.test.ts src/components/flow-canvas/useFlowCanvasSelectionTools.test.tsx src/components/flow-canvas/useFlowCanvasReactFlowConfig.test.ts` | Revert touched files |
| R2-02 | R2 | Simplify `useNodeOperations` into smaller helpers while preserving behavior | `src/hooks/useNodeOperations.ts`; `src/hooks/node-operations/*`; tests | `canvasInteractionsV1` | Completed | `npx eslint src/hooks/useNodeOperations.ts src/hooks/node-operations/utils.ts`; `npm run test -- --run src/hooks/node-operations/utils.test.ts src/hooks/node-operations/dragStopReconcilePolicy.test.ts src/hooks/node-operations/routingDuringDrag.test.ts src/lib/mindmapLayout.test.ts src/lib/connectCreationPolicy.test.ts` | Revert touched files |
| R2-03 | R2 | Simplify collaboration runtime hook boundaries and effect discipline | `src/hooks/useFlowEditorCollaboration.ts`; `src/services/collaboration/*`; tests | `collaborationV1` | Completed | targeted collaboration tests + `npm run lint` | Revert touched files |
| R3-01 | R3 | Replace `window.prompt` / `window.confirm` home actions with app-native dialog flow | `src/components/HomePage.tsx`; `src/components/home/*`; tests | N/A | Completed | targeted component/integration tests + `npm run lint` | Revert touched files |
| R3-02 | R3 | Improve route/editor loading and fallback UX without changing navigation model | `src/App.tsx`; related UI components/tests | N/A | Completed | targeted route/component tests + `npm run lint` | Revert touched files |
| R4-01 | R4 | Extract one low-risk domain slice from the global store to reduce coupling | `src/store.ts`; `src/store/*`; persistence/tests | `indexedDbStorageV1` or `N/A` | Completed | store tests; persistence tests; `npm run lint` | Revert touched store/persistence files |
| R5-01 | R5 | Full release-readiness rerun and residual-risk closeout | tracker + optional signoff doc | N/A | Completed | all main gates green | Revert docs-only closeout updates |

## Active Change-Set

Current active change-set: `Follow-on / Performance chunk work`

Reason:

- All planned remediation phases for this roadmap are complete.
- The branch has been re-baselined against the main release gates with current evidence.
- Follow-on improvement work is still active, with the current category focused on performance chunk work.

## Activity Log

| Timestamp (IST) | Change ID | Note |
| --- | --- | --- |
| 2026-03-07 | R0-01 | Created remediation tracker from the engineering audit and split work into reversible phases. |
| 2026-03-07 | R0-01 | Recorded baseline: lint failed, unit/integration tests failed, build passed, Playwright smoke failed. |
| 2026-03-07 | R0-01 | Marked `R1-01` as the first executable change-set. |
| 2026-03-07 | R1-01 | Split menu state from context actions in `FlowCanvas` so `setConnectMenu` is declared before capture; touched-file lint passed and nearby canvas/editor tests passed. |
| 2026-03-07 | R1-02 | Removed node-specific handle fill override from `MindmapNode`; shared handle policy test and nearby custom-node/mindmap tests passed. |
| 2026-03-07 | R1-03 | Updated Playwright smoke flows to current `/flow/:id` routing and UI-based snapshot restore; added stable top-nav menu test hooks; `npm run e2e:ci` passed. |
| 2026-03-07 | R1-04 | Cleared low-risk lint blockers in `MemoizedMarkdown`, `Toolbar`, canvas view-state, `elkLayout`, and smart-edge routing; targeted touched-file lint passed and 37 focused tests passed. |
| 2026-03-07 | R1-04 | Reworked `StudioCodePanel` away from prop-sync effects, cleared `AssetsView`/inspector lint issues, and fixed remaining hook dependency/effect problems in edge/node/collaboration hooks; all focused validation batches passed. |
| 2026-03-07 | R1-05 | Full gate verification passed: `npm run lint`, `npm run test -- --run` (130 files / 550 tests), `npm run build:ci`, and `npm run e2e:ci` are all green. |
| 2026-03-07 | R2-01 | Extracted layer and visible-edge derivation helpers from `useFlowCanvasViewState`; touched-file lint and 14 focused canvas tests passed with no behavior change. |
| 2026-03-07 | R2-02 | Extracted shared absolute-position, architecture-boundary reassignment, and node-construction helpers from `useNodeOperations`; targeted node-operation lint and 19 focused tests passed across both simplification slices. |
| 2026-03-07 | R2-03 | Moved pure collaboration helper logic plus local room/client/identity resolution out of `useFlowEditorCollaboration` into `src/services/collaboration/hookUtils.ts`; targeted collaboration lint passed and expanded focused tests passed (26 tests). |
| 2026-03-07 | R2-03 | Extracted collaboration runtime bootstrap and teardown helpers into `src/services/collaboration/runtimeHookUtils.ts`; focused collaboration lint passed and the collaboration regression suite remained green (26 tests). |
| 2026-03-07 | R2-03 | Extracted the canvas-diff flush and drag-throttle state machine from `useFlowEditorCollaboration` into `src/services/collaboration/runtimeHookUtils.ts`; added focused unit coverage and kept the collaboration validation batch green (30 tests). |
| 2026-03-07 | R2-03 | Extracted the pointer-presence publish loop from `useFlowEditorCollaboration` into `src/services/collaboration/runtimeHookUtils.ts`; added focused unit coverage and passed full `npm run lint` plus the collaboration regression batch (32 tests). |
| 2026-03-07 | R2-03 | Marked the collaboration simplification change-set complete after repo-wide lint stayed green and the hook was reduced to orchestration responsibilities. |
| 2026-03-07 | R3-01 | Replaced `HomePage` rename/delete `window.prompt` and `window.confirm` flows with app-native dialogs in `src/components/home/HomeFlowDialogs.tsx`; touched-file lint passed and HomePage integration coverage was updated and green (4 tests). |
| 2026-03-07 | R3-01 | Marked the home UX consistency cleanup complete after full `npm run lint` stayed green. |
| 2026-03-07 | R3-02 | Replaced the bare route `Loading...` shell with a branded loading surface in `src/components/app/RouteLoadingFallback.tsx` and moved home-to-editor JSON import handoff from `setTimeout` DOM poking to explicit route state consumed by `FlowEditor`; focused route/component tests passed (4 tests). |
| 2026-03-07 | R3-02 | Marked the route/editor loading UX cleanup complete after full `npm run lint` stayed green. |
| 2026-03-07 | R4-01 | Extracted store persistence policy out of `src/store.ts` into `src/store/persistence.ts`, including initial persisted state, migration, sanitization, and partialization rules; touched-file lint passed and focused store/persistence tests passed (26 tests). |
| 2026-03-07 | R4-01 | Marked the first store-boundary extraction complete after full `npm run lint` stayed green. |
| 2026-03-07 | R5-01 | Final release gate rerun: `npm run lint` passed, `npm run test -- --run` passed (134 files / 570 tests), elevated `npm run e2e:ci` passed (2 tests), and `npm run build:ci` passed after fixing a compile-time `mindmapBranchStyle` type regression in `src/hooks/node-operations/utils.ts`. |
| 2026-03-07 | R5-01 | Roadmap complete. Residual risk is now limited to follow-on optimization/decomposition work rather than any active release blocker. |
| 2026-03-07 | Follow-on | Narrowed the public docs markdown import surface to curated public slugs only, preventing internal planning/audit markdown under `docs/en/*` from shipping in the production docs bundle; focused lint/test checks passed and `npm run build:ci` stayed green with a smaller docs chunk. |
| 2026-03-07 | Follow-on | Deferred ELK wrapper loading behind dynamic imports in `useFlowEditorActions`, `useFlowCanvasPaste`, and `composeDiagramForDisplay`, which removed the remaining static ELK edge from the shared graph; focused tests passed and `npm run build:ci` stayed green with a new lazy `elkLayout-*` chunk and a smaller `FlowEditor` route chunk. |
| 2026-03-07 | Follow-on | Lazy-loaded Prism syntax highlighting from `MarkdownComponents` via `SyntaxCodeBlock`, keeping docs markdown rendering available while deferring code-block highlighting until needed; `npm run build:ci` stayed green and `vendor-markdown` dropped sharply from ~962 kB to ~395 kB with a new lazy `SyntaxCodeBlock-*` chunk. |
| 2026-03-07 | Follow-on | Lazy-loaded `DocsChatbot` from `DocsPage`, moving the chatbot-only surface into its own route chunk; `npm run build:ci` stayed green and the `DocsPage` chunk dropped from ~26.9 kB to ~17.6 kB. |
| 2026-03-07 | Follow-on | Lazy-loaded `FlowEditorPanels` behind an explicit `shouldRenderPanels` gate in `FlowEditor`, so command bar/history/properties/studio panel code is only loaded when needed; `npx eslint src/components/FlowEditor.tsx` passed, focused panel/command-bar tests passed (5 tests), and `npm run build:ci` stayed green with `FlowEditor` dropping from ~835.6 kB to ~696.6 kB plus a new `FlowEditorPanels-*` chunk (~140.2 kB). |
| 2026-03-07 | Follow-on | Lazy-loaded `SettingsModal` from `TopNav` and `KeyboardShortcutsModal` from `FlowEditor` so those icon-heavy modal surfaces only load on demand; lint passed, focused editor shortcut/action tests passed (16 tests), and `npm run build:ci` stayed green with small new modal chunks and `FlowEditor` trimming further to ~694.6 kB, though `vendor-lucide` itself remained unchanged at ~885.1 kB. |
| 2026-03-07 | Follow-on | Investigated a smaller static `IconMap` plus dynamic Lucide fallback path, but rejected it and reverted the code after measurement: `vendor-lucide` grew materially (~885.1 kB -> ~1,238.8 kB). Restored the previous icon path, reran focused icon/node tests (21 tests), and confirmed `npm run build:ci` returned to the prior baseline. |
| 2026-03-07 | Follow-on | Started the next large-store decomposition slice by introducing `src/store/brandHooks.ts` as a dedicated brand-domain access layer and moving brand readers/actions in home, docs, editor, top-nav, settings, and command-bar surfaces off direct `useFlowStore` brand lookups. Touched-file lint passed, focused regressions passed (10 tests), and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued large-store decomposition with `src/store/viewHooks.ts`, moving shortcut-help, language/view settings, privacy/general settings, visuals, and editor-shell consumers off direct `useFlowStore` view-state access where behavior was low-risk. Touched-file lint passed, focused regressions passed (18 tests), and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued large-store decomposition with `src/store/designSystemHooks.ts`, moving active design-system lookup plus catalog/actions for design-system editor/view consumers behind a dedicated access layer. Touched-file lint passed, focused design-system regressions passed (8 tests), and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued large-store decomposition with `src/store/selectionHooks.ts`, moving selection state, pending node-label edit requests, and Mermaid diagnostics access behind a dedicated hook layer for editor, studio-code, and node-selection consumers. Touched-file lint passed, focused regressions passed (21 tests), and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued large-store decomposition with `src/store/tabHooks.ts`, moving tab catalog/active-tab access and tab actions behind a dedicated hook layer for app routing, home dashboard, and command-bar pages/search consumers. Touched-file lint passed, focused regressions passed (14 tests), and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Finished the final large-store decomposition slice with `src/store/canvasHooks.ts` and `src/store/historyHooks.ts`, moving canvas graph access plus history access behind dedicated layers for `FlowCanvas`, flow operations, clipboard/export, and history consumers. Touched-file lint passed, focused regressions passed (30 tests), and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Started giant-hook extraction with `src/hooks/useEdgeOperations.ts`, moving duplicate-connection detection, closest-handle targeting, connected-node/edge construction, and opposite-handle resolution into `src/hooks/edge-operations/utils.ts`. Added focused unit coverage in `src/hooks/edge-operations/utils.test.ts`; touched-file lint passed, 23 focused edge/policy/mindmap tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued giant-hook extraction in `src/hooks/useEdgeOperations.ts` by moving the mindmap add-and-connect branch into `buildConnectedMindmapTopic(...)` in `src/hooks/edge-operations/utils.ts`, reusing the shared mindmap topic constructor from `src/hooks/node-operations/utils.ts` and preserving relayout behavior. Expanded focused helper coverage to 25 passing tests, touched-file lint passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued giant-hook extraction in `src/hooks/useEdgeOperations.ts` by moving the `onConnectEnd` decision tree into `resolveConnectEndAction(...)` in `src/hooks/edge-operations/utils.ts`, leaving the hook to perform only the chosen side effect (`connect`, `add`, `menu`, or `none`). Expanded focused helper coverage to 26 passing tests, touched-file lint passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Moved the studio/panel state machine out of `src/components/FlowEditor.tsx` into `src/components/flow-editor/useFlowEditorStudioController.ts`, including studio open/close/toggle behavior, selection snapshot capture, and the “exit studio on selection change” effect. Added focused hook coverage in `src/components/flow-editor/useFlowEditorStudioController.test.tsx`; touched-file lint passed, 15 focused editor/studio tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued `FlowEditor` giant-hook extraction by moving the `LazyFlowEditorPanels` prop assembly into `src/components/flow-editor/panelProps.ts` via `buildFlowEditorPanelsProps(...)`. Added focused contract coverage in `src/components/flow-editor/panelProps.test.ts`; touched-file lint passed, 11 focused editor-panel tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued `FlowEditor` giant-hook extraction by moving route-import handling, layout-with-tab context, panel-visibility derivation, selection derivation, and warning/guard orchestration into `src/components/flow-editor/useFlowEditorShellController.ts`. Added focused hook coverage in `src/components/flow-editor/useFlowEditorShellController.test.tsx`; touched-file lint passed, 13 focused editor-shell tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Started `useFlowEditorActions` extraction by moving Mermaid, PlantUML, OpenFlow DSL, and Figma export side effects into `src/hooks/flow-editor-actions/exportHandlers.ts`, leaving the hook to delegate export behavior instead of embedding each async clipboard/toast flow inline. Added focused coverage in `src/hooks/flow-editor-actions/exportHandlers.test.ts`; touched-file lint passed, 7 focused export/action tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued `useFlowEditorActions` extraction by moving mindmap/ELK layout selection, full mindmap relayout, template insertion shaping, and deferred `fitView` timing into `src/hooks/flow-editor-actions/layoutHandlers.ts`. Added focused coverage in `src/hooks/flow-editor-actions/layoutHandlers.test.ts`; touched-file lint passed, 11 focused layout/export/action tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Started `StudioCodePanel` extraction by moving draft state, preview parsing, apply/reset behavior, and mode-switch handling into `src/components/studio-code-panel/useStudioCodePanelController.ts`, leaving `src/components/StudioCodePanel.tsx` primarily as render/layout code. Added focused controller coverage in `src/components/studio-code-panel/useStudioCodePanelController.test.tsx`; touched-file lint passed, 4 focused StudioCodePanel tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Started `useAIGeneration` extraction by moving DSL parsing, node-id reuse, edge normalization, and stable error mapping into `src/hooks/ai-generation/graphComposer.ts`, leaving the hook focused on request lifecycle, chat history, telemetry, and applying the composed graph. Added focused helper coverage in `src/hooks/ai-generation/graphComposer.test.ts`; touched-file lint passed, 4 focused AI-generation helper tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Continued `useAIGeneration` extraction by moving AI request/context serialization, chat exchange construction, and graph-generation pipeline orchestration into `src/hooks/ai-generation/requestLifecycle.ts`, leaving the hook mostly responsible for lifecycle state, telemetry, and applying results. Added focused helper coverage in `src/hooks/ai-generation/requestLifecycle.test.ts`; touched-file lint passed, 6 focused AI-generation helper tests passed, and `npm run build:ci` stayed green. |
| 2026-03-07 | Follow-on | Tested an alternate ELK loading strategy in `src/services/elkLayout.ts` using `elkjs/lib/main.js` plus a worker asset URL, but rejected and reverted it after measurement. The build emitted an extra `elk-worker.min-*` asset (~1.61 MB), `vendor-elk` stayed effectively flat (~1,458.22 kB -> ~1,458.31 kB), and Vite warned about unresolved `web-worker`, so the prior bundled-ELK baseline was restored and revalidated. |
| 2026-03-07 | Follow-on | Lazy-loaded app-shell modal surfaces instead of paying for them eagerly: `KeyboardShortcutsModal` now loads once from `App` only when shortcut help is open, and `WelcomeModal` now loads from `HomePage` only when local storage indicates it can appear. Touched-file lint passed, focused home/shortcut tests passed (14 tests), and `npm run build:ci` stayed green with `HomePage` dropping from ~47.5 kB to ~43.7 kB, `index` from ~845.1 kB to ~841.8 kB, and new lazy `KeyboardShortcutsModal-*` / `WelcomeModal-*` chunks emitted. |
| 2026-03-07 | Follow-on | Moved `ReactFlowProvider` and the global `@xyflow/react` stylesheet out of `App` and into the editor route/chunk. Touched-file lint passed, focused editor/home/shortcut tests passed (20 tests), and `npm run build:ci` stayed green. The JS gain was negligible (`index` ~841.8 kB -> ~841.9 kB, `FlowEditor` unchanged at ~699.6 kB), but entry CSS dropped materially (`index` CSS ~190.0 kB -> ~174.2 kB) with a new editor-only `FlowEditor-*.css` chunk (~15.9 kB). |
| 2026-03-07 | Follow-on | Tested a landing-route Lucide replacement by swapping marketing pages to a local icon set, but rejected and reverted it after measurement. `vendor-lucide` barely changed (~885.10 kB -> ~885.00 kB) while `LandingPage` grew (~78.2 kB -> ~85.4 kB), so the experiment was not a real payload win. |
| 2026-03-07 | Follow-on | Split interaction-gated menu bodies out of the eager editor path: `TopNavMenuPanel`, `ToolbarAddMenuPanel`, `ExportMenuPanel`, `ConnectMenu`, and `ContextMenu` now load only when opened. Touched-file lint passed, focused menu/editor/home regression tests passed (22 tests), and `npm run build:ci` stayed green with new lazy menu chunks and `FlowEditor` dropping from ~699.6 kB to ~683.6 kB while `FlowEditorPanels` also trimmed slightly (~140.8 kB -> ~140.7 kB). |
| 2026-03-07 | Follow-on | Split optional `FlowEditor` overlay surfaces out of the eager route payload: `PlaybackControls`, `FlowEditorEmptyState`, `FlowEditorLayoutOverlay`, and `CollaborationPresenceOverlay` now load only when their state is active. Touched-file lint passed, focused editor/collaboration/shortcut tests passed (18 tests), and `npm run build:ci` stayed green with new lazy overlay chunks and `FlowEditor` dropping again from ~683.6 kB to ~679.0 kB. |
| 2026-03-07 | Follow-on | Split `FlowEditorPanels` itself into a lightweight shell plus state-gated chunks for `CommandBar`, `SnapshotsPanel`, `StudioPanel`, and `PropertiesPanel`. Touched-file lint passed, focused panel/editor/home tests passed (14 tests), and `npm run build:ci` stayed green with `FlowEditorPanels` collapsing from ~140.7 kB to ~3.5 kB while new lazy panel chunks were emitted (`CommandBar-*` ~56.0 kB, `PropertiesPanel-*` ~59.0 kB, `StudioPanel-*` ~17.5 kB, `SnapshotsPanel-*` ~5.5 kB). |
| 2026-03-07 | Follow-on | Split `CommandBar` non-root views into state-gated chunks, keeping only the root search surface eager while deferring `AssetsView`, `SearchView`, `DesignSystemView`, `TemplatesView`, `LayoutView`, `LayersView`, and `PagesView` until navigated. Touched-file lint passed, focused command-bar/editor tests passed (9 tests), and `npm run build:ci` stayed green with `CommandBar-*` dropping from ~56.0 kB to ~11.6 kB while the deferred view chunks were emitted separately. |
| 2026-03-07 | Follow-on | Tested replacing Lucide imports inside already-lazy menu panels (`TopNavMenuPanel`, `ToolbarAddMenuPanel`, `ExportMenuPanel`, `ConnectMenu`, `ContextMenu`) with a local SVG icon set, but rejected and reverted it after measurement. Touched-file lint and focused menu/editor/home tests stayed green (22 tests), but `npm run build:ci` showed the change was noise rather than a win: `vendor-lucide` only moved from ~885.10 kB to ~884.92 kB while introducing another `MenuIcons-*` chunk (~6.7 kB), so the prior Lucide baseline was restored and revalidated. |
| 2026-03-07 | Follow-on | Lazy-loaded `ShareModal` from `src/components/top-nav/TopNavActions.tsx` so the collaboration dialog no longer sits in the eager editor route. Touched-file lint passed, focused share/editor tests passed (8 tests), and `npm run build:ci` stayed green with a new `ShareModal-*` chunk (~6.4 kB) and `FlowEditor` dropping from ~679.0 kB to ~673.0 kB while shared `vendor-lucide` remained flat. |
| 2026-03-07 | Follow-on | Split `StudioPanel` by active tab so `StudioAIPanel` and `StudioCodePanel` load only when their tab is shown. Touched-file lint passed, focused studio/editor tests passed (8 tests), and `npm run build:ci` stayed green with `StudioPanel-*` dropping from ~17.5 kB to ~1.4 kB while new `StudioAIPanel-*` (~6.2 kB) and `StudioCodePanel-*` (~10.7 kB) chunks were emitted. This improved the deferred studio path, though the main `FlowEditor` route and `vendor-lucide` remained effectively flat. |
| 2026-03-07 | Follow-on | Lazy-loaded `TopNav` from `src/components/FlowEditor.tsx` behind a fixed-height fallback shell so the editor route no longer pays the full top-nav chrome cost in its initial chunk. Touched-file lint passed, focused editor/share tests passed (8 tests), and `npm run build:ci` stayed green with a new `TopNav-*` chunk (~12.3 kB) and `FlowEditor` dropping from ~673.0 kB to ~661.7 kB while shared `vendor-lucide` remained flat. |
| 2026-03-07 | Follow-on | Lazy-loaded `Toolbar` from `src/components/FlowEditor.tsx` so the editor route no longer pays the full bottom-toolbar chrome cost in its initial chunk. Touched-file lint passed, focused editor/shortcut tests passed (16 tests), and `npm run build:ci` stayed green with a new `Toolbar-*` chunk (~6.0 kB) and `FlowEditor` dropping from ~661.7 kB to ~656.4 kB while shared `vendor-lucide` remained effectively flat. |
| 2026-03-08 | Follow-on | Tested splitting `IconMap` into a smaller static runtime set plus dynamic Lucide loading for picker/uncommon icons, but rejected and reverted it after measurement. Touched-file lint and focused icon/property/editor tests stayed green (11 tests), but `npm run build:ci` showed the dynamic Lucide path made the shared vendor chunk materially worse: `vendor-lucide` grew from ~885.1 kB to ~1,239.5 kB. Restored the previous `IconMap` / `IconPicker` baseline and revalidated the build. |
| 2026-03-08 | Follow-on | Started the UX polish pass by tightening three boundary surfaces: `MobileGate` now offers clearer large-screen guidance plus a docs escape hatch, `RouteLoadingFallback` now exposes branded accessible loading semantics, and `FlowEditorEmptyState` now explains the three entry paths with clearer hierarchy. Touched-file lint passed, focused fallback/editor/shortcut tests passed (14 tests), and `npm run build:ci` stayed green. The UX changes slightly increased the empty-state/lazy-shell assets (`FlowEditorEmptyState-*` ~2.0 kB -> ~3.1 kB; entry CSS ~174.2 kB -> ~174.8 kB), but this was an intentional polish tradeoff rather than a performance regression. |
| 2026-03-08 | Follow-on | Continued the UX consistency pass across home and docs surfaces: the home sidebar docs link now behaves like a first-class internal route instead of an external jump, the dashboard empty state now gives clearer “start blank / import / autosave” guidance, and the docs sidebar back action now references the dashboard instead of the canvas. Touched-file lint passed, focused home/loading tests passed (6 tests), and `npm run build:ci` stayed green. This polish slightly increased `HomePage-*` (~43.8 kB -> ~44.9 kB) and entry CSS (~174.8 kB -> ~175.0 kB), which is acceptable for the UX gain. |
| 2026-03-08 | Follow-on | Hardened dialog interaction quality across `KeyboardShortcutsModal`, `ShareModal`, and the home rename/delete dialogs: each now exposes explicit dialog semantics, closes on `Escape`, and lands initial focus on a predictable close control. Touched-file lint passed, focused share/home/shortcut tests passed (16 tests), and `npm run build:ci` stayed green. The only notable asset movement was the richer modal shells (`KeyboardShortcutsModal-*` ~3.7 kB -> ~4.0 kB; `ShareModal-*` ~6.4 kB -> ~6.8 kB; `HomePage-*` ~44.9 kB -> ~45.3 kB), which is an acceptable UX hardening tradeoff. |
| 2026-03-08 | Follow-on | Hardened command-bar interaction quality in `src/components/CommandBar.tsx` and `src/components/command-bar/RootView.tsx`: the surface now exposes explicit dialog semantics, captures/restores the previously focused control correctly before `autoFocus` runs, closes on `Escape`, and no longer relies on a mount-time `setTimeout` focus hack. Added focused coverage in `src/components/CommandBar.test.tsx`; touched-file lint passed, focused command-bar/editor/shortcut tests passed (14 tests), and `npm run build:ci` stayed green. Bundle impact was negligible (`CommandBar-*` ~12.0 kB, `FlowEditor` ~656.4 kB, `vendor-lucide` ~885.1 kB). |
| 2026-03-08 | Follow-on | Rolled back two over-designed UX surfaces based on product preference: `src/components/FlowEditorEmptyState.tsx` returned to the simpler three-action card without the extra explanatory tiles, and `src/components/app/RouteLoadingFallback.tsx` was reduced to a minimal branded loading shell with just title, description, and spinner. Touched-file lint passed, focused loading/editor/shortcut tests passed (14 tests), and `npm run build:ci` stayed green. This also trimmed the prior polish overhead (`FlowEditorEmptyState-*` ~3.1 kB -> ~2.0 kB; entry CSS ~175.0 kB -> ~174.6 kB). |
| 2026-03-08 | Follow-on | Simplified `src/components/app/RouteLoadingFallback.tsx` one step further based on product preference: removed the remaining logo/card branding so the route fallback is now only a centered spinner, title, and description. Touched-file lint passed, focused loading/editor/shortcut tests passed (14 tests), and `npm run build:ci` stayed green with a small additional trim in entry shell weight (`index` CSS ~174.6 kB -> ~174.3 kB; main entry JS ~823.0 kB -> ~822.4 kB). |
| 2026-03-08 | Follow-on | Finished the remaining keepable UX/accessibility backlog in one closeout slice: `src/components/SettingsModal/SettingsModal.tsx` now matches the newer dialog standard (dialog semantics, Escape close, predictable initial focus) without the old prop-sync effect, and `src/components/docs/DocsChatbot.tsx` now exposes labeled composers, a polite message log, and explicit focus management instead of relying on raw `autoFocus`. Added focused coverage in `src/components/SettingsModal/SettingsModal.test.tsx` and `src/components/docs/DocsChatbot.test.tsx`; touched-file lint passed, focused tests passed (18 tests), and `npm run build:ci` stayed green. |
| 2026-03-08 | Follow-on | Final closeout rerun passed: `npm run lint` passed, `npm run test -- --run` passed (147 files / 607 tests), `npm run build:ci` passed, and `npm run e2e:ci` passed after rerunning outside the sandbox because the local Playwright web server could not bind to `127.0.0.1:4173` under sandbox restrictions. Remaining gap is no longer quality-gate credibility; it is only the accepted heavyweight vendor debt (`vendor-lucide` ~885 kB, `vendor-elk` ~1.46 MB) and any future optional optimization work. |

## Deferred Until Gates Are Green

These are intentionally postponed until Phase R1 completes:

1. Large-store decomposition.
2. Giant-hook extraction.
3. Performance chunk work.
4. UX refinements not required to restore test/lint/build credibility.
