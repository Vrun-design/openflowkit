# UI modernization and technical-debt retirement

Updated: 2026-09-20. This document is part of the current v2 plan. It defines how
the product shell and editor experience change while the core is rebuilt. The goal
is a coherent new product, not a new renderer hidden inside the old interface.

## Decision

Build a new v2 editor shell and canonical editor core inside the existing repository.
Keep the useful domain, Pixi, import, asset, export, and storage foundations behind
clean interfaces. Do not port the legacy screen composition, inspector-first UX,
legacy nodes/edges ownership, or duplicated interaction glue into v2.

This is a strangler migration: `/v2` becomes a complete vertical product, then
replaces the old editor when its migration and customer gates pass. V1 receives
customer-critical fixes only. New product capabilities land in v2.

## What gets rebuilt

- Canonical in-memory document ownership, revisioned transactions, session state,
  history integration, and selectors.
- Editor interaction controller: tools, pointer/keyboard/touch gestures, selection,
  transform previews, text editing, snapping, and connector editing.
- Editor shell and information architecture: document controls, compact toolbar,
  contextual actions, layers/pages, import, agent sessions, save/recovery status,
  presentation, and export.
- Typed shape, style, binding, technical-entity, source-reference, and view contracts.
- Full external-agent operation surface, file mode, and paired live-canvas mode.

## What is reused through adapters

- Pixi renderer host, camera/culling/LOD and measured performance harnesses.
- Candidate pure geometry, commands, validation, inverse history, asset storage,
  crash recovery, Mermaid parsers, ELK layout, icon catalog, canonical export and
  video encoding only after their behavior passes v2 contracts. GitHub/codebase,
  API/OpenAPI, infrastructure sync, DSL, collaboration and advanced MCP features
  are quarantined and receive no reuse presumption; see
  [the replacement policy](legacy-feature-quarantine.md).
- Brand identity and the smallest useful visual primitives: Builder Orange,
  restrained neutral surfaces and proven accessible behavior. Typography, spacing,
  density, control scale, component geometry and shell composition are redesigned.
  Reuse values or components only when they fit the v2 product contract. The old
  white-label/theme editor and design-system management architecture are not carried
  forward merely because they contain those values.

Reuse is earned by contract tests. A module is adapted, corrected, or replaced based
on behavior and dependency direction, not its age or filename.

## What is retired

- Legacy writable `nodes`/`edges` store ownership and write sites.
- React Flow as an editor implementation after the compatibility window.
- Production bridge/projection layers whose only purpose is legacy-to-canonical-to-
  legacy editing round trips. Import/migration and renderer projections remain valid
  architectural boundaries.
- Duplicate gesture implementations and evaluation surfaces that drift from the
  production controller.
- Inspector-first editing for ordinary properties, permanent AI/chat chrome, and
  feature-specific dialogs where inline or contextual interaction is clearer.
- Dead flags, abandoned diagram-family UI, redundant styling utilities, stale store
  hooks/selectors, and obsolete dependencies after their callers are removed.
- Legacy white-label, brand/theme-management and design-system catalogue UI; old
  theme store slices/hooks/import-export screens; duplicated palette/resolver layers;
  and customization abstractions without a validated v2 customer workflow.

Deletion happens after callers are migrated and rollback evidence exists. Track
removal by dependency responsibility; raw deleted-line count is not success.

## Target product shell

The person is a builder moving between code and a visual explanation, often on a
laptop with an agent open beside the canvas. The interface should feel like a calm,
precise instrument. The diagram dominates; controls appear where decisions happen.

1. **Top document bar:** file identity, page/view switcher, saved/offline/conflict
   status, undo/redo, share/export/present. Agent connection status is visible but
   never the visual center.
2. **Compact creation toolbar:** select/hand, shapes, connector, text, draw, technical
   assets. Common shortcuts are discoverable. The toolbar is not a catalogue wall.
3. **Context bar near selection:** style, route, marker, text and arrange actions
   relevant to the current object set. Mixed values are explicit.
4. **Optional utility panels:** pages/layers, source evidence, agent changes, and
   exact properties. Panels are task-specific, dismissible, and do not permanently
   reduce the canvas. Numeric and rare properties remain accessible.
5. **Command surface:** search actions, imports, objects, pages and agent operations.
   It complements visible controls; it does not conceal essential functionality.
6. **Canvas feedback:** handles, guides, binding modes, route diagnostics, agent
   proposals and source staleness appear on the objects they affect.

Responsive behavior is structural. On narrow screens, utility panels become sheets,
the contextual bar wraps/collapses by priority, and creation/undo/export remain
reachable. Tablet interaction does not depend on hover or modifier keys.

This shell is a replacement, not a visual refresh of the current shell. No v2
screen is accepted because it preserves familiar legacy placement. The current UI
is evaluated for workflows and migration dependencies only. The selected v2 shell
must demonstrate clearly different spatial composition, hierarchy, density, and
progressive disclosure while retaining recognizable OpenFlowKit identity.

At the common 1440×900 laptop viewport, idle persistent chrome targets at least 85%
usable canvas area, pending the V2-00 competitor measurement. Test 1280×800 as a
first-class working viewport. Record the number of simultaneous permanent bars,
canvas-area ratio, panel occlusion, fit padding, and unnecessary zoom corrections.
Default camera framing must show a useful working neighborhood around content.

## V2 visual foundation

Use [the preserved visual reference](design-system.md) as evidence, then create a
new internal v2 token and primitive layer. The reference now defines the target and
explicit redesign boundary; existing runtime values are inputs to audit. This is an implementation foundation,
not a customer-facing “design system” feature. Required token families:
canvas/surface elevation,
four text levels, border intensity, selection/focus, semantic status, control states,
spacing, radius, typography, motion duration/easing, and canvas handle sizes.

Use Builder Orange for primary action, focus, selection, or active connection. Use
diagram colors for authored meaning, not application decoration. Prefer quiet borders
and surface shifts to nested cards or heavy shadows. Motion communicates selection,
panel state, connection and proposal changes in roughly 150–250ms; canvas dragging
and drawing respond immediately. Respect reduced motion.

Every reusable control includes default, hover, focus, active, disabled, loading,
error, keyboard, touch, light/dark, localization and screen-reader behavior where
applicable. Avoid building custom controls when familiar platform behavior is better.

V2 launch has one coherent OpenFlowKit application theme plus authored diagram
styles. It does not ship the old white-label/theme-builder/catalogue surfaces.
If customers later demonstrate a real need for organization branding, define a new
portable branding contract against the v2 model. Do not revive legacy store/UI code.

Existing documents may contain custom colors, fonts, or theme references. Migration
must resolve those into portable document-level appearance values or a clearly
reported fallback. Preserving what a diagram looks like does not require preserving
the UI or abstraction that originally produced it.

## UI acceptance journeys

- First visit: start blank, paste Mermaid, open/import a local document, or connect
  an agent without navigating a dashboard or template gallery.
- Manual editing: complete J1 with contextual controls and no required legacy
  inspector. Common actions are discoverable without memorizing shortcuts.
- Agent editing: connect a named document, understand permission/scope, see changes
  on canvas, inspect/reject/undo, and continue editing manually.
- Technical diagram: inspect source evidence and staleness without cluttering an
  ordinary freeform diagram.
- Failure: offline, quota, provider, import, graphics and conflict states explain
  what is safe, what failed, and the next recovery action.

Test these with existing customers using realistic documents, not only component
screenshots. Include keyboard-only, touch, screen reader, 200% zoom, long/localized
labels, dark mode, reduced motion and small laptop viewport coverage.

## Debt controls that prevent v3 debt

1. Domain never imports React, Zustand, Pixi, browser APIs, providers, or legacy types.
2. Presentation cannot mutate records directly; all writes use typed transactions.
3. One production controller owns each gesture. Tests drive that same controller.
4. Manual UI, built-in AI, external agents, imports and MCP use the same operation
   registry and validation rules.
5. A new authoring capability is incomplete without persistence, undo, export,
   accessibility, agent coverage, migration/future-version behavior, and rollback.
6. No generic `content`/`appearance` JSON for first-party v2 shapes. Extensions are
   namespaced, bounded and preserved opaquely.
7. No feature-specific color/spacing values outside tokens; no new shared component
   when an existing primitive can be extended coherently.
8. No compatibility code without an owner, removal condition, and evidence gate.
9. Measure dependency direction, bundle/interaction performance and legacy imports
   continuously. Do not defer cleanup to a final rewrite phase.
10. Keep current status separate from plans. A testable slice is the unit of progress.

## Required architecture enforcement

Add automated dependency boundaries once the v2 module roots exist. CI should reject
domain imports from infrastructure/presentation, direct store writes outside the
commit service, legacy types entering v2, and UI imports into agent/domain packages.
Add a v2-only typecheck/test target and an actual-route browser suite. Record temporary
exceptions in a small allowlist with owner and expiry/removal slice.

Track these debt signals per milestone:

- remaining legacy writers/readers used by production v2;
- compatibility adapters and their removal gates;
- duplicated gesture/controller implementations;
- untyped first-party records and unsafe extension reads;
- feature flags older than their decision window;
- bundle size, input latency, memory and save/migration time;
- UI primitives duplicated outside the shared system;
- capabilities lacking agent or accessibility equivalence.

## Delivery integration

UI design and debt removal run through every vertical slice. They are not a polish
phase after the engine.

- V2-00: inventory user journeys, current navigation/components, legacy dependency
  graph, duplication, performance, accessibility and visual inconsistencies. Capture
  representative screenshots and task recordings with permission. Measure current,
  FigJam and Miro chrome/canvas ratios, control scale, default fit, panel occlusion,
  and common task correction counts. Produce three materially distinct v2 shell
  directions on the same realistic document and accept one before V2-04.
- V2-01: freeze module boundaries, typed records and migration/compatibility ownership.
- V2-02: establish the only commit/operation path plus automated architecture checks.
- V2-04: deliver the first real v2 shell with tokens, document status, toolbar,
  contextual actions and recovery, alongside the minimal working canvas.
- V2-05 through V2-12: add complete vertical capabilities and retire displaced code
  after each behavior is proven.
- V2-13: full product-shell usability, accessibility, responsive, hardware and
  visual-consistency qualification, plus appearance migration/export fidelity for
  legacy themed and white-labelled documents.
- V2-14: default flip only when new workflows no longer depend on legacy UI.
- V2-15: remove React Flow, old store ownership, obsolete shell/components/flags,
  legacy white-label/design-system screens, store slices, hooks,
  theme catalogues and obsolete styling dependencies after migration evidence passes.

The result should feel like one newly designed product while remaining a safe
migration for existing customers.
