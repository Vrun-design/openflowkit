# OpenCanvas v2 — session handoff (2026-09-20)

Paste this into a fresh Claude Code session. Read it, then `docs/v2/implementation-status.md` (last three sections) and `git log --oneline -6` on branch `v2`.

## Roles

- **You (Opus): manager/reviewer.** Write test-first slice prompts, review the diff (never the report), run gates yourself, fix, commit to `v2`, push.
- **Cheap model (Muse Spark via OpenCode) / Codex:** executes prompts the user pastes. Cheap model → logic slices with red tests to make green. Codex → visual/judgment slices.
- **User (Varun):** pastes prompts, runs 2-minute click-throughs after each commit, dumps raw issue lists.

Modes: caveman (terse prose) + ponytail (minimal code). Honest scoring — praise only when earned.

## State

Branch `v2`, HEAD `1f8f025`. All green: `tsc`, `eslint --max-warnings=0`, 2276 vitest, both Playwright gates (`scripts/check-v2-04.mjs`, `scripts/check-v2-polish.mjs`) against `VITE_V2_EDITOR=1 npm run build` + `npx vite preview --host 127.0.0.1 --port 4191` with `V2_BASE_URL=http://127.0.0.1:4191`.

Delivered: V2-00 docs, V2-01 schema/geometry/migration, DS-01/02 design system + lab, V2-02 revisioned session, V2-03 isolated IndexedDB repo, V2-04 editor route (`/v2/:id` behind `VITE_V2_EDITOR`), V2-04e polish (live transform preview, resize/rotate, fill/stroke/dash/opacity, free arrows, dot grid, settings, rename, canvas color).

Isolation: `src/opencanvas/v2Graph.test.ts` — v2 roots import only V2_ROOTS + SHARED_KERNEL + adoption allowlist (`pixiPointerOperations.ts`, moves in V2-05). Legacy direct-writer ratchet (4 files). Legacy deletion at V2-15 = delete everything outside those.

Dev: `VITE_V2_EDITOR=1 VITE_V2_LAB=1 npx vite --host 127.0.0.1 --port 5173` → `/#/v2/<id>` and `/#/_labs/v2`. Kill stale dev servers before Playwright — a stale HMR server on the gate's port cost the cheap model an hour of phantom "spurious navigation" debugging.

## Lessons (apply to every prompt)

1. **Slices ≤ 45 min, one outcome, one gate command.** The 4-part V2-04 prompt took 3h and drifted. 04e as "one big pass" pulled in V2-05 scope and stalled mid-move.
2. **Test-first for logic.** Opus writes the `*.test.ts` (public API + expected results), agent makes it green. Removes interpretation. Pixels get one screenshot + user's eyes, not Playwright bisection.
3. **Prompt must say:** run `npx tsc --noEmit && npx eslint src --max-warnings=0 && npx vitest run` and paste output verbatim; no new check scripts; two-strike rule — same fix fails twice → stop, write findings, hand back; no `console.*` in source; no touching files outside the named list.
4. **Review = read the code.** Cheap model self-reports pass; it left `console.info('[v2-trace]')`, a `useCallback([options])` no-op, a "deep-equal" test that only checked `success`, and an effect re-running every render that caused its own bug hunt.
5. **Interaction conventions** come from Excalidraw/FigJam/tldraw: tool reverts to Select after one create; Escape → cancel gesture → disarm tool → clear selection; wheel pans, ⌘/Ctrl+wheel zooms; double-click empty → text; arrows drag from anywhere and bind where they land.

## Next

1. User click-through of `1f8f025`; collect raw issue list → triage: interaction bug (Opus fixes now) / visual polish (Codex) / feature (roadmap slice).
2. **V2-10a agent proposals** — reorder ahead of V2-05/06/07. This is the AI-native payoff; everything so far is the substrate (revision, stale rejection, inverses, single commit path). Wire one real agent action via `ProposalBar` (design-system already has `ProposalBar`, `ProposalReview`, `AgentPanel`, `AgentPresence`) through `resolveAgentActionCommand` → `session.commit` with review/accept/reject and undo. Opus writes the test file first.
3. V2-05: move `pixiPointerOperations.ts` into v2 (allowlist → zero), ports, connector styles, groups.
4. Remaining spine: V2-08 pages, V2-11/12 import/collab, V2-13 migration, V2-14 cutover, V2-15 legacy delete.

## Roadmap estimate

~45% by weight after 04e. Substrate + editor shell done; agent surface, multi-page, migration, and cutover remain. Parallel lanes are now possible (each lane = its own test file + worktree).
