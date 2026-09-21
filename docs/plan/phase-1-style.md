# Phase 1.9 — Style, arrange, context menu

Status: SHIPPED 2026-09-21 (owner approved; floating bar). Lives between phase 1 and 2.

UI refinement (2026-09-21, Codex): inspector panels use named fonts, inset numeric
fields, section headings and expandable spacing/background controls. More contains
position and labelled layer actions; label editing stays in the context menu or
Enter/double-click. Context menus cascade beside their parent for Reorder, Transform,
Style and Path, with hover, keyboard entry/return and viewport collision handling.

Shipped deviations (kept the spec honest, not the code):
- Corners, opacity and shadow live in the Fill panel (one popover fewer in the bar).
- Flip mirrors positions and negates rotation; glyphs are not mirrored (negative
  scale would be baked into a negative size by the transform bridge). `ponytail:` in
  `arrangeNodes.ts` names the upgrade.
- ⇧H/⇧V/⇧1/⇧2 sit below type-to-edit: with one shape selected a capital letter starts
  its label; flips need none or several selected.
- Group: top-level nodes only; a member click selects the outermost group; no
  double-click "enter group". Groups have no paint; name one via Edit label.
- SVG/PNG export still reads the legacy paint keys; phase 4 switches it to
  `resolveNodeStyle` when export is rebuilt.

Pitch: for anyone editing on the canvas, every visible property of a shape, text,
connector or connector label is one click away, applies to the whole selection, previews
live, undoes as one step, and is reachable by keyboard and right-click.

Reference: Koboyo's style bar (Pastel/Solid + 11 palette + custom, outline dropdown,
text dropdown, line width/style/corners, font family/size, align/padding/line-height,
position/size panel, layer panel, context menu with Reorder submenu, canvas menu).
tldraw: sticky defaults (last used style becomes the next shape's style). Figma:
`⌥A/D/W/S/H/V` align, `⌘⇧H/V` flip, `⌘G` group.

## 1. Style model (domain, one place)

`src/opencanvas/domain/nodes/nodeStyle.ts` — `resolveNodeStyle(node): NodeStyle`. One
resolver every renderer, editor overlay, exporter and DSL serializer reads. Flat keys on
`node.appearance` (shallow-merged by `buildStyleNodesCommand`, which already exists):

| key | type | default (shape / text node) |
|---|---|---|
| `fill` | hex \| `'transparent'` | palette white / transparent |
| `stroke` | hex \| `'transparent'` | palette border / transparent |
| `strokeWidth` | 0–24 | 1.5 / 0 |
| `strokeStyle` | `solid\|dashed\|dotted` | solid |
| `cornerRadius` | 0–64 | shape default (`rounded`=12, `rectangle`=0) |
| `opacity` | 0–1 | 1 |
| `shadow` | boolean | false |
| `textColor` | hex \| `'auto'` | palette text; free text `auto` follows canvas contrast |
| `fontSize` | 8–96 | 14 / 16 |
| `fontFamily` | `sans\|serif\|mono\|hand` | sans |
| `fontWeight` | `400\|600\|700` | 600 / 500 |
| `fontStyle` | `normal\|italic` | normal |
| `textDecoration` | `none\|underline\|line-through` | none |
| `textAlign` | `start\|center\|end` | center |
| `textVerticalAlign` | `top\|middle\|bottom` | middle |
| `lineHeight` | 1–2 | 1.2 |
| `letterSpacing` | -0.05–0.2 em | 0 |
| `textPadding` | 4–32 | 12 (from node-layout) |

Legacy `content.color/colorMode/customColor` (palette keys) and text-node
`content.fontSize/fontFamily/fontWeight/fontStyle/customColor/backgroundColor` remain
readable as fallbacks inside the resolver; nothing new writes them. Migration is
lazy: first style edit writes flat keys. Renderer switch: `PixiNodeRenderer`,
`PixiFreeformNodeRenderer` (text), `OpenCanvasTextEditorOverlay` font, and
`measurePortableText` calls all take `NodeStyle`.

Connectors: `resolveConnectorPresentation` already covers stroke/dash/markers/route.
Add to `appearance`: `cornerRadius` (0–24, orthogonal bends), `labelColor`,
`labelFontSize`, `labelFontFamily`, `labelFontWeight`, `labelFontStyle`,
`labelBackground` (hex \| `'transparent'`) — read by the label draw + label editor.
`ConnectorStylePatch` grows the same keys.

Palette (UI-only, `presentation/v2/stylePalette.ts`): the grammar's nine colours +
white + gray, each with `pastel` and `solid` fill/stroke/text triples computed from
`theme/palettes.ts` (`NODE_EXPORT_COLORS` / `NODE_FILLED_COLORS`). A swatch click writes
concrete `{fill, stroke, textColor}`. The document stores hex only; the DSL serializer
snaps to a palette name when it matches (grammar §5.1 already allows both).

Sticky defaults: `V2Workspace` keeps `lastStyle: { shape: Partial<NodeStyle>, text:
Partial<NodeStyle>, connector: ConnectorStylePatch }` (session, in memory), updated on
every commit from the style bar, applied by `buildInsertShapeCommand` /
`buildInsertConnectorCommand` / quick-create. Tradeoff: no persistence across reload;
add to preferences if asked.

## 2. Surfaces

**Style bar** (replaces `V2ContextBar` appearance group; floats above the selection as
now). Buttons open one popover each; multi-select shows mixed state as `—`.

- Shape selection: `[Fill ▾] [Outline ▾] [Text ▾] [Corners ▾] [Opacity] │ [Edit] [Dup] [Del]`
  - Fill popover: Pastel/Solid segmented, 11 swatches + transparent + custom (existing
    `ColorPicker`), shadow toggle.
  - Outline popover: Auto/none/palette/custom colour, width presets 1/2/3/4 + stepper,
    solid/dashed/dotted.
  - Text popover: colour row, family (4), size presets XS/S/M/L + stepper, B/I/U/S,
    align 3×3 grid, padding S/M/L, line height 1/1.25/1.5/2, letter spacing –/S/M/L.
- Text node: `[Text ▾] [Fill ▾] [Opacity] │ …` (Fill = background plate + outline).
  - Text colour defaults to Auto: it follows canvas luminance until user chooses a fixed colour.
- Connector: `[Line ▾] [Path] [Ends] [Label ▾] │ [Edit label] [Del]`
  - Line: colour, width presets + stepper, solid/dashed/dotted, corner radius (elbow only).
  - Ends: start/end marker `none/arrow/dot/cross` (cross = new marker draw).
  - Label: same text popover minus align/padding; background plate colour.
- ≥2 nodes: `[Align ▾]` popover with 6 aligns + 2 distributes (`arrangement.ts`, wrapped
  in a batch command); shortcuts `⌥A/D/W/S` edges, `⌥H/V` centres, `⌥⇧H/V` distribute.
- Every selection: `[Position ▾]` X/Y/W/H/R fields (existing `NumberField`, commit on
  Enter/blur, ⇧↑↓ ±10) and `[Layer ▾]` front/forward/backward/back.

**Context menu** (`V2ContextMenu.tsx`, design-system `Menu` + `MenuSubmenu`; related
actions cascade in Reorder, Transform, Style and Path submenus):
- Node/multi: Cut ⌘X · Copy ⌘C · Duplicate ⌘D · ─ · Edit label ↵ · ─ · Copy style ⌘⌥C ·
  Paste style ⌘⌥V · ─ · Bring to front ⌘⌥] · Bring forward ⌘] · Send backward ⌘[ · Send to
  back ⌘⌥[ · ─ · Flip horizontal ⇧H · Flip vertical ⇧V · ─ · Zoom to selection ⇧2 · ─ ·
  Lock ⌘L · Delete ⌫
- Connector: Cut/Copy/Duplicate · Edit label · Path Elbow/Straight/Curve · Reverse
  direction · Copy/Paste style · Delete.
- Empty canvas: Paste ⌘V · Select all ⌘A · ─ · Zoom to fit ⇧1 · Zoom to 100% ⌘1 · ─ ·
  Show grid ✓ · Snap ✓.
Right-click on an unselected item selects it first. Menu opens at the pointer, clamped
to the viewport. Escape/outside closes and returns focus to the canvas.

**Keyboard** (added to `useV2Keyboard`): `⌘X/C/V` (clipboard = `productionClipboard`,
JSON on `navigator.clipboard` with an in-memory fallback), `⌘⌥C/V` copy/paste style,
`⌘]/[` and `⌘⌥]/[` (`]`/`[` bare stay as today), `⇧H/V` flip, `⌥…` align, `⇧1/2` zoom,
`⌘B/I/U` while a shape/text is selected (not editing) toggles weight/italic/underline.

## 3. Commands (domain, each with a unit test beside it)

- `buildStyleNodesCommand` — exists; gains nothing but callers.
- `buildStyleConnectorCommand` — extended patch keys + `reverse: true`.
- `buildAlignCommand(page, ids, mode)`, `buildDistributeCommand(page, ids, axis)` — wrap
  `arrangement.ts` results as a `batch` of `set-node`.
- `buildFlipCommand(page, ids, axis)` — mirrors positions about the selection centre
  and negates `transform.scale.x|y` for the node; connectors re-route automatically.
- `buildSetTransformCommand(page, id, {x,y,width,height,rotation})` — Position panel.
- `buildReorderCommand` — exists; add `'forward' | 'backward'` one-step modes.
- `copyStyle(node|connector) → StyleClipboard`, `buildPasteStyleCommand(page, ids, clip)`.
- `buildCutCommand` = delete after copy (uses existing delete).

Every command: no-op → returns null and commits nothing; locked nodes skipped; one
`batch` per user intent.

## 4. Group (⌘G / ⌘⇧G)

Deferred in STATE because the live transform preview does not carry descendants. Scope
here: `buildGroupCommand` (insert a `group` container sized to the union +16px, reparent
children keeping world position) and `buildUngroupCommand` (inverse); `transformSelection`
gains descendant carry for move only (resize/rotate of a group stays a phase-2 frame
task). Context menu shows Group/Ungroup. Ships last; if the preview work exceeds one
slice it stays deferred and the spec is amended, not silently dropped.

## 5. Acceptance (binary, runnable)

1. Select one shape → Fill → click `blue` (Pastel) → fill/stroke/text match the palette
   triple; ⌘Z restores all three at once.
2. Select three shapes with different fills → Fill swatch shows mixed; click `red` →
   all three red; one undo.
3. Text popover → size L → shape label re-measures, editor overlay opens at the same size.
4. Text node → family `hand`, italic, underline → renders in Pixi and in the editor.
5. Connector → Ends → start `dot`, end `cross`; Line → dotted, width 3, corners 12.
6. Connector label → colour red, size 14, background transparent.
7. Two shapes → Align left / Distribute horizontal (3 shapes) → positions match
   `arrangement.ts`; one undo each.
8. Right-click unselected shape → menu opens, shape selected; Escape closes, focus on
   canvas. Right-click empty → canvas menu; Paste disabled when clipboard empty.
9. ⌘C, ⌘V → copy pasted +24/+24 with connectors between copied nodes kept; ⌘⌥C on A,
   ⌘⌥V on B → B takes A's style keys only.
10. ⇧H → node mirrored about its centre; ⌘] moves exactly one z-step.
11. New shape after styling one → inherits the last style (sticky).
12. `npm run typecheck && npm run lint && npm run test -- --run` green; one headed
    Playwright check: fill swatch → renderer debug record shows the new fill.

## 6. Non-goals

- Gradients, image fills, per-side strokes, text outline/shadow, rich text spans
  (bold *within* a label — label stays one style; Koboyo's inline B/I is rich text).
- Fonts beyond the four families; no font upload.
- Hand-drawn stroke (phase 4), shape switching menu (phase 3 families), "Ask AI" item
  (phase 4), export items in the context menu (phase 4 owns export).
- Persisted default styles, style presets/themes, document-wide "change all".
- Group resize/rotate with children (phase 2 frame work).

## 7. Slices (build order; each green before the next)

1. `nodeStyle.ts` resolver + renderer/editor/measure switch (no UI change yet).
2. Palette + Fill/Outline popovers + sticky defaults.
3. Text popover (shape labels + text nodes).
4. Connector Line/Ends/Label popovers, cross marker, corner radius.
5. Position + Layer popovers, `forward/backward`, flip.
6. Align popover + shortcuts.
7. Clipboard (⌘X/C/V), copy/paste style.
8. Context menus (node, connector, canvas).
9. Group/ungroup (see §4).
10. Headed Playwright check, STATE.md, delete `V2SelectionStyle.tsx`/`V2ConnectorStyle.tsx`.
