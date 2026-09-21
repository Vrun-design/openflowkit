# OpenCanvas v2 — session handoff (2026-09-21)

Paste this into a fresh Claude Code session. Read it, then `docs/v2/implementation-status.md` (last three sections) and `git log --oneline -6` on branch `v2`.

## Roles

- **You (Opus): manager/reviewer.** Write test-first slice prompts, review the diff (never the report), run gates yourself, fix, commit to `v2`, push.
- **Cheap model (Muse Spark via OpenCode) / Codex:** executes prompts the user pastes. Cheap model → logic slices with red tests to make green. Codex → visual/judgment slices.
- **User (Varun):** pastes prompts, runs 2-minute click-throughs after each commit, dumps raw issue lists.

Modes: caveman (terse prose) + ponytail (minimal code). Honest scoring — praise only when earned.

## State

Branch `v2`, HEAD after V2-05a/e (`720b49a`). All green (2326 vitest / 474 files): `tsc`,
`eslint --max-warnings=0`, vitest, three Playwright gates
(`scripts/check-v2-04.mjs`, `scripts/check-v2-polish.mjs`,
`scripts/check-v2-10a.mjs`) against `VITE_V2_EDITOR=1 VITE_V2_AI=1 npm run build`
+ `npx vite preview --host 127.0.0.1 --port 4191` (`V2_BASE_URL=http://127.0.0.1:4191`);
the 10a gate's flag-off block needs a second `VITE_V2_EDITOR=1 vite build --outDir <tmp>`
served on 4192 (`V2_OFF_BASE_URL`).

Delivered: V2-00 docs, V2-01 schema/geometry/migration, DS-01/02 design system + lab,
V2-02 revisioned session, V2-03 isolated IndexedDB repo, V2-04 editor route
(`/v2/:id` behind `VITE_V2_EDITOR`), V2-04e/f polish + input reliability,
**V2-10a agent proposals** (`VITE_V2_AI`): `application/ai/{proposalSession,localAgent}`,
`useV2Proposal`, `V2AgentPanel`, `PixiProposalPreview`, sparkle button in the creation
toolbar + ⌘J, one attributed batch per proposal, revision-based stale refusal
(ADR-004). **V2-10b-1..5 operation parity**: `domain/commands/sceneEdits.ts` (moved
from presentation) + `domain/nodes/shapeNode.ts` + `domain/commands/styleNodes.ts` are
the single builders; actions `add_node` (toolbar shapes), `connect` (toolbar arrow /
free point / port-bound with sides), `move_node`, `delete_node`, `delete_connector`,
`duplicate_nodes`, `rename_document`, `set_style`, `transform_node` all `toEqual` the
manual records (`src/agent/actions/parity.test.ts`); `src/agent/manifest.ts` is the
capability manifest (11/12 shipped; gap = connector re-bind/waypoints → V2-05) with an
honesty test. `mcp-server/` still bundles the old action set (regenerate at its release).
**V2-05a** pointer operations live in `presentation/v2/pointerOperations.ts` (legacy
imports it; adoption allowlist is EMPTY); object snapping with guides
(`domain/transforms/objectSnap.ts` over `alignmentGuides.ts`, move only, 6px/zoom, Alt
bypasses). **V2-05e** type-to-edit (printable key on a single selected shape opens the
editor — tool letters included, owner to confirm), caret-at-end, auto-grow centred
overlay, Tab commits, window-blur guard, blank new text node removed.

Isolation: `src/opencanvas/v2Graph.test.ts` — v2 roots (now incl. `application/ai`)
import only V2_ROOTS + SHARED_KERNEL (now incl. `src/agent/{actions,runAction}`);
adoption allowlist is empty and stays empty. Legacy direct-writer
ratchet (4 files). Legacy deletion at V2-15 = delete everything outside those.

Dev: `VITE_V2_EDITOR=1 VITE_V2_AI=1 VITE_V2_LAB=1 npx vite --host 127.0.0.1 --port 5173`
→ `/#/v2/<id>` and `/#/_labs/v2`. Kill stale servers first
(`lsof -i :5173 -i :4191 -i :4192 -t | xargs kill -9`) — a stale HMR server on the
gate's port cost an hour of phantom bugs, twice now.

## Lessons (apply to every prompt)

0. **Input-feel reports need real input.** Headless Playwright showed zero failures while the owner hit capture drops 6×/10 s. Open a headed Chromium (`chromium.launch({headless:false})`), instrument pointer/capture/frame events to a log, let the owner drive, read the log. Capture script pattern is in V2-04f notes.

1. **Slices ≤ 45 min, one outcome, one gate command.** The 4-part V2-04 prompt took 3h and drifted. 04e as "one big pass" pulled in V2-05 scope and stalled mid-move.
2. **Test-first for logic.** Opus writes the `*.test.ts` (public API + expected results), agent makes it green. Removes interpretation. Pixels get one screenshot + user's eyes, not Playwright bisection.
3. **Prompt must say:** run `npx tsc --noEmit && npx eslint src --max-warnings=0 && npx vitest run` and paste output verbatim; no new check scripts; two-strike rule — same fix fails twice → stop, write findings, hand back; no `console.*` in source; no touching files outside the named list.
4. **Review = read the code.** Cheap model self-reports pass; it left `console.info('[v2-trace]')`, a `useCallback([options])` no-op, a "deep-equal" test that only checked `success`, and an effect re-running every render that caused its own bug hunt.
5. **Interaction conventions** come from Excalidraw/FigJam/tldraw: tool reverts to Select after one create; Escape → cancel gesture → disarm tool → clear selection; wheel pans, ⌘/Ctrl+wheel zooms; double-click empty → text; arrows drag from anywhere and bind where they land.

## Next

1. Owner click-through of V2-05a/e (2 min): drag a shape near another and watch the
   blue guide (Alt to bypass); select a shape and just start typing; Enter on a
   labelled shape (caret at end); double-click empty → Escape (no ghost node); alt-tab
   while the editor is empty (label survives). **Decide:** keep tool letters as
   type-to-edit with a selection (FigJam) or exclude R/O/A/T/V/H/L (Excalidraw) — one
   line in `useV2Keyboard.ts`.
2. V2-05b clipboard → 05c groups → 05d lock/hide/order → V2-06 connectors (styles,
   ports, re-bind/waypoint action = last manifest gap; open item — connector body drag
   inserts a waypoint vs select/move/delete) → 07 → 08 pages → 09 → 10c/d → V2-11
   provider decision (options (a) Claude tool-use planner / (b) provider-neutral JSON
   planner, see git history of this file at c5a1d46).
3. Remaining spine: V2-12 import/collab, V2-13 migration, V2-14 cutover, V2-15 legacy
   delete.
