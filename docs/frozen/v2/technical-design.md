# Technical design document

Status: proposed, 2026-09-19. New contracts below are design sketches, not existing
APIs. Validate migrations and geometry with fixtures before freezing schema v2.

## Architecture and ownership

Retain React for application chrome, Pixi for rendering, and the existing pure
geometry/command foundations. Zustand may remain a subscription mechanism;
changing state libraries is not the objective. The objective is one authoritative
document and one mutation pipeline.

```text
Pointer / keyboard / menus / Mermaid / BYOK AI / MCP
                         |
                 typed editor operations
                         |
             validate -> atomic transaction -> inverse history
                         |
                canonical document + revision
                    /          |           \
          local persistence   scene view    canonical export
                                |
                      Pixi + DOM text + semantic tree
```

Dependency rule: domain imports no React, Zustand, browser globals, Pixi, or
React Flow. Application orchestrates commands and ports. Infrastructure implements
storage, measurement, workers, providers, and drawing. Presentation owns gestures,
focus, and controls. Transport-specific MCP/WebMCP code calls the same operations.

| Responsibility | Existing starting point | v2 action |
| --- | --- | --- |
| Typed/versioned records | `src/opencanvas/domain/document/` | Extend with explicit v2 schema and migrations; retain v1 reader. |
| Transactions/history | `domain/commands/`, `application/history/` | Treat inverse/batch behavior as a candidate; reuse only after v2 command, failure and persistence contracts pass. Add a revisioned application commit boundary. |
| Geometry/bindings/routing | `domain/geometry/`, `domain/connectors/` | Extend geometry contract, endpoint types, binding index, and router result. |
| Renderer/export | `infrastructure/pixi/`, `infrastructure/export/` | Adapt to v2 records and shared presentation layouts. |
| Production input | `presentation/OpenCanvasSurface.tsx`, `pixi*Operations.ts` | Extract shared controller used by the actual v2 route and tests. |
| Storage/assets | `src/services/storage/` | Introduce isolated v2 records and canonical-first repository without legacy write-back. |
| Import/layout | `src/services/mermaid/`, `src/services/elk-layout/` | Extract neutral import IR and use existing worker capability where browser-independent. |
| AI | `src/agent/`, `application/ai/sceneProposal.ts`, `src/services/aiService.ts` | Extend registry and proposals; adapt BYOK transport. |

Unqualified domain/application/infrastructure/presentation paths above are under
`src/opencanvas/`. Suggested new modules should be placed within these boundaries,
not in a parallel general-purpose editor framework.

## Document, session, and derived state

Persist document ID, schema version, revision, pages, ordered layers, objects,
bindings, style definitions, asset references, provenance, and namespaced extensions.
Keep camera, selection, tool, hover, open panels, composition, and pointer previews
in session state. Cached bounds, spatial indexes, tessellation, measured text,
and computed routes are derived and invalidated by relevant revisions.

Do not persist Pixi objects, legacy nodes/edges, DOM measurements, provider keys,
or AI request state inside the document. Immutable proposal snapshots are allowed;
they cannot save or mutate the live document until accepted.

Recommended schema sketch:

```ts
type Endpoint =
  | { kind: 'free'; point: Point }
  | { kind: 'bound'; shapeId: ShapeId; mode: 'dynamic-perimeter' }
  | { kind: 'bound'; shapeId: ShapeId; mode: 'fixed-perimeter'; anchor: LocalAnchor }
  | { kind: 'bound'; shapeId: ShapeId; mode: 'port'; portId: PortId };

type RouteIntent = {
  kind: 'straight' | 'elbow' | 'curve' | 'polyline';
  ownership: 'automatic' | 'manual' | 'imported-fixed' | 'hybrid';
  waypoints: readonly Point[];
};

// ShapeContent is a discriminated union with per-kind runtime validation.
// ConnectorRecord remains a dedicated record with endpoints, labels, and intent.
// Both participate in a common object selection/order/transform API.
```

Keeping connectors as dedicated records extends the existing domain with less
disruption than converting every edge to a generic shape. There must be only one
connector representation in v2; legacy freeform arrows migrate into it. This
choice does not prevent uniform tools or rendering. Prototype free/bound endpoint
round trips before finalizing.

Retain `polyline` for authored/imported paths that cannot be represented by an
orthogonal elbow or a curve without changing geometry. The primary UI can offer
straight/elbow/curve while exposing preserved polyline handles when selected.
Changing an imported route kind is an explicit user action, not a migration side
effect. Likewise, represent existing line objects as connectors with no markers.

Basic shapes have typed geometry, text, appearance, and metadata. Optional technical
semantics and import provenance are separate from visible geometry. Preserve unknown
extension payloads opaquely with size limits; do not interpret them as executable
code. Groups own transforms; frames own explicit members/bounds. Specify parent-local
coordinates and local/world transforms once; convert current coordinate conventions
in migration. Reject cycles and dangling page/layer/parent/asset references.

Use constrained style tokens plus explicit custom-color/size overrides. Documents
must retain enough theme values to render without a user's current global theme.
Persist deterministic stroke seeds for sketchy styles if that feature is added.

## Transactions, revisions, and performance

An editor operation resolves IDs, checks locks/scope/preconditions, builds one
canonical command or batch, validates the complete result, and commits once.
History records the inverse. Revision increases on every committed document
change, including undo/redo; timestamps are metadata, not concurrency tokens.
Selection updates after commit do not contaminate document history.

Pointer movement updates a transient preview at animation-frame cadence. Pointer-up
commits one transaction; cancellation commits none. Avoid serializing, projecting,
or validating the whole document per pointer event. Initially reuse full validation
at commits and file boundaries; optimize to incremental validation only when profiles
show a need and equivalence tests protect invariants.

Use affected-object indexes for bindings and spatial queries. Worker jobs carry
document/page/revision and cancellation tokens; stale results are discarded.
Deferred routing/layout applies through the command pipeline only when still valid.
No asynchronous worker is allowed to overwrite newer manual edits.

## Shape geometry and connectors

Define one geometry interface per supported kind: local outline, bounds,
hit-test, boundary projection, and port positions. Rendering, routing, selection,
snapping, and export consume it. A rectangle bounding box is not an ellipse or
diamond perimeter. Transform endpoint anchors through the complete parent chain.

Maintain a reverse binding index from shape ID to connector endpoints. Shared
lifecycle logic covers move/resize/rotate, delete, replace, duplicate, reparent,
and page transfer. A port that disappears on replacement must produce a repair
decision; never silently attach to an unrelated port.

Route interface returns points/curves plus status: `clear`, `constrained`, or
`unresolved`, and diagnostics. Preserve user intent when a clear route cannot be
found. The existing candidate router remains a baseline; compare it with a bounded
orthogonal visibility/grid search spike on the same fixtures. Select using route
quality, stability, latency, bundle cost, and maintenance cost. Any external
dependency requires a separate license/maintenance check before adoption.

Score routes with length, bend count, clearance, and deviation from the prior
route; use stable tie-breaks. Inflate obstacles by clearance/stroke size, model
endpoint escape corridors, and account for rotated outlines conservatively.
Recompute only dirty connectors. During drag prefer responsive preview; on release
resolve avoidance with a time budget. Budget exhaustion returns a diagnostic,
not a claim of successful avoidance. ELK handles graph layout, not each pointer move.

Fixtures must include nested frames, dense obstacles, blocked corridors,
self-loops, parallel/reverse edges, labels near bends, rotated shapes, manual
waypoints, and movement sequences that would otherwise make routes flicker.

## Text and accessibility

Inject a `TextMeasurer` interface into layout; browser infrastructure owns font
loading and canvas measurement, tests supply deterministic measurements. Cache by
font/style/content/wrap width. Produce shared line boxes and baseline positions for
Pixi and SVG/export. Treat fallback font loading as layout invalidation, not silent
clipping. Avoid claiming cross-browser pixel identity; test containment and baseline
tolerances on supported browsers.

Use a DOM editor overlay for selection, IME, clipboard, and native text editing.
The canvas semantic tree shares selection and operations with pointer interaction.
Expose object names, connection direction, lock state, and keyboard actions. Large
documents need bounded accessible navigation/search rather than thousands of
unmanaged focus targets. Test actual assistive technology before release.

## Durable local storage and migration

First v2 slice saves v2 documents independently. Migration reads a v1 snapshot,
retains the untouched source, validates a converted copy, and opens that copy.
Never overwrite the only original. Use isolated record/store identifiers and an
additive IndexedDB upgrade; changing the URL to `/v2` alone does not isolate storage.

Migration pipeline: detect format/version -> validate input -> normalize through
legacy adapter -> migrate to typed v2 -> integrity/fidelity report -> validate
references/assets -> commit copy. Future schema versions must be rejected safely
or opened read-only with an export path, never coerced down by the old editor.

Unsupported legacy family content retains its raw payload and a useful preview;
route users to retained v1 editing when needed. Native conversion and read-only
preservation must be distinguished. Do not retire v1 while a required existing
workflow only works there. No promise of a lossless v2-to-v1 downgrade.

Repository contract: autosave is ordered by revision; a saved indicator is shown
only after durable commit. Use atomic IndexedDB transactions for related records
where possible; otherwise stage assets first, commit references second, and garbage
collect only unreachable staged assets after a recovery-safe retention period.
Keep last-known-good snapshot/journal, surface quota/unavailable errors, and offer
portable backup. Detect multi-tab revision conflicts and fork/reload explicitly
rather than using silent last-writer-wins.

Portable bundles contain manifest, versioned document, referenced asset bytes,
hashes, and required theme data. Validate paths, sizes, MIME types, and hashes on
restore; remap ID collisions. Do not garbage collect original migration assets
until source backup retention is satisfied. Plain JSON export must either embed
assets or clearly explain external dependencies.

Offline readiness requires app shell, v2 chunks, fonts, supported importer/layout,
and export dependencies. Test a fresh profile: install/load required resources,
disconnect, reload into v2, create/import/edit/export. External icons/media need
an explicit downloaded/local state. Coordinate service-worker updates with build
manifests and retained old chunks so an open editor does not mix incompatible builds.

WebGL loss should preserve the document and support renderer recreation. Before
removing React Flow, ship a canonical read-only SVG/download recovery mode; do not
attempt a lossy runtime downgrade of arbitrary v2 documents into the v1 editor.
Manual editing may be unavailable on unsupported graphics hardware until restored,
but saving/exporting work must remain possible.

## Mermaid import and source ownership

Pipeline: source -> validation/parser -> neutral semantic import IR -> fidelity
classification -> theme/text sizing -> scoped layout -> native records/bindings
-> preview -> one insert transaction. Reuse the existing import scene boundary,
but remove its dependency on legacy `FlowNode`, node factories, and handle IDs.
Some official parser/render steps currently need DOM measurement; do not assume
the entire import can move to a worker. Move only browser-independent work.

IR stores stable source IDs, edge identity including parallel edges, labels,
shape kinds, subgraph hierarchy, direction, styles, and source locations when
available. Retain original text, parser version, ID mapping, and diagnostics.
Measure text before layout. Theme application preserves semantic colors where
requested and offers a preview of restyling; topology never depends on styling.

Publish a versioned support matrix for flowchart syntax, shapes, labels, markers,
subgraphs, styling, and directives. Distinguish invalid source, fully editable,
partially editable, unsupported construct, and unsupported family using the existing
status vocabulary. Partial conversion needs informed selection of an alternative:
preserved source with preview, explicit partial native import, or cancel.
Sanitize SVG/image fallbacks and disable executable links/callback directives.

Import is a one-time conversion in the initial release. After visual edits, source
is marked as the imported original, not a synchronized truth. Mermaid export
serializes the supported current graph with diagnostics; it cannot promise exact
whitespace, comments, styles, or round-trip layout. Reimport defaults to a new
selection/page. Merge/reconciliation is later work requiring stable identity and
manual-layout ownership, not an automatic parser upgrade.

## BYOK AI and agent operations

Full external-agent control is also required: see the
[external-agent contract](agent-native-spec.md). It defines capability parity,
file/live ownership, visual feedback, and authorized direct-edit sessions. The
proposal workflow below describes built-in AI and external propose-for-review
mode; already-authorized direct agent edits use the same transaction kernel
without requiring a preview acceptance click for every action.

Provider transports and the action registry are candidates behind new interfaces,
not trusted foundations. Reuse only after the new capability, cancellation, error,
privacy and revision tests pass. First user-facing operations:
generate a flow, extend a selection, rewrite selected labels, and propose a branch
change. Tidy/layout is deterministic and must work without AI. Add typed action
definitions only as corresponding manual operations become available.

Pipeline: choose provider/context -> serialize bounded semantic context -> request
structured operations -> validate schema/limits/scope -> execute on a sandbox copy
-> geometry/layout -> show diff -> accept one transaction. Never execute model code
or mutate the scene from partial streamed output. Imported text is data, not authority
to invoke tools, expand context, or transmit files.

Proposal stores base document/page/revision, permitted object scope, affected IDs,
operations, preview, and diagnostics. Whole-proposal accept/reject is the first
release behavior. Partial acceptance requires dependency groups: a new edge cannot
be accepted if its proposed endpoint was rejected. Reuse `sceneProposal.ts`, but
replace timestamp-based staleness and prove dependency validation before exposing
individual change acceptance. Repeated accept is idempotent; stale proposals require
regeneration or an explicit validated rebase.

Selection scope includes only selected content plus the minimum boundary references
needed for valid edits. Show scope before transmission; expanding to a page is a user
choice. Do not send the whole workspace, hidden content, assets, or chat history by
default. Apply read-only/lock/scope policy equally to human and automated entry points.

Provider capabilities are tested rather than assumed: schema output, streaming,
cancellation, browser CORS, local endpoints, model limits, and safe error handling.
Unsupported browser access gets a clear explanation and a compatible provider/local
endpoint choice; no hidden hosted proxy. Never bundle shared provider secrets.
Default to session-only keys; make remembered keys explicit and accurately describe
browser-storage limits. Redact keys/prompts from logs and diagnostics. Provider
charges are external to the free editing product. No guarantee that cloud AI works
offline; a user-configured local model is optional, not a required new runtime.

Evaluate invalid operations, nonexistent IDs, out-of-scope edits, locked records,
provider interruption, cancellation races, stale revisions, duplicate acceptance,
and undo. Deterministic fixtures must pass independently of live model quality.
