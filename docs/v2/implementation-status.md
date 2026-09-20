# Implementation status

Updated: 2026-09-20. This is the sole current execution record for the v2 program.
Use [delivery-roadmap.md](delivery-roadmap.md) for planned work, not this file as a
second backlog. Historical milestone approvals and test totals are not current gates.

## Current position

- Current specification set consolidated under `docs/v2/`, indexed at `docs/README.md`.
- Product strategy, interaction contracts, technical design, and full external-agent
  file/live requirements are documented. Technical spikes remain proposed.
- Reusable V2 presentation foundation is implemented; first consumer is the existing
  opt-in OpenCanvas camera controls. No canonical V2 editor/core has shipped.
- Next implementation slice: **V2-00 — baseline, compatibility fixtures, and customer
  workflow evidence**. Then V2-01 proves schema/geometry/migration contracts.
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
