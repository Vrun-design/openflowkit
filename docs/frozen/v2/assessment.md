# Assessment of the original v2 roadmap

Date: 2026-09-19. Static implementation review at `e70e159`; this is not a full
production audit or a claim of competitor parity.

## What is right

Keep Pixi and the renderer-independent domain. Prioritize direct editing,
predictable connectors, and native Mermaid conversion. A separate opt-in editor
is a sensible containment boundary. Deferring templates and multiplayer protects
the focused builder workflow. Versioned contracts and acceptance specifications
are the correct foundations.

## Changes required before implementation

| Original assumption | Assessment and recommended correction |
| --- | --- |
| “Nothing is ported” | Use quarantine, not assumption. Re-specify behavior first. A small pure module may be reused only after passing v2 contracts and corpora. Existing GitHub/API/infra/DSL/collaboration tests do not establish product reliability. |
| Persistence is phase 7 | Too late for customers' work. Save/reopen, portable assets, undo, recovery, and JSON/SVG export belong in the first vertical slice. Every subsequent feature must round-trip. |
| Canonical is already written on every save | Conditional. `withCanonical` can omit the canonical field when projection fails. It is not proof of canonical-only persistence or ownership. |
| Every bridge/adapter is debt | Legacy round trips in the editing path are debt; import adapters, renderer projections, and storage migrations are permanent architectural boundaries. Delete by responsibility, not filename. |
| One model means no other representation | One authoritative editable document. Derived scene indexes, layout caches, previews, and immutable history snapshots are legitimate. They must not become independently writable documents. |
| Arrow routing can use the existing simple router | Useful starting point, not a quality guarantee. Its finite candidates can miss valid paths; fallback is not obstacle-checked. Evaluate a bounded search router behind a shared interface. |
| Agent registry means AI-native is done | It is a foundation. Selection-scoped proposals, previews, validation, cancellation, stale-result handling, and reliable acceptance are a separate product workflow. |
| Drop all families, then delete v1 | New family editors can be deferred. Existing customer documents still need a lossless preservation and access policy before retirement. |
| No inspector, ever | Prefer inline editing and a contextual bar. Keep an optional accessible details popover for exact values and infrequent properties; minimal should not mean undiscoverable. |
| Screenshots prove quality | They detect visual regressions, not binding integrity, keyboard access, history, recovery, or task completion. Add structural, interaction, and user checks. |
| One release is sufficient to delete fallback | Use compatibility, recovery, hardware, accessibility, and customer adoption gates. A release count alone is insufficient. |

## Verified implementation inventory

“Present” means code inspected. Tests listed here are existing assets unless
explicitly reported as executed in the delivery document.

| Area | Evidence | Consequence |
| --- | --- | --- |
| Production renderer | `src/components/FlowEditor.tsx`; `src/config/rolloutFlags.ts` sets `openCanvasEditorSurfaceV1.defaultEnabled: true` | Pixi is the default code path with React Flow fallback. Actual production deployment was not checked. |
| Document | `src/opencanvas/domain/document/types.ts` | Version 1 has `kind: string`, JSON content/appearance, nodes and connectors. Extend through migration; typed v2 shapes do not exist yet. |
| Connector semantics | Same types plus `domain/connectors/{routeProjection,editing,portAuthoring}.ts` | Anchors, ports, route ownership, waypoints, and multiple label records already exist. Do not describe the canonical model as handle-only. Free endpoints and stronger typed bindings need design. |
| Router | `domain/connectors/obstacleRouting.ts` | Checks a finite set of elbows/detours; returns a midpoint fallback when none clears. Cannot promise avoidance in all layouts. |
| Persistence | `src/services/storage/canonicalPersistence.ts`, `localFirstRepository.ts`, `persistedDocumentAdapters.ts` | Save adds canonical opportunistically; legacy remains involved. `createFlowTabsFromCanonical` has tests but no production caller found in the searched source. |
| History | `domain/commands/execute.ts`; `application/history/README.md`; production bridges | Canonical atomic commands and inverse history are reusable. Prove complete production ownership, not just kernel correctness. |
| Mermaid | `src/services/mermaid/importSceneProjection.ts`, `officialFlowchartImport.ts`, `importContracts.ts` | There is an import scene and explicit partial/unsupported statuses, but projection still imports legacy node factories/types. Extract a neutral boundary rather than rebuilding every parser. |
| AI actions | `src/agent/actions/index.ts`, `runAction.ts`, `runInStore.ts` | Six registered actions: read, add, connect, label, move, delete. Store integration still enters the current canonical bridge. |
| AI proposal kernel | `src/opencanvas/application/ai/sceneProposal.ts` | Preview and accept/reject functions exist; no production callers found for build/accept in the searched source. Staleness uses `updatedAt`; strengthen to revisions. |
| Provider pipeline | `src/services/aiService.ts` | BYOK/provider adapters exist; the diagram-generation edit prompt requests complete updated DSL. Shift scoped edits to proposals without assuming every AI surface uses this path. |
| Keys | `src/store/aiSettingsPersistence.ts`; `src/services/aiService.ts` | Storage masking is explicitly not encryption; Vite environment-key fallbacks exist. Never ship product-owned secrets in a public client build. |
| Offline shell | `public/sw.js`, `src/services/offline/` | Service worker exists. Runtime caching is not proof that every lazy editor/font/import dependency is available offline after installation. |
| Performance/accessibility | `benchmarks/browser/README.md`; `presentation/OpenCanvasSemanticSceneTree.tsx` | Useful harness and semantic tree exist. Historical status explicitly leaves real-GPU and manual assistive-technology checks open. |

## Owner-reported reliability correction

The existing GitHub/codebase diagram, API diagram, infrastructure sync, DSL and
collaboration experiences are reported as unreliable in real use. Their code and
tests are inventory, not a positive baseline. They are all `QUARANTINED` under
[the replacement policy](legacy-feature-quarantine.md). No v2 design, estimate,
marketing claim or Pro plan may depend on their current behavior.

Paths under `domain/` and `application/` in this table are relative to
`src/opencanvas/`. Historic status notes conflict on the renderer default and
remaining work. Prefer code plus current evidence; reconcile the record in V2-00.
The original numerical write-site counts were not remeasured in this review.

## Reference behavior and research

Use competitors as references for individual tasks, not as an unbounded parity
checklist. These official sources were checked on 2026-09-19; no live comparative
usability study was performed.

- FigJam documents connectors and quick-create workflows. Benchmark the effort
  to extend a flow and revise its connections against those tasks.
  [Connectors](https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam),
  [Quick create](https://help.figma.com/hc/en-us/articles/1500004291601-Build-faster-with-quick-create-in-FigJam).
- Miro documents connection-line editing and line jumps. Use this as a reference
  for editing discoverability; crossing bridges can remain a later refinement.
  [Connection lines](https://help.miro.com/hc/en-us/articles/360017730733-Connection-lines).
- tldraw documents persistent shape bindings and separates document/session
  snapshots. Those patterns support binding lifecycle and transient-state
  separation here; they do not require adopting its SDK.
  [Bindings](https://tldraw.dev/sdk-features/bindings),
  [Persistence](https://tldraw.dev/sdk-features/persistence).
- Pixi provides text systems and a DOM accessibility overlay; application-level
  text behavior, focus, and semantic navigation still need explicit engineering.
  [Text](https://pixijs.com/8.x/guides/components/scene-objects/text),
  [Accessibility](https://pixijs.com/8.x/guides/components/accessibility).
- Mermaid supports constructs beyond a small native flowchart subset. Publish a
  support matrix and diagnose unsupported constructs instead of claiming universal
  fidelity. Keep untrusted interaction directives disabled.
  [Flowchart syntax](https://mermaid.js.org/syntax/flowchart.html),
  [Security configuration](https://mermaid.js.org/config/usage.html).
- Browser storage can reach quotas or be evicted; persistent-storage requests do
  not replace portable backups. [MDN storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

The recommendations in the other documents are our design decisions, not claims
that competitors implement identical contracts.
