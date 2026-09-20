# Implementation status

Updated: 2026-09-20. This is the sole current execution record for the v2 program.
Use [delivery-roadmap.md](delivery-roadmap.md) for planned work, not this file as a
second backlog. Historical milestone approvals and test totals are not current gates.

## Current position

- Current specification set consolidated under `docs/v2/`, indexed at `docs/README.md`.
- Product strategy, interaction contracts, technical design, and full external-agent
  file/live requirements are documented. Technical spikes remain proposed.
- Opt-in `/v2/:id` editor, revisioned session, isolated storage and V2 presentation
  foundation are implemented. See V2-01/02/04 and V2-04e evidence below.
- Next roadmap slices: remaining V2-05 object authoring and V2-10a agent proposals.
  Open V2-00 customer/hardware gates remain requirements, not implied passes.
- No launch deadline. Pro implementation is deferred. Advanced source-backed review
  and walkthrough features are hypotheses, not implied v2 completion requirements.
- Legacy white-label and customer-facing design-system/theme-management UI are not
  v2 requirements. Preserve supported document appearance through migration, verify
  fidelity, then remove their old screens/store/hooks during V2-15.

## Baseline evidence

Static source review at `e70e159` is recorded in [assessment.md](assessment.md).
Pixi is default in the inspected code, with React Flow fallback. The current store
still involves legacy projections; canonical persistence is additive/conditional.
Agent operations exist but do not yet provide full authoring parity or live-browser
pairing through the file-based MCP server. Reverify this baseline before changing code.

During planning, four focused Vitest files passed (24 tests):

- `src/opencanvas/domain/connectors/obstacleRouting.test.ts`
- `src/opencanvas/application/ai/sceneProposal.test.ts`
- `src/services/storage/canonicalPersistence.test.ts`
- `src/agent/runAction.test.ts`

These results establish covered kernel behavior only. They do not establish v2
readiness, full browser parity, real-GPU performance, external-client connectivity,
accessibility, or customer usability. Full app build/browser/hardware suites were
not run for planning/document consolidation.

## Evidence recording rule

Documentation consolidation validation (2026-09-20): 142 archived files matched
their saved SHA-256 hashes; 18 active documentation files passed local-link/fence
checks and were confirmed not gitignored; `git diff --check` passed. The release
report script passed `node --check`, and `--write` created valid JSON at its new
`docs/evidence/` path without recreating the old wiki. The report itself exited 1
because its existing policy expects `openCanvasEditorSurfaceV1` to default off.
That historical policy conflicts with the inspected default-on implementation;
no release readiness pass is claimed and no runtime flag was changed here.

For every delivered slice append its change ID, revision/environment, changed
behavior, actual acceptance results, commands/evidence paths, rollback result, and
remaining limitations here. Do not mark an entire feature complete from a kernel
test or screenshot. Link to the delivery slice rather than copying its backlog.

Generated reports belong in `docs/evidence/` (ignored output), not the historical
archive. The legacy release-report tool has historical assertions such as all
OpenCanvas flags being off; it is diagnostic evidence, not the v2 release authority.
V2-00 must reconcile it with the current delivery gates before using it for release.


## DS-01 — reusable V2 presentation foundation (2026-09-20)

Owner directed this early foundation slice so other agents can implement the roadmap
against real React/TypeScript contracts. This does not mark V2-00/01/02/03/04 complete.

- Revision/environment: `e70e15904229f365ef7e41cd3cdfe9d2cc3651ac` plus working-tree
  changes; Node 25.8.1, macOS arm64. Existing unrelated edits preserved.
- Problem/result: replace ad-hoc design assumptions with scoped semantic tokens,
  native controls, proposal presentation, screen-space feedback and motion policies.
  Camera controls consume the system in the opt-in route and float outside the
  legacy header clipping region. Brand seed retained; contrast-safe variants added.
- Requirements: P-09, I-07/12/23/31–34 presentation foundation; complete journey gates
  remain open. Owner's latest instruction explicitly prioritizes these foundations.
- Exact code scope: `src/opencanvas/presentation/design-system/{tokens.ts,
  SystemRoot.tsx, Button.tsx, Field.tsx, Toolbar.tsx, Status.tsx, ProposalBar.tsx,
  canvasFeedback.ts, CanvasFeedbackOverlay.tsx, motion.ts, system.css, index.ts,
  foundation.test.tsx, architecture.test.ts, README.md, AGENTS.md}`;
  `OpenCanvasCameraControls.tsx`, `CameraMotionController.ts`, and
  `OpenCanvasDocumentPage.tsx` in the parent presentation directory.
- Reuse: existing React, theme preference adapter, camera callbacks and tested camera
  interpolation. New system itself has no legacy store/theme/provider imports.
- Data/flags: no schema, storage, history or rollout-default changes. First consumer
  remains behind existing document+renderer canary flags. Default build removes
  that route; shared camera timing retains its previous 180ms value.
- Scope corrections: rejected standalone HTML exploration and its check script
  removed. Earlier baseline tools/fixture inventory remain useful; no mockup is
  counted as production progress.
- Validation and limitations: see results appended below. Proposal UI does not
  replace permission/scope/revision/idempotency validation in the commit service.
  SVG adapter handles axis-aligned projected bounds only. Full menus/dialogs,
  canvas controller, real AI integration, native 200% zoom, touch/AT, GPU and
  customer-task acceptance remain open.
- Rollback: restore the three consumer/controller files to pre-slice versions and
  remove the new module. No user-data rollback or migration is needed. Flag-off
  build is verified; a physical revert/rebuild has not been performed.

### V2-00 baseline evidence captured during the same session

`node scripts/v2-baseline.mjs --write` recorded lexical dependency candidates and
source hashes; `--check-fixtures` verified six pinned repository assets. See
[baseline inventory](baseline-inventory.md) and [fixture manifest](baseline-fixtures.json).
Baseline build/bundle, lint, and four kernel files (24 tests) passed. Existing
production editor-surface suite: 10 passed, 1 failed at resize/rotate export
(`opencanvas.editor-surface.spec.ts:392`) before DS-01 implementation. This is an
open baseline failure, not a new-change pass. Logs are in `docs/evidence/v2-00/`.

### DS-01 validation results

- `npm run test -- --run src/opencanvas/presentation/design-system
  src/opencanvas/presentation/CameraMotionController.test.ts
  src/opencanvas/presentation/OpenCanvasDocumentPage.interaction.test.tsx`:
  **43 passed**, including both-theme contrast pairs, native/busy controls,
  stale proposal blocking, screen-space sizing, motion and AST dependency boundaries.
- Actual `/flow/:id?renderer=opencanvas` Chromium 145.0.7632.6 check passed for
  light/dark, rendered hover foreground, keyboard navigation, reset callback and
  reduced motion. Script: `scripts/check-v2-design-foundation.mjs`; screenshots/log
  in `docs/evidence/v2-foundation/`. Initial inspection found header clipping and
  dark hover color leakage; both corrected and rechecked.
- Live resize to narrow viewport switched away from the canary during verification.
  Cause is not isolated; responsive route acceptance is **not passed**. The final
  check covers desktop controls only. It must not be cited as 200%/tablet/AT coverage.
- Six pinned fixture hashes still match. `git diff --check` passed.
- Final `npm run lint` and `npm run build:ci` passed (typecheck, production build,
  bundle budgets). Entry JS 1142.2 KB, entry CSS 227.9 KB, lazy JS 8943.9 KB.
  Build used default flags; canary integration was verified through the local app
  browser check. No v2 release or full design-system completion is claimed.

## LAB-01 — V2 design lab route (2026-09-20)

Owner asked to visualize the shell direction and AI proposal flow before V2-04.
Storybook rejected (second render context, new toolchain); an in-app dev route was built.

- Scope: `src/opencanvas/presentation/V2LabPage.tsx`, `v2LabPage.css`; route
  `/_labs/v2` in `src/App.tsx` behind `VITE_V2_LAB=1` (not a rollout flag). Doc
  amendments in `docs/v2/design-system.md`, module README/AGENTS.md.
- Content: mock shell (top document bar, floating creation toolbar, context bar near
  selection, ProposalBar working→ready→applied plus stale path, feedback overlay,
  existing camera controls) and a primitives gallery (all Button/Field/Toolbar/Status/
  ProposalBar/feedback states, color roles, scales). Lab bar toggles light/dark via
  the app ThemeContext and comfortable/compact density.
- Validation: `tsc --noEmit`, `npm run lint`, `npm run build:ci` passed (lab absent
  from default `dist/`); design-system + App tests 24 passed. Chromium 1440×900
  screenshots of shell light/dark, proposal ready/applied, primitives light/dark
  rendered with zero console errors. Context bar initially overlapped a mock node;
  mock geometry adjusted.
- Not evidence for: V2-04, any journey gate, responsive/touch/AT acceptance. Mock
  shell has hardcoded data and no editing; it is replaced by the real shell.
- Rollback: delete the two files, the route block, and these doc paragraphs.

## DS-02 — overlay lanes, custom dropdown, loading language (2026-09-20)

Owner review of lab screenshots showed side panels overlapping the top toolbar
lane and the selection context bar, asked whether panels should dock instead,
and asked for custom (non-native) dropdowns plus first-class loading/thinking/
skeleton states. Decision: panels stay overlays per I-31/I-33 (docking reflows
the camera and spends the canvas budget permanently); collisions are fixed by a
lane/layer contract instead.

- Revision/environment: `e70e159` plus working-tree changes; Node v25.8.1,
  macOS arm64.
- Problem/result: agent/layers panels no longer cover doc/history controls or
  the context bar; canvas chrome uses a custom listbox; loading has a complete
  shimmer/busy/progress/cognition/error vocabulary; panel and toast entrances
  slide from their edges. Fixed a lab crash (`SkeletonLines` passed the
  nonexistent third `Array.from` callback arg) and a latent focus-return bug
  (unmount cleanups run after the browser resets focus, so every dismiss path
  now restores the invoker before unmount).
- Exact code scope: `design-system/{tokens.ts, system.css, Panel.tsx, Toast.tsx,
  Popover.tsx, Menu.tsx, Dropdown.tsx (new), Loading.tsx (new), Controls.tsx
  (NumberField draft/commit, ErrorState), Composer.tsx (@-key no longer
  swallowed), ProposalReview.tsx (roving focus, J/K/Home/End), CommandPalette.tsx
  (Home/End), AgentPanel.tsx (thread aria-busy), ColorPicker.tsx (unchanged
  after revert), index.ts, maturity.test.tsx (new, 10 tests)}`;
  `V2LabPage.tsx` (lane-correct panels, Dropdown in stroke popover and gallery,
  loading gallery, agent streaming demo); `ThemeContext.tsx` (export Theme
  type); module README (layers table, lane contract).
- Reuse: Popover collision/focus engine under Dropdown; menu-item/typeahead
  patterns shared with Menu; Status live-region pattern for Thinking.
- Data/flags: no schema, storage, history or rollout changes. Lab stays dev-only.
- Validation: `src/opencanvas/presentation` suite 168 passed (22 files);
  `npm run lint` clean; `tsc --noEmit` clean; `npm run build:ci` passed with
  unchanged budgets (entry JS 1142.2 KB, CSS 227.9 KB, lazy 8943.9 KB).
- Limitations: no browser/AT/200%/touch re-verification this slice; lab shell
  is still a mock with fake data; Dropdown typeahead tested, screen-reader pass
  pending; focus-return fix verified in jsdom only.
- Rollback: restore the listed design-system files plus `V2LabPage.tsx` and
  `ThemeContext.tsx` to pre-slice versions. No user-data rollback needed.

## V2-00 — baseline re-verification (2026-09-20, in progress)

V2-00 gate: hash fixtures; record current pass/fail and browser/hardware;
identify legacy families/assets/workflows; capture debt metrics and the UI task
baseline. No runtime flag; no user-data changes. Evidence below is additive to
[baseline inventory](baseline-inventory.md) and [fixture manifest](baseline-fixtures.json).

- Revision/environment: `e70e159` plus working-tree changes (docs consolidation,
  DS-01/DS-02/LAB-01); Node v25.8.1, macOS arm64, Chromium via Playwright.
- `node scripts/v2-baseline.mjs --check-fixtures`: **6/6 pinned hashes match**.
  `--write` refreshed `docs/evidence/v2-00/baseline.json` (source digest
  `4e55e1d…`, 904 production source files). Lexical debt counts unchanged from
  inventory: `useFlowStore` 60 files/214 occurrences, graph-write candidates
  37/122, React Flow imports 99/121, canonical→Flow projections 12/25,
  theme-management 4/5. DS-01/DS-02 additions introduced zero legacy signals.
- Kernel suites: 4 files, **24 passed** (connectors, scene proposal, canonical
  persistence, agent runAction).
- `npm run test:opencanvas:editor-surface`: **11 passed** (2.6 min), including a
  repeat single-spec run of resize/rotate (33.7s). The DS-01 open baseline
  failure (`editor-surface.spec.ts:392`) now passes twice consecutively; cause
  of the original failure is not isolated, so treat as resolved-but-unexplained
  until it survives the next two slice runs.
- `npm run lint`, `tsc --noEmit`, `npm run build:ci`: all pass; budgets
  unchanged (entry JS 1142.2 KB, CSS 227.9 KB, lazy 8943.9 KB).
- Current-product chrome anchor (existing `docs/evidence/v2-00/current-ui.json`,
  Chromium 145): 56px top strip; canvas bounds 1440×844 (93.8%) and 1280×744
  at 1440×900 / 1280×800. Bounds only — overlay occlusion not yet subtracted.
- Explicitly open (owner-led, not agent-blocked): FigJam/Miro chrome-ratio and
  reference-task measurements; customer pain-frequency research; legacy-family
  sample documents and themed/white-labelled migration inputs (see inventory
  gaps); three shell directions and accepted spatial budget (Astra-led).
- Rollback: evidence-only slice; revert this section and `docs/evidence/v2-00/`
  regeneration. Next: close the owner-led items above, then V2-01 schema/
  geometry/migration contracts.

## V2-01 — schema, geometry, migration contracts (2026-09-20, slices a–d delivered)

Recon first: versioned records (`SceneDocumentV1`), command/inverse builders,
and geometry services already exist; the slice fills the proven gaps only.
No runtime flag; no persistence/store changes; domain-only plus tests and three
ADRs. V2-02 still owns the revisioned commit service; V2-06 still owns
connector interaction and renderer adapters for free points.

- Revision/environment: `e70e159` plus working-tree changes; Node v25.8.1,
  macOS arm64.
- V2-01a migration policy (`oc/domain/document/migration.ts`): newer schemas
  return `reason: 'newer-schema'` with preserved bytes for read-only opening
  instead of a corruption error; `reason: 'invalid'` keeps path issues.
  Unknown fields at every level round-trip byte-identically through migrate,
  serialize, and re-migrate (tested). Decisions: [ADR-003](decision-records/ADR-003-migration-policy.md).
- V2-01b free endpoints (spike + types): `ConnectorEndpoint` is exclusive-or —
  bound (`nodeId`, null point) or free (null `nodeId`, required page-space
  point, null port/anchor), additive within schema v1 with absent-point
  tolerance for old payloads. One projection path resolves free ends to their
  point; bound-bound output is byte-identical (full existing suite passes).
  tsc guided 19 constructor completions across domain/application/
  infrastructure. Decisions: [ADR-001](decision-records/ADR-001-free-endpoints.md).
- V2-01c command inverses: one exhaustive test round-trips all 12 leaf kinds
  plus batch through apply/inverse with zero residue.
- V2-01d coordinates: nested-parent composition proven exactly; 90° rotation
  proven to swap bounds extents; automatic boundary binding proven to follow
  the true rotated outline (local top-edge midpoint lands on the world right
  edge, not the unrotated box). Decisions: [ADR-002](decision-records/ADR-002-geometry-conventions.md).
- Validation: `oc/domain` suite **210 passed** (42 files); `npm run lint`,
  `tsc --noEmit` clean. No bundle impact (no presentation changes).
- Limitations: free-point canvas handles/detach gesture belong to V2-06;
  single commit path with revisioned staleness belongs to V2-02; first-party
  shape records still use generic JSON (debt rule 6, owned by V2-05).
- Rollback: revert the `oc/domain` files, builder, ADRs, and README lines
  listed above; V1 payloads remain readable throughout (absent-point tolerance).
- Next: V2-02 canonical session/store and commit service with revisions.

## V2-02 — revisioned session and single commit path (2026-09-20, delivered)

- Code: `oc/application/session/{types,session}.ts` wrap `application/history`
  with a revision counter and `StaleSessionRevisionError`; undo/redo advance the
  revision like any commit. `agent/runAction.ts` exposes
  `resolveAgentActionCommand` so agent actions commit through the session.
  `v2Editor` rollout flag registered (off, `VITE_V2_EDITOR`), not yet consumed.
- Boundary: `session-boundary.test.ts` fails on any new direct
  `applyDocumentCommand` writer under `oc/presentation` or `active-document`;
  the four existing legacy writers are allowlisted and must leave the list
  when migrated (V2-15).
- Validation: manual/agent/import commits proven state-identical; full
  `src/opencanvas` suite 658 passed (129 files); `tsc --noEmit`, `npm run lint`
  clean. Two V2-01 leftovers fixed here: connector endpoint expectation and the
  canonical JSON golden hash both needed the additive `point: null` field.
- Next: V2-03 isolated durable v2 repository, ordered autosave, recovery, export.

## V2-04 — first v2 editor route (2026-09-20, delivered)

- Code: `/v2/:id` behind `v2Editor`, lazy chunk. `oc/presentation/v2/` composes
  the store-free Pixi stack: `V2EditorPage` + `V2Chrome` (doc bar, creation
  toolbar, camera controls) + `V2CanvasHost` (pointer, context bar, text
  overlay) + `V2TreePanel`; hooks `useDocumentSession`, `useV2Autosave`,
  `useV2DocumentLoad`, `useV2Camera`, `useV2Selection`, `useV2LabelEditing`,
  `useV2EditActions`, `useV2Keyboard`, `useV2Pointer`. Commands live in
  `v2EditCommands.ts`. `OpenCanvasSemanticSceneTree` and
  `OpenCanvasTextEditorOverlay` moved into `v2/` (legacy imports them from there).
- Boundary: `oc/v2Graph.test.ts` replaces the two earlier boundary tests: v2
  roots import only V2_ROOTS + SHARED_KERNEL + adoption allowlist
  (`pixiPointerOperations.ts`, moves in V2-05); legacy direct-writer ratchet kept.
- Validation: full suite 2263 passed (459 files); `tsc`, `eslint --max-warnings=0`
  clean. Browser gate `scripts/check-v2-04.mjs` against a flag-on production
  build: 04a–d + keyboard journeys pass; idle canvas area 96.4% (1440×900),
  95.5% (1280×800). Evidence in `docs/evidence/v2-04/` (ignored).
- Review fixes: camera is React state so text overlay and context bar track
  pan/zoom (the agent's "Escape leaves overlay mounted" hunt was an effect
  re-running every render plus a stale dev server reloading under Playwright);
  `useDocumentSession` single `advance` path; export round-trip test now
  deep-equals; dead helpers and trace logging removed.
- Limitations: one page, one layer; connector is bound-bound direct only;
  no agent proposal surface yet (V2-10). Camera state re-renders the page per
  pan frame — fine at current tree size, revisit if the tree panel grows.
- Interaction pass (same day): tools revert to Select after one create or
  connect and Escape disarms them; arrow tool drags from anywhere with ends
  bound where they land or free (ADR-001) and a target arrowhead; wheel pans,
  ⌘/Ctrl+wheel (pinch) zooms; text tool and double-click on empty canvas open
  the editor immediately (deferred until the node renders). Bottom-left now
  matches the lab: layers toggle + zoom menu, layers panel on the left, real
  logo. Gate extended for each behavior.
- Next: V2-04e UI polish against the lab shell; then V2-05 (moves
  `pixiPointerOperations`) and V2-10a agent proposals.

## V2-04e — current-surface interaction and appearance polish (2026-09-20)

Owner requested a polish pass over the shipped editor, explicitly allowing useful
V2-05 appearance controls to move forward. This is not completion of V2-05 or the
external-agent/connector release gates.

- Revision/environment: `ab731d1` plus working-tree changes; Node v25.8.1,
  macOS arm64, Chromium with SwiftShader for browser checks.
- Selection/input: restores renderer selection after document commits; canvas
  gestures ignore chrome/portal controls; a 4px drag threshold prevents click
  jitter from writing history; final release coordinates commit once. Resize and
  rotate handles and existing side-connect handles now respond. Free drag is the
  default, optional 16-unit snapping can be bypassed with Alt. Escape, lost capture,
  window blur, tool changes and document changes cancel active transforms.
- Preview: V2 opts into a separate live renderer for its current basic/text objects
  and affected connectors, hiding originals while previewing; heavy preview draws
  coalesce at animation-frame cadence. Canonical document, validation, autosave and
  history do not run per pointer move. Context bar follows preview bounds and
  clears the top/bottom chrome lanes and rotation handle; viewport resize updates
  its anchor. Existing legacy surfaces retain their transform preview behavior.
- Appearance: reused ColorPicker/Popover/Segmented/NumberField for shape fill,
  stroke, opacity, width and solid/dashed/dotted styles. Drafts preview transiently;
  committed edits use one batch through the document session, support mixed
  selection and undo, and persist in existing appearance records. Pixi and SVG
  consume the same stroke width/dash policy. Rectangle creation now creates a
  rectangle, with explicit portable paint defaults. Typography and stroke alignment
  remain later work; controls for unsupported properties are not exposed.
- Preferences/chrome follow-up: the logo opens the compact Settings panel; the
  document title now edits inline and commits through an undoable canonical
  `set-document-name` command. Settings includes light/dark/system, dot grid,
  snap, and a persisted canvas color with reset. Preferences remain separate from
  document history. Dots
  are one viewport-bounded Pixi graphic (adaptive spacing, no per-dot DOM or ticker).
  Narrow chrome truncates the title instead of overlapping export/history.
- Shared corrections: popovers measure untransformed layout dimensions and scroll
  within the viewport; color range keyboard gestures commit; free-end connectors
  are no longer filtered out of Pixi/SVG, including connector-only SVG output.
  Free connectors are also hit-testable in the editor now, and selected endpoint
  handles can be dragged onto a node or left at a new free canvas point. Stroke
  style and width controls use the full popover width with equal segments.
- Code: `presentation/v2/` input, context, settings/preferences and style-command
  modules; `infrastructure/pixi/{PixiRendererHost,PixiLiveTransformPreview,
  PixiDotGrid,PixiNodeRenderer,PixiSelectionOverlay,PixiConnectorRenderer,pixiColor}`;
  `domain/nodes/nodeStroke.ts`; `infrastructure/export/canonicalSvg.ts`;
  design-system ColorPicker, Popover and popover CSS.
- Validation: final full Vitest suite passed **2276 tests / 464 files**. ESLint,
  TypeScript, `git diff --check`, the V2 graph boundary, and
  `VITE_V2_EDITOR=1 npm run build:ci` pass; bundle budgets pass at 1143.4 KB
  entry JS, 227.9 KB entry CSS and 9039 KB lazy JS. Reproducible Chromium gate:
  `V2_BASE_URL=http://127.0.0.1:4191
  node scripts/check-v2-polish.mjs` against the flag-on production build. It passes
  create/select, repeated moves, live context-bar following, resize, Escape rollback,
  fill/stroke pointer and keyboard edits, undo/redo, idle-render stability,
  save/reload, inline rename, canvas color, free-arrow selection and endpoint drag,
  light/dark and 390×844 non-overlap with zero page errors. Images and
  result JSON are in `docs/evidence/v2-polish/` (ignored). `git diff --check` passes.
- Limitations: no physical touch/pen, manual screen-reader, Firefox/WebKit or
  large-document real-GPU benchmark claim. Live preview supports the currently
  offered families; expand it alongside future family/group authoring. Existing
  advanced connector semantics, text/export fidelity and full agent parity retain
  their roadmap gates. No migration or rollout-default change.
- Rollback: revert this slice's files to `ab731d1`; previous readers preserve
  appearance JSON but older Pixi rendering ignores newly exposed paint overrides.
  No storage migration is needed. Physical revert/rebuild not performed.

## V2-04f — interaction reliability and smoothness (2026-09-20)

Owner click-through of `1f8f025` reported: drags sometimes snap back, marquee
sometimes needs two tries, browser page zooms on aggressive pinch, overall jerk.

- Diagnosis: an instrumented headed Chromium logged the owner's real input.
  Chrome drops mouse pointer capture on trackpads when the button-up is seen
  before the `pointerup` (`lostpointercapture` ~2 ms early; the up then lands
  uncaptured). The old `onLostPointerCapture → cancel` threw the gesture away:
  6 drops in 10 s, each one a lost move or marquee. Headless Playwright cannot
  reproduce this; the capture window is the tool for input-feel reports.
- Fix: `useV2Pointer` no longer depends on capture — `lostpointercapture` is
  ignored, capture is re-acquired on the next move, and window-level
  `pointermove`/`pointerup` finish the gesture wherever it lands. Tripwire:
  `useV2Pointer.test.ts` "finishes a drag from a window pointerup".
  Second capture session: 56 drops, every gesture committed, 0 errors,
  0 long tasks, 0 frames over 34 ms.
- Smoothness (measured, headed Chromium, 30 labelled nodes): drag start/drop
  frame 24–26 ms → within one frame (`PixiNodeRenderer` pools label `Text`
  across redraws instead of destroy+re-rasterize); wheel pan dropped 35/90
  frames at 40 nodes → `PixiRendererHost.setCamera` only moves the world
  transform per event and settles dot grid/overlays/projection once per render;
  `useV2Camera` and the context-bar preview anchor coalesce React state to rAF.
- Zoom leak: ⌘/Ctrl-wheel and Safari `gesture*` are prevented on the whole
  `.ofk-v2` root, and pinch over the context bar zooms the canvas.
- Owner reconsidered sticky creation tools mid-slice; revert-to-Select after
  one create stays (unchanged).
- Validation: `tsc`, `eslint --max-warnings=0`, 2277 vitest / 464 files,
  `check-v2-04.mjs` and `check-v2-polish.mjs` against the flag-on build.
- Open: connector body drag inserts a waypoint (no whole-arrow move) — owner
  report unclear; V2-05 connector work. Firefox/WebKit not installed locally.

## V2-10a — agent proposals in the v2 editor (2026-09-20)

```text
change_id: V2-10a (commits 7d4f5d9, e7f2d58, 4861779, f347cc6, bf01abe, bf01abe+docs)
problem and user-visible result: an agent proposes edits inside /v2/:id; the
  user sees them as a ghost on the canvas and a per-change review list,
  accepts/rejects, applies the accepted set as ONE undoable history entry
  attributed to the agent, undoes it with ⌘Z, and is refused with a visible
  stale state if the document moved on. Provider-free: a deterministic local
  agent supplies three intents so the loop is testable offline.
requirement IDs / dependencies: agent-native-spec "Transactions and authorized
  autonomy" (expected revision, request id idempotency, typed stale conflict,
  attribution without provider keys); release gate 2 in miniature (agent and
  manual commits produce equivalent records). Depends on V2-02 session, V2-04.
existing implementation reused: application/ai/sceneProposal.ts,
  src/agent/actions + runAction.ts, design-system AgentPanel/ProposalReview/
  ProposalBar/ProvenanceBadge, PixiNodeRenderer/PixiConnectorRenderer,
  useV2Preferences, sr-only live region, useV2TestApi.
exact files touched: src/config/rolloutFlags.ts; src/opencanvas/v2Graph.test.ts;
  domain/commands/{types,execute}.ts (attribution); application/ai/
  {sceneProposal,proposalSession,localAgent}.ts + tests; application/session/
  useDocumentSession.ts (commit expectedRevision); infrastructure/pixi/
  {PixiProposalPreview.ts,+test,PixiRendererHost.ts}; presentation/v2/
  {useV2Proposal.ts,+test,V2AgentPanel.tsx,V2EditorPage.tsx,V2Chrome.tsx,
  V2CreationToolbar.tsx,useV2Keyboard.ts,useV2Preferences.ts,useV2TestApi.ts,
  v2EditorPage.css}; scripts/check-v2-10a.mjs; docs (this, ADR-004, HANDOFF).
feature flag and off-state behavior: v2Ai (VITE_V2_AI, default off). Off: no
  Agent button in the creation toolbar, ⌘J inert, getProposal() idle; nothing
  else changes (verified by the gate's flag-off block on port 4192).
schema/data impact: BatchDocumentCommand gains optional attribution; documents
  unchanged. Preference agentOpen added to localStorage prefs.
acceptance cases and observed results: unit — proposalSession (9: empty/dup
  rejected, preview = sequential apply, reject drops from preview and batch,
  null when nothing accepted, StaleProposalError at revision+1, attribution on
  batch and inverse, batches flattened, labels for all six action kinds incl.
  unicode); localAgent (4: add-step geometry+connector, precondition errors,
  label-unlabeled equals manual renames through the session, tidy-row);
  useV2Proposal (7: idle→ready, failed, decide+apply once+double-apply refused,
  stale on external commit, session stale rethrow, read-only never commits,
  discard); PixiProposalPreview (1). Browser gate check-v2-10a.mjs: ⌘J opens,
  request→ready, ghost visible via diagnostics, reject one → Apply (1), one
  revision, rejected connector absent, announcement text, ⌘Z restores prior
  document deepEqual, redo restores, mouse move → stale (Apply disabled, ghost
  cleared, stale copy visible), re-request ok, Escape chain
  (selection→panel), flag-off block, zero page errors.
commands run / revision / environment / evidence paths: npx tsc --noEmit;
  npx eslint src --max-warnings=0; npx vitest run; VITE_V2_EDITOR=1 VITE_V2_AI=1
  npm run build + vite preview :4191; VITE_V2_EDITOR=1 vite build (AI off) +
  preview :4192; V2_BASE_URL=http://127.0.0.1:4191
  V2_OFF_BASE_URL=http://127.0.0.1:4192 node scripts/check-v2-10a.mjs; plus
  check-v2-04.mjs and check-v2-polish.mjs. Node v25.8.1, macOS arm64, Chromium
  SwiftShader. Evidence: docs/evidence/v2-10a/{review,stale}.png, result.json
  (ignored).
rollback procedure and verified result: unset VITE_V2_AI (verified: gate flag-off
  block). Full revert: git revert the six commits; no storage migration.
  Physical revert not performed.
remaining limitations / next slice: local agent only (V2-11 providers); one
  exchange in the panel, no thread; agent-added nodes are catalog 'process'
  nodes (rounded) not the v2 toolbar rectangle — align when add_node grows a
  shape input; ghost draws basic/freeform families only; read-only docs reach
  the panel via ⌘J (creation toolbar is hidden read-only). Next: V2-10b
  capability manifest / operation parity, V2-05 connectors.
```
