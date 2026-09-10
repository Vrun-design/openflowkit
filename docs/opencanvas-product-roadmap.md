# OpenCanvas product roadmap

Status: accepted planning scope; not a shipment or implementation report.  
Updated: 2026-09-10

## Direction and scope

Build a free, open-source diagramming and whiteboarding tool with flexible
authoring, excellent connectors, structured intelligence, and portable files.
Structured diagrams, ink, text, tables, and media belong on one canvas.
Competitor breadth is inspiration; usable workflows determine completion.

This document supersedes the 2026-08-26 execution order in the internal Horizon
roadmap. Horizons remain engineering workstreams, not a shipping sequence.
All unchecked items below are requirements whose production completion must be
verified from implementation and current evidence. Some have existing kernels
or partial integrations; do not rebuild those merely because a box is unchecked.

Collaboration is excluded from this program: no multiplayer, presence, guest
rooms, shared voting, reactions, cursor chat, mentions, team permissions, or
network convergence milestones. Preserve existing code without expanding it.
Local annotations, undo, snapshots, diff, offline use, and standalone read-only
publishing remain in scope. Shape/icon asset catalog expansion is a separate
backlog. Native desktop packaging remains parked; offline web and self-hosting
are active requirements. AI is optional and must not gate ordinary authoring.

## Execution rules

Finish milestones in the order below. Pull prerequisites forward when needed;
do not postpone accessibility, text correctness, recovery, or measured performance
failures to a later polish milestone. Advanced optimizations require profiles.

Before implementing a slice, trace its production entry point, existing domain
commands, persistence, and tests. Record whether it is missing, kernel-only,
integrated behind a flag, or production-verified. Reuse existing implementations.
Split each milestone into reversible change sets with specific acceptance cases,
dependencies, rollout/rollback, and current validation evidence. Do not derive
completion percentages from change-set counts or historical test totals.

## M1 — One complete production editor

Dependencies: existing H1/H2 foundations; H11 input and H14 recovery throughout.

- [ ] Shared interaction controllers for production and evaluation surfaces;
  no independently maintained implementations of the same editing gestures.
- [ ] Renderer-neutral canvas API for camera, fit/focus, coordinate conversion,
  insertion, selection, clipboard, and export. All chrome uses the active canvas.
- [ ] Canonical document/store ownership; legacy data becomes an adapter, with
  validated multi-page migration and portable media preservation.
- [ ] Complete node/edge/canvas/multi-selection menus and keyboard equivalents.
- [ ] Insert, connect, reconnect, draw, rename, style, move, resize, rotate,
  group/ungroup, lock/hide, reorder, duplicate, copy/paste, and delete.
- [ ] Paste-in-place, style paste, external text/image paste, and file drag/drop
  use the current camera and preserve connections within copied selections.
- [ ] Undo/redo and save/reopen cover every operation and page, including freeform.
- [ ] Pixi default rollout after parity checks, with working React Flow fallback;
  removal only after an accepted fallback release and dependency audit.

Exit: create a mixed structured/freeform document in the normal editor, edit it
with menus and shortcuts, copy it to another page, undo/redo, reload, and export.
Verify the same saved document through fallback without silent loss. Toolbar
camera and insertion actions must act on the visible canvas at non-default zoom.

## M2 — Excellent everyday diagramming

Dependencies: M1; H3, H5, and basic H13 precision work.

- [ ] Quick-connect drag-to-create, keyboard sibling/child creation, repeated
  insertion, and context-aware next-node suggestions without requiring AI.
- [ ] Insert a node into an edge; replace a node kind while preserving compatible
  bindings, text, style, and IDs. Report incompatible semantics before applying.
- [ ] Connect anywhere, visible custom/semantic ports, fixed/dynamic anchors,
  self-loops, parallel edges, and compatible endpoint reconnection.
- [ ] Direct/polyline/Bézier/orthogonal/rounded routes, segment and curve handles,
  waypoint editing, crossing bridges, multiple draggable labels, and markers.
- [ ] Stable automatic routing with obstacle avoidance and preserved manual intent;
  selective rerouting, route reset, and keyboard-accessible connector editing.
- [ ] Scoped/anchored layout, pinned objects, protected routes, readable labels,
  and family presets that avoid rearranging unrelated content.
- [ ] Align/distribute/tidy, numeric geometry, rulers, draggable guides, grid,
  dimension/distance feedback, and reliable group/container transforms.
- [ ] Family editors for class/ER relationships, sequence messages and activations,
  mindmap growth/folding, journey stages, and architecture boundaries.

Exit: build and revise representative flowchart, architecture, ER/class,
sequence, and mindmap fixtures without repairing unrelated geometry. Connector
creation, rerouting, replacement, copy, undo, reload, and export preserve intent.

## M3 — Rich content and flexible whiteboarding

Dependencies: M1/M2 interaction contracts; H4, H11, H13, H14, and new H15.

- [ ] Rich text with mixed inline styles, lists, hyperlinks, alignment, wrapping,
  auto-size, Unicode/IME support, and matching editor/render/export measurement.
- [ ] Code blocks with language selection, readable highlighting, and copy text.
- [ ] Editable tables: rows/columns, headers, resize, cell selection, merged cells,
  keyboard navigation, spreadsheet paste, and CSV import/export.
- [ ] Cards, checklists, Kanban columns, and simple timelines as structured board
  content; compose shared table/container primitives rather than separate engines.
- [ ] Bulk stickies from pasted lines; deterministic grouping/clustering, tidy
  layouts, magnetic frames, and explicit behavior when entering/leaving a frame.
- [ ] Media crop/fit, image replacement without losing geometry, link previews,
  attached documents, PDF page placement, and supported video/web embeds.
- [ ] Embedded content has explicit activation, sandboxed execution, a readable
  unavailable/offline state, and portable poster/link fallbacks in exported files.
- [ ] Document-wide clean/sketchy appearance with deterministic seeded strokes,
  matching export, and unchanged semantic geometry and hit targets.
- [ ] Pen/touch-only editing UI: accessible tool switching, selection handles,
  contextual actions, palm rejection, and no essential hover/modifier-only action.
- [ ] Solo planning aids: local timer, personal annotations, and checklists;
  no shared workshop or voting infrastructure.

Exit: turn pasted notes, a spreadsheet, a PDF page, and a diagram into one
organized board; edit by keyboard and tablet; reopen offline with useful content
and explicit external-media fallbacks; export without clipped text or tables.

## M4 — Navigate, organize, and present

Dependencies: M1/M3; H13/H14 and new H17.

- [ ] Local folders/projects, tags, favorites, recent documents, rename/move,
  and workspace backup/restore without introducing a required account.
- [ ] Cross-document search plus in-document find/replace; scoped replacement
  previews, select-similar/type, saved selections, and searchable layers.
- [ ] Minimap, named views, breadcrumbs, object/page/document deep links,
  backlinks, and clear missing-target repair behavior after moves/imports.
- [ ] Drill-down diagrams and collapsible subgraphs with defined boundary-edge
  behavior; allowlisted object actions to navigate or toggle layer visibility.
- [ ] Reusable linked content/components with explicit update/detach actions,
  preserved instance overrides, and portable copies for missing source documents.
- [ ] Fullscreen keyboard presentation, ordered frames/views, spotlight/focus,
  local presenter notes, and camera-path walkthrough export.
- [ ] Standalone read-only HTML/viewer export with navigation and embedded local
  resources; no application account or collaboration service required.

Exit: organize several linked documents, find and replace scoped content, follow
links through collapsed views, then export a navigable presentation another
person can open without the editor's storage or a backend.

## M5 — Interoperability and free/open ownership

Dependencies: canonical contracts from M1; H8 and new H18. Baseline export and
offline checks apply from M1; this milestone expands formats and deployment.

- [ ] Editable draw.io and Excalidraw imports using supported fixture corpora,
  source provenance, explicit conversion decisions, and fidelity reports.
- [ ] Visio VSDX import compatibility slice after those formats: define supported
  objects/pages/connectors and retain/report unsupported content before mutation.
- [ ] Stable Mermaid/OpenFlow DSL synchronization with manual-layout ownership,
  unsupported-syntax reporting, and round-trip fixtures.
- [ ] SVG/PNG/PDF and clipboard output for selection/pages/zones/batches, with
  high-DPI, transparency, themes, font substitution/embedding, and print pagination.
- [ ] Portable document/workspace bundles include required local media and report
  external resources; selective restore resolves ID/link conflicts explicitly.
- [ ] Cancelable worker/batch export with progress and bounded memory.
- [ ] Offline web install/reopen/edit/export checks, including fonts and lazy
  editor chunks; distinguish downloaded resources from network-only content.
- [ ] Documented static/container self-hosting, subpath deployment, upgrade/backup
  instructions, and reproducible release artifacts without proprietary services.
- [ ] Core editing/import/export remains free and usable without AI, an account,
  telemetry, or a hosted service. Optional network features are explicit.

Exit: import real supported fixtures, edit and export them, restore a portable
workspace in a fresh browser profile, then complete the core workflow offline
and on a clean self-hosted deployment. No undocumented silent fidelity loss.

## M6 — Data-driven diagrams and technical intelligence

Dependencies: M1/M2, M3 tables, M5 file contracts; H5/H6 and new H16.

- [ ] Typed custom properties on nodes/edges with schemas, units, defaults,
  validation, and a property inspector independent of drawing appearance.
- [ ] CSV/JSON datasets and row-to-object bindings with stable keys, mappings,
  validation, and explicit missing/duplicate/deleted-row decisions.
- [ ] Refresh preview and atomic accept/undo preserve manually placed geometry,
  styles, and routes unless the user explicitly chooses replacement.
- [ ] Conditional color/badge/label rules, rule ordering, legends, filters, and
  data summaries; accessible non-color indicators and deterministic export.
- [ ] Data-to-diagram generation for hierarchy, dependencies, and schema relations;
  source adapters for code/infra with provenance and reviewable updates.
- [ ] Semantic lint, local fixes, family-aware suggestions, and stable code/diagram
  synchronization instead of destructive full regeneration.
- [ ] Optional AI selection edits, explanations, layout/route repair, screenshot
  interpretation, and streaming previews through the same canonical commands.
- [ ] Per-change accept/reject, cancel, stale-base protection, redaction, local
  model/provider choice, and honest unavailable/error behavior.

Exit: link a diagram to a dataset, change source values, preview and accept a
refresh, verify conditional formatting, then undo/reload/export with stable
geometry. Rejecting a data or AI proposal leaves the document unchanged. The
data workflow also works with AI disabled.

## M7 — Advanced authoring, scale, and extensions

Dependencies: prior usable workflows; H10/H12/H13. Fix regressions immediately;
schedule speculative optimizations only when representative profiles justify them.

- [ ] Vector point/curve editing, boolean operations, masks, per-corner radii,
  stroke alignment, and semantic-preserving conversion where supported.
- [ ] Auto-layout containers with wrap, hug/fill/fixed modes, child constraints,
  nested resolution, reusable components, and instance overrides.
- [ ] Incremental document projection, scene updates, text/media reuse, and
  explicit invalidation; no unnecessary whole-document work on selection changes.
- [ ] Profile 1k/5k/10k mixed objects with text, images, tables, and connectors;
  gate frame/input latency, first usable paint, memory, and idle rendering.
- [ ] Introduce atlases, dirty regions, progressive paint, and worker routing/
  measurement only against measured bottlenecks with before/after evidence.
- [ ] Public tool/panel/import/export/data-source contracts, version compatibility,
  capability boundaries, examples, and a contract-test kit.
- [ ] Headless document/export APIs and canonical MCP automation with the same
  validation/history rules; community extensions require no renderer internals.

Exit: precision fixtures survive boolean/container edits, undo, and export;
reference hardware passes recorded workload budgets; an external example can
add a tool or importer through public contracts without importing Pixi/React Flow.

## Horizon coverage and additions

| Workstream | Product ownership |
| --- | --- |
| H0 truth/safety, H1 document, H2 kernel | M1 foundations and every release gate |
| H3 connectors, H5 structured intelligence | M2 authoring; M6 source intelligence |
| H4 composition, H11 input fidelity | M1 parity; M3 flexible board content |
| H6 AI | M6 optional command-based intelligence |
| H7 collaboration | Parked; local history/diff belongs to H14 and M1 |
| H8 interoperability | M5 portability; baseline export required in M1 |
| H9 native desktop | Parked; offline web/self-hosting belongs to H18 |
| H10 extensibility, H12 scale | M7, with measured regressions fixed earlier |
| H13 precision/navigation | M2 essentials, M4 navigation, M7 advanced vectors |
| H14 local trust/discoverability | M1 recovery and M4 organization/presentation |
| H15 rich board content | M3 text, tables, media, sketchy style, tablet UX |
| H16 data-driven diagrams | M6 datasets, bindings, refresh, conditional rules |
| H17 workspace and navigable knowledge | M4 folders, search, links, linked content |
| H18 free/open deployment and ownership | M5 offline web, self-hosting, portable bundles |

## Definition of done

A capability is complete only when available from the normal editor and proven
through its relevant create/edit/copy/undo/save/reopen/export workflow. Domain
types, renderer support, isolated demos, or passing mocks alone do not qualify.

For each change set record:

- production UI entry point and implementation paths;
- supported object types, limits, failure states, and fidelity exceptions;
- keyboard/accessibility, touch where applicable, IME/RTL/localization, themes,
  reduced-motion behavior, and discoverability;
- deterministic commands, migration, local recovery, and export behavior;
- targeted automated checks and actual browser workflow evidence, with revision,
  flags, environment, and exit status;
- measured performance for affected workloads, rollout, and rollback.

Milestone acceptance includes observed user tasks: a new user completes a small
diagram without documentation; an experienced user revises a dense graph without
unintended layout changes. Record task completion, time, errors, and assistance;
use comparisons to improve the workflow, not to claim unsupported superiority.

## Comparison references

Scope references checked 2026-09-10; these are inspiration, not proof of our
implementation or promises of feature equivalence.

- [Miro features](https://miro.com/features/)
- [Miro tables](https://help.miro.com/hc/en-us/articles/22760922335506-Tables)
- [Lucid intelligent diagramming](https://app.lucid.co/platform/intelligent-diagramming)
- [Lucid shape actions](https://developer.lucid.co/docs/shapeactions)
- [draw.io editor configuration](https://www.drawio.com/docs/reference/configure-diagram-editor/)
