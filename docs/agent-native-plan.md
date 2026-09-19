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
