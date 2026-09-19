# Plan — Pixi parity → agent-native OpenFlowKit

Approved 2026-09-19. Two tracks. Track A is serial; Track B runs in parallel
and never touches the renderer. Every slice: tsc + lint + vitest green, then
browser proof where the slice is user-visible.

## Track A — Pixi reaches React Flow parity, then becomes default

| # | Slice | Done when |
| --- | --- | --- |
| A1 | Unsized legacy nodes grow to their label on Pixi (root: `legacyNodeSize.ts`) | long label on an unsized node is fully visible on the surface; unit test; no size persisted back |
| A2 | Inline editing for class/ER/sequence/mindmap family fields on the surface | double-click a family field edits it, same as React Flow |
| A3 | Playback / cinematic export on the surface | `usePlayback` + animated export work with Pixi mounted |
| A4 | Browser proofs: resize/rotate, PNG/PDF export, family editing | editor-surface Playwright spec covers them |
| A5 | Flip `openCanvasEditorSurfaceV1` default on; release with React Flow fallback live | one tagged release; fallback path browser-verified |
| A6 | Store ownership flip (legacy becomes adapter) | after A5; own change set |

## Track B — agent-native

Principle (from BuilderIO/agent-native, not the framework itself): **one
action definition serves every surface** — command palette, WebMCP in the
browser, MCP server out of the browser, tests. We own the write path already
(`store.applyCanonicalCommand` + canonical commands), so the registry is thin.

| # | Slice | Done when |
| --- | --- | --- |
| B1 | Spec `src/agent/actions`: `defineAction({name, description, schema, run})`; `run` returns canonical commands or a read result. First actions: `get_document`, `add_node`, `connect`, `set_label`, `delete`, `move`, `select`, `layout`, `export_svg` | spec doc + registry + 3 actions with unit tests |
| B2 | In-browser surface: same registry exposed via `navigator.modelContext` (WebMCP) when present, else no-op; command palette lists actions | Chrome with WebMCP flag can drive the editor |
| B3 | Out-of-browser surface: `@vrun-design/openflowkit-mcp` gains `edit_document` tools backed by the same actions on a document file | MCP client creates + edits a doc, output validates |
| B4 | Agent eval: 5 scripted tasks through MCP, pass/fail | `npm run eval:agent` green — this is the launch gate |
| B5 | MUSE connector | blocked: MUSE undefined — ask |

## Not doing
- Adopting `@agent-native/core`: brings Postgres/auth/chat UI; we are local-first. Pattern only.
- Any M2–M7 roadmap item not listed above.

## A6 — Canonical store ownership: spec (2026-09-19)

Goal: the canonical `SceneDocumentV1` is the durable truth; the legacy React
Flow shape becomes an adapter. Measured blast radius of an in-memory flip:
121 legacy write sites in 37 files, 297 read sites in 96 files, plus an
IndexedDB migration. Options:

| Option | Cost | Value |
| --- | --- | --- |
| A. In-memory flip (`state.document` truth, `nodes/edges` derived) | weeks; every legacy writer re-projects; high regression risk; invisible to users | removes the legacy→canonical→legacy round trip for Pixi edits |
| B. Storage flip only (persist canonical; legacy pages become the import adapter) | days; additive first, then switch load; reversible until legacy pages are dropped | one durable format shared by app, MCP `diagram_open`, exports; round-trip fidelity proven on save |
| C. Nothing; rely on round-trip corpus tests | 0 | status quo |

Decision: **B**, in slices. A stays deferred until a user-visible cost of the
in-memory round trip is measured (none so far; the one real bug — dropped
scale — was fixed at the commit boundary).

- **d1 (done 2026-09-19)** — every save writes `PersistedDocument.canonical`
  (validated; omitted, never blocking, if projection fails). Load stays on
  legacy pages. Test: tabs loaded from `canonical` equal tabs loaded from
  legacy pages for the round-trip corpus. Cost: ~2× document bytes in IndexedDB.
- **d2** — load prefers `canonical` when present and valid; legacy pages are
  the fallback and the import path for old data. Crash-recovery journal and
  destructive-action backups carry canonical.
- **d3** — stop writing legacy `pages`; export/import legacy JSON through the
  adapter only. Only after one release on d2 with no repair events.
