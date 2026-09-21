# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 4 done 2026-09-21 (opencode/deepseek-v4.1, on `v2`): agents, export, pages, themes.
  - Agent surface (`src/agent/`): one registry, 16 ops — DSL first (`create_diagram`,
    `update_diagram`, `get_diagram` with drift + losses, `list_diagrams`, `get_syntax`,
    `search_icons`, `find_icons_for`), scene ops (`move`/`style`/`delete`/`add_shape`),
    pipes (`export`/`screenshot`/`fit_view`/`get_document`/`list_pages`). Every mutating
    op has an inverse (`manifest.test.ts`) and produces the UI's record (`ops.test.ts`).
  - MCP live mode: local HTTP long-poll bridge on `127.0.0.1:43119` (origin-checked,
    optional token) — **Connect agent** pairs the editor; the same tools run file mode on
    `.openflow.json` (`openflow_open`/`openflow_save`), `whoami` reports the mode. The
    V1-era tools (viewer URL, V1 linter, V1 templates) are gone; lint and templates use
    the real parser.
  - BYOK (`⌘J`): Anthropic or any OpenAI-compatible endpoint, key local to the browser;
    prompt = grammar cheat-sheet + current frame; the reply compiles into a ghost
    proposal, accept = one undo step.
  - Export: PNG 2× / SVG / PDF (print) / JSON for selection, page or document, plus
    copy-PNG; export now reads `resolveNodeStyle` (legacy paint keys gone) and has
    light+dark goldens per family. Pages: add/duplicate/rename/reorder/delete.
    Themes: `appearance:` DSL directive with four palettes, carried on every compiled
    record so renderers and the serializer agree without the document.
  - Ship: README, MCP README + docs-site (DSL reference generated from `grammar.md`),
    complete `?` cheatsheet (test-guarded), `npm run eval:agent` (file mode) and
    `e2e/agent-live.spec.ts` (agent drives the real editor: create→get→update→screenshot).
- Canvas UX pass 2026-09-21 (Claude Opus 5, commits f44533d…0b9f297): `resolveNodeStyle` is
  the one style source for every family (containers, icon nodes); style bar works on all;
  ⌘G group invisible, section = visible container (`⌘⌥G` wrap, header toggle, drop in/out by
  centre, resize changes `size` and keeps members); icon library (`I`, style-bar Icon) over
  cloud packs + Tabler; previews use the real renderers. `e2e/sections|icon-library.spec.ts`.
- Verified: typecheck, lint, 1198 unit tests, 26 MCP tests, headed `agent-live` + `phase-4`.

## Next
- Phase 5: C4 model, flows, discover/drift. Structurizr Cloud EOL 30 Sep 2026.
- Owner feel-test: paste Mermaid, generate each family, drag/resize, pair an agent, export.

## Deferred
- Feel bugs: Pixi stray `1` glyph after several generates (pooled label textures are
  dropped, not destroyed, on redraw — suspect a stale recycled canvas; cosmetic);
  group top-level only, no double-click enter; `person` is a crude polygon; container tints
  read grey on a dark canvas; editor vs Pixi label ≤1 device px apart (texture offset).
- Hand-drawn stroke skipped (plan: skip if > 1 day). PDF is the print dialog by design.
- Document-scope PNG/SVG downloads one file per page (no zip).
- docs-site prose beyond `mcp-server`, `github-embed` and the DSL reference is still
  V1-era and needs a rewrite pass.
- DSL `rank:`/`group [direction]` round-trip but do not constrain ELK yet
  (`ponytail:` in `families/graph/scene.ts`); pins are applied after layout.
- Live bridge is HTTP long-poll, not WebSocket: no dependency, same pairing UX.
