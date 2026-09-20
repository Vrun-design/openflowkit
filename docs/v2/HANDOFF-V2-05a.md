# V2-05a/e — object snapping + text-in-shape (solo Opus build prompt, ~20% quota)

Paste this whole file into a fresh Claude Code (Opus) session in
`/Users/varun/Desktop/Dev_projects/flowmind-ai`, branch `v2`. Build it yourself; no
subagents. Modes: caveman prose, ponytail code. Honest scoring. Varun has
pre-approved this; do not wait for a second go-ahead. Budget is tight: two slices,
each ≤45 min, then docs. If the second slice does not fit, ship the first with its
docs and say so.

## 0. Ritual

1. `git status` clean on `v2`; HEAD `c5a1d46` or later. Read `docs/v2/HANDOFF.md`
   (State + Next) and the last three sections of `docs/v2/implementation-status.md`.
2. Say back in 2 lines: goal + first action. Write §3 as a checklist in your reply, start.
3. Kill stale servers first: `lsof -i :5173 -i :4191 -i :4192 -t | xargs kill -9`.
4. Ritual after each slice: `npx tsc --noEmit && npx eslint src --max-warnings=0 &&
   npx vitest run <touched dirs>`; full `npx vitest run` + gates only at the end.

## 1. Why

Roadmap order is 05 → 06 → 07…; we jumped to 10a/b for the agent substrate. Now back
in sequence. V2-05a closes the last legacy import in the v2 graph and adds the snapping
every real tool has; V2-05e fixes the text-in-shape feel Varun flagged. Everything
else in V2-05 (clipboard, groups, lock/hide, ordering) is later sub-slices — do not
start them.

## 2. State you inherit (verified 2026-09-20)

- All green: tsc, eslint, 2309 vitest / 472 files, gates `scripts/check-v2-04.mjs`,
  `check-v2-polish.mjs`, `check-v2-10a.mjs` against `VITE_V2_EDITOR=1 VITE_V2_AI=1
  npm run build` + `npx vite preview --host 127.0.0.1 --port 4191`
  (`V2_BASE_URL=http://127.0.0.1:4191`).
- Dev: `VITE_V2_EDITOR=1 VITE_V2_AI=1 npx vite --host 127.0.0.1 --port 5173` → `/#/v2/<id>`.
- Boundary: `src/opencanvas/v2Graph.test.ts`. `ADOPTION_ALLOWLIST` has ONE entry:
  `presentation/pixiPointerOperations.ts` (moveTarget V2-05). The test "keeps every
  adoption allowlist entry live" fails if the entry is unused — so when you move the
  file you must also delete the entry.
- v2 uses only these from `presentation/pixiPointerOperations.ts` (161 lines):
  `useV2Keyboard.ts` → `isEditableTarget`; `useV2Pointer.ts` → `beginTransformOperation,
  boundsBetween, selectionAfterClick, transformLabel, updateTransformOperation,
  type PixiPointerOperation`. Legacy files (`usePixiPointerHandlers.ts`,
  `usePixiKeyboardShortcuts.ts`, `usePixiConnectorActions.ts`, `pixiGestureCancellation.ts`,
  `PixiSpikePage.tsx`, `OpenCanvasSurface.tsx`, `OpenCanvasDocumentPage.tsx`,
  `pixiPointerOperations.test.ts`) also import it — they must keep working.
- Snapping today: `domain/transforms/transformSelection.ts` `moveTransform(snapshot,
  delta, { snap, gridSize })` snaps the selection bounds' top-left to a 16px grid
  when `snap` is true (preference `snapToGrid`, Alt bypasses). `resizeTransform`
  likewise. There is no object-to-object snapping. The host already has
  `PixiRendererHost.setAlignmentGuides({ x, y } | null)` drawing full-height/width
  guide lines (legacy uses it). `useV2Pointer.ts` calls `updateTransformOperation`
  per move and `host.setTransformPreview(result)`.
- Text editing: `useV2LabelEditing.ts` (`openEditor(nodeId)` → `editing {nodeId, value,
  bounds}`; `commitLabel`, `cancelEdit`), `OpenCanvasTextEditorOverlay.tsx` (a
  `<textarea>` positioned over `host.getNodeScreenBounds`, Enter commits, Shift+Enter
  newline, Escape cancels, blur commits). Double-click on a node → `openEditor`;
  double-click empty → creates a text node and opens it (`useV2Pointer.ts` ~L540).
  Label command: `buildSetNodeLabelCommand` in `domain/commands/sceneEdits.ts`.
  Rendering: `PixiNodeRenderer` draws `content.label` centred; label size is not
  editable yet (typography is V2-06+; do not add it).
- Test API `useV2TestApi` exposes `window.__V2__.{getState,getDocument,getNodeRect,
  getRenderDiagnostics,getProposal}` — extend read-only if the gate needs it.

## 3. Spec

### V2-05a — move pointer operations into v2; object snapping with guides

1. `git mv src/opencanvas/presentation/pixiPointerOperations.ts
   src/opencanvas/presentation/v2/pointerOperations.ts` (and its test next to it).
   Fix imports in the legacy importers (they may import from `./v2/pointerOperations`;
   legacy → v2 is allowed, v2 → legacy is not). Delete the `ADOPTION_ALLOWLIST` entry;
   keep the constant (empty array) and its test. `v2Graph.test.ts` must pass.
   Commit `chore(v2): pointer operations move into v2; adoption allowlist empty (V2-05a-1)`.
2. Object snapping, pure and tested first:
   `domain/transforms/objectSnap.ts` (new) —
   `snapBoundsToObjects(bounds, others: readonly Bounds2d[], threshold = 6 /* world units */)
   → { bounds, guideX: number | null, guideY: number | null }`.
   Candidates per axis: others' left/centre/right (x) and top/middle/bottom (y) vs the
   moving bounds' same three. Pick the smallest |delta| ≤ threshold per axis; apply the
   delta; report the matched line. No match → unchanged, null guides.
   `objectSnap.test.ts`: left-to-left, centre-to-centre, right-to-left, both axes at
   once, no match beyond threshold, ties prefer centre, empty others.
3. Wire: in `moveTransform` (and `resizeTransform` for the moving edge only if it is a
   ≤10-line change; otherwise move-only and say so) add option
   `objects?: readonly Bounds2d[]` — after grid snap (or instead when grid is off), run
   `snapBoundsToObjects`; return `guideX/guideY` on `TransformResult` (add the two
   optional fields to `domain/transforms/types.ts`). `updateTransformOperation` passes
   the world bounds of every non-selected node on the page (use `nodeWorldBounds` +
   `buildNodeWorldMatrices`; compute once at `beginTransformOperation`, store on the
   operation, ponytail-comment the O(n) ceiling). `useV2Pointer.ts`: after
   `setTransformPreview(result)` call `host.setAlignmentGuides(result.guideX !== undefined
   || result.guideY !== undefined ? { x: result.guideX ?? null, y: result.guideY ?? null } : null)`
   and clear on end/cancel. Alt held = no snapping of either kind (already the
   convention). Threshold in screen pixels: divide 6 by camera zoom when passing.
4. Gate: extend `scripts/check-v2-polish.mjs` (no new script): create two rectangles,
   drag the second so its left edge lands within 4px of the first's left edge, assert
   after commit `Math.abs(b.x - a.x) < 0.01`; during the drag assert `getRenderDiagnostics()
   .alignmentGuidesVisible === true` (add that boolean to diagnostics from the
   `alignmentGuides` Graphics visibility/geometry). One screenshot `docs/evidence/v2-polish/snap.png`.
   Commit `feat(opencanvas): object snapping with alignment guides (V2-05a-2)`.

### V2-05e — text in shapes that feels right

Test first: `useV2LabelEditing.test.ts` (exists, extend) and a small
`OpenCanvasTextEditorOverlay.test.tsx` (exists, extend).

1. Enter on a selected node opens the editor with the caret at the END (not select-all)
   when the label is non-empty; select-all only for the placeholder 'Text'. F2 same.
   Typing a printable character on a selected single node with the Select tool
   opens the editor and replaces the label with that character (FigJam/Excalidraw
   convention). Do this in `useV2Keyboard`: printable key, no modifier, single
   selection, not editing → `onTypeToEdit(key)`.
2. Editor overlay: `textarea` auto-grows (set `height` from `scrollHeight` on input,
   min = node height); text centred to match the rendered label (`text-align:center`,
   padding matching `PixiNodeRenderer` label inset — read the value there, do not
   invent); font size/line-height from the same source as the renderer if exposed,
   else 14px/1.3 and note it.
3. Commit rules: Enter commits, Shift+Enter newline (already), Escape restores the
   previous label (already) — add: Tab commits and keeps selection; blur while the
   window loses focus does NOT commit an empty label over a non-empty one (guard:
   if new value is '' and old non-empty and the blur came from `window` blur, keep old).
   Empty commit on a *new* text node deletes that node (one batch: set label + remove),
   so double-click-empty-then-Escape/blur leaves no invisible node. Test that.
4. Announce "Editing label" / "Label saved" via the existing `announce`.
5. Gate: in `check-v2-polish.mjs` add: select node → type `Q` → editor open with value
   `Q` → type `uote` → Enter → label `Quote`; double-click empty → Escape → node count
   unchanged. Commit `feat(opencanvas): type-to-edit, auto-grow, safe commit for labels (V2-05e)`.

### Not in scope
Clipboard, groups, lock/hide, z-order, typography controls, connector labels,
anything in `src/agent` beyond keeping tests green (label edits already have
`set_label`; no new action needed).

## 4. Docs + report (last, ≤15 min)

- `docs/v2/implementation-status.md`: sections "V2-05a" and "V2-05e" in the required
  record format (see `docs/v2/delivery-roadmap.md` "Required record for each
  implementation change"; the V2-10a section is a filled example).
- `docs/v2/HANDOFF.md`: State (HEAD, allowlist now empty), Next (V2-05b clipboard →
  05c groups → 05d lock/hide/order → V2-06 connectors → 07 → 08 → 09 → 10c/d → 11).
- Commit `docs(v2): V2-05a/e evidence and handoff`.
- Final report format (mandatory):
  ```
  Verified: <commands + pasted tails>
  Assumed:  <not run, why safe>
  Unknown:  <what Varun should click: drag a shape near another and watch the guide;
            select a shape and just start typing>
  Commits:  <hashes>
  Next:     V2-05b clipboard per HANDOFF.md
  ```

## 5. Laws

Test-first for logic; no `console.*`; no new check scripts; Escape chain unchanged
(gesture → tool → selection → agent panel); tools revert to Select after one create;
`readonly` on domain/application types; two-line header comment on new files; every
"done" separates Verified/Assumed/Unknown; two-strike rule → stop and write findings.
