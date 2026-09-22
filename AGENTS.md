# Agents: read this, then build

The plan lives in `docs/` and is deliberately untracked — it is the owner's
working copy, not part of the repository. Ask the owner for it if your checkout
has no `docs/plan/`. [STATE.md](STATE.md) is tracked and says what is done and
what is next; read it first, then the phase file for the slice you are taking.
Anything under `docs/frozen/` or `docs/archive/` is history — never instructions.

## How to work here

1. Take the next unclaimed slice in `STATE.md`; write your name + date next to it.
   Work on `v2` directly — no slice branches. Several agents share this checkout:
   never `git checkout`, `git add -A`, stash or reset; stage only the paths you touched.
2. Read the code the slice touches end to end before editing (callers, consumers).
3. Build the shortest thing that works. Reuse before write. No new dependency
   without a one-line why. No flags, shims, rollback plans, or "for later" code.
4. Every domain/dsl function gets a unit test beside it. UX slices add one headed
   Playwright check. Merge only when green:
   `npm run typecheck && npm run lint && npm run test -- --run`.
5. Fix forward. The app must boot after every merge. Delete dead code on sight.
6. Update `STATE.md` (≤40 lines) when you finish. Rationale goes in the PR, not in
   new documents.

## Code rules

Domain (`src/opencanvas/domain`, `src/dsl`) is pure TypeScript: no React, Pixi,
DOM, Zustand. Presentation is thin. One undo step per user intent; every command
has an inverse. Heavy work (ELK, parsing) runs off the main thread. Keyboard for
every action. Mark deliberate shortcuts `// ponytail: <ceiling> — <upgrade path>`.
