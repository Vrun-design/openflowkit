# Phase 4 — Agents + ship (week 4)

Goal: an agent can do everything a human can; the product exports, has pages and
themes; the owner's daily-test feel bugs are closed.

## Slices

### 4.1 Operation surface = the DSL + a few scene ops
- Agents talk DSL first: `create_diagram(dsl, at?)`, `update_diagram(frameId, dsl)`,
  `get_diagram(frameId) → { dsl, edited: boolean, losses }`, `list_diagrams()`,
  `get_syntax(family?) → grammar.md section`, `search_icons(q)`, `find_icons_for(q)`.
  Plus scene ops for what DSL can't say: `move`, `style`, `delete`, `export`,
  `fit_view`, `screenshot(frameId) → png`.
- One manifest in `src/agent/manifest.ts` (rewrite the existing one against the
  new surface; keep `runAction.ts` shape if it still fits). Every op is a pure
  function over the document → command(s) → one undo step, with an inverse.
- Check: `manifest.test.ts` proves every op has a schema, a runner, and an
  inverse; equivalence test: op result === what the UI produces for the same intent.

### 4.2 MCP live mode (paired browser)
- `mcp-server` exposes the tools above. Live pairing: the editor opens a local
  WebSocket (`ws://127.0.0.1:<port>`) when the user clicks "Connect agent"; the MCP
  server connects, tools act on the open document, results include a preview PNG
  and the frame id. File mode: the same tools against a `.openflow.json` path.
- No account, no cloud. `whoami` returns the local doc list.
- Check: `npm run eval:agent` drives Claude Code through: create flowchart →
  get_diagram → update → screenshot; all four succeed against a headed editor.

### 4.3 BYOK generate/edit
- Settings: provider + key (stored locally, never sent anywhere else). Providers:
  Anthropic, OpenAI-compatible URL. The prompt gives `grammar.md` + current frame
  DSL; the model returns DSL; we compile and show a proposal (ghost frame); accept
  = one undo step. Reuse `application/ai/proposalSession.ts`.
- Check: mocked provider test; one live run by the owner.

### 4.4 Export + pages + themes
- Export selection/page/document to PNG (2×), SVG (existing `canonicalSvg`), PDF
  (SVG → print), JSON. Copy-as-PNG to clipboard.
- Pages: add/rename/reorder/delete in `V2DocumentBar`; connectors never cross pages.
- Themes: light/dark tokens exist; add 4 diagram palettes (Koboyo-like paper/ink,
  Builder Orange, mono, pastel) applied at compile time via `appearance` defaults.
- Optional: hand-drawn stroke (rough-style jitter on Pixi Graphics, seeded per
  node id). Toggle per document. Skip if it costs > 1 day.
- Check: export goldens for one fixture per family; page ops unit tests.

### 4.5 Ship
- `README.md` with a 30-second demo GIF, `docs-site` page for the language
  (generated from `grammar.md`), MCP install snippet, keyboard cheatsheet
  (`?` in app).
- Owner's feel-bug list in `STATE.md` empty or explicitly deferred.

## Done when
Owner builds a real architecture diagram three ways — by hand, by code, by agent —
and each round-trips; export looks right in light and dark.
