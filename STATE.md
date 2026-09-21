# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 1 + polish + 1.9 style done 2026-09-21 (Claude Opus 5, on `v2`).
- Connectors: dynamic sides, obstacle routing (20px stub, Z lane), live hybrid re-links.
- Text: crisp at any zoom; transparent zoom-scaled label editor on the label;
  Escape keeps text; type-to-edit; connector label plate is click/dbl-click.
- Chrome: blue accent, quick-create ghost, modifier transforms, lock/z-order shortcuts.
- 1.9 style (spec `docs/plan/phase-1-style.md`, shipped 2026-09-21): one
  resolver `domain/nodes/nodeStyle.ts` (flat `appearance` keys, legacy
  `content.*` fallbacks) feeds Pixi, the label editor and measurement.
  Style bar: Fill (palette pastel/solid, custom, corners, opacity, shadow) /
  Outline / Text (family, size, B/I/U/S, align, padding, line height,
  spacing) / Align / More (Position, Reorder); connector Line / Ends (cross marker,
  reverse) / Label. Sticky defaults per kind. Right-click menus (node,
  connector, canvas). ⌘X/C/V, ⌘⌥C/V copy style, ⌘]/[ step, ⌥ align, ⇧H/V
  flip, ⌘G/⌘⇧G quiet groups (members ride the live preview; delete/duplicate
  take subtrees). Text nodes re-fit on typography edits.
- UI refinement: Codex, 2026-09-21. Cascading hover/keyboard menus, no Back;
  inset numeric fields, quiet segments, round swatches, panel headings;
  Arrange exposes labelled layer actions. Light/dark visual checks.
- Verified: typecheck, lint, 890 unit tests; 8 headed style/connector checks.

## Next
- Phase 2.1 grammar.md exists (`docs/plan/grammar.md`); owner reviews, then
  parser. Owner feel-test on `/`: quick-create, bend + move, label edit, zoom.

## Deferred (phase 1)
- Group: top-level only, no double-click enter, no resize/rotate of members
  (phase 2 frame work). Flip mirrors positions, not glyphs (`ponytail:` in
  `arrangeNodes.ts`). SVG/PNG export still reads legacy paint keys (phase 4).
- Rotate handle stem overlaps connectors above a node; cosmetic.
- Feel probe says ~260 ms p95 at 512 nodes but rAF measures 4–7 ms: the
  Playwright harness is suspect, not the renderer. Re-instrument first.

## Later
- Phase 5 (month 2): `docs/plan/phase-5-architecture.md` — C4 model layer +
  flows + discover/drift. Structurizr Cloud EOL 30 Sep 2026 = launch window.
