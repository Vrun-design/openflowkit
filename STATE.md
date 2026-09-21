# State

Plan: [docs/plan/README.md](docs/plan/README.md). Phases 0–4, one month, no gates.

## Now
- Phase 2 output pass done 2026-09-21 (Claude Opus 5, on `v2`): the DSL compiles to
  real renderer primitives. `vocabulary.ts` is the single word→scene table (shapes
  incl. person→actor, sticky notes, browser/mobile wireframes, provider-icon cards,
  grammar palette onto `nodePalette` hexes); `sizing.ts` measures labels with the
  renderer's portable text; ELK nests groups hierarchically (`frame` root, padding)
  and children are parent-relative, so a moved frame no longer doubles its origin.
- Connectors write the keys the renderer honours: `dashPattern`, `markerStart/End`,
  `strokeWidth`, `opacity`, side anchors from `[from:, to:]`; parallel edges fan their
  labels. Frames and groups render as containers with a title band (`containerNodePresentation`
  gained `frame`).
- Serializer is canonical over `src/dsl/fixtures/*.dsl` (the 11 owner examples +
  aws-3tier): idempotent `format`, structure/attribute round-trip, comments, notes,
  `align`, reserved `view` lines, unknown attrs kept. Inline edge attrs split by
  vocabulary: `A -> B [dashed, red]` = dashed edge to a red B; grammar §4 updated.
- Code panel lists every diagnostic (parse + compile, deduped), not just unknown icons.
- Verified: typecheck, lint, 979 unit tests; `e2e/dsl-output.spec.ts` (4 headed checks)
  and the existing panel/style specs.
- Phase 1 + polish + 1.9 style done 2026-09-21. Connectors: dynamic sides, obstacle
  routing, live re-links. Text: crisp any zoom, in-place editor. Chrome: style bar,
  menus, quick-create ghost, clipboard, groups.
## Next
- Phase 3.1 flowchart family. Owner feel-test: DSL generation, bends, labels, zoom.

## Deferred (phase 1)
- Group: top-level only, no double-click enter, no resize/rotate of members
  (phase 2 frame work). Flip mirrors positions, not glyphs (`ponytail:` in
  `arrangeNodes.ts`). SVG/PNG export still reads legacy paint keys (phase 4).
- Rotate handle stem overlaps connectors above a node; cosmetic.
- DSL hints `rank:`/`group [direction]` round-trip but do not constrain ELK yet
  (`ponytail:` in `compile.ts`); pins are applied after layout.
- Feel probe says ~260 ms p95 at 512 nodes but rAF measures 4–7 ms: the
  Playwright harness is suspect, not the renderer. Re-instrument first.

## Later
- Phase 5: C4 model, flows, discover/drift. Structurizr Cloud EOL 30 Sep 2026.
