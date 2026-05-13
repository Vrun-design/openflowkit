# OpenFlowKit Code Quality Audit

**Date:** April 23, 2026
**Scope:** Main React/Vite app, Astro marketing/docs workspaces, signaling server, scripts, tests, and repo hygiene.
**Reviewer stance:** Senior/100x-dev maintainability review: architecture, code health, quality gates, operational risk, and a practical remediation plan.

## Executive Summary

The codebase is in **generally good and actively maintained shape**. It has meaningful architectural boundaries, a broad test suite, passing lint/type checks, and clear domain separation around the editor, store, diagram plugins, storage, collaboration, Mermaid import/export, and rendering services.

The biggest risks are not "bad code" problems. They are **scale-management problems**:

- Several integration modules are large enough to slow future changes.
- TypeScript is not running in strict mode, so some classes of bugs can still hide.
- The repo is now aligned on pnpm workspace metadata and a generated `pnpm-lock.yaml`; the legacy npm lockfile has been removed from the working tree.
- Build artifacts are ignored, and `tsconfig.tsbuildinfo` has been removed from version control in the current cleanup.
- Workspace quality gates now exist for the app, marketing site, and docs site; GitHub Actions should run the full `quality` gate.
- Local-first storage, AI provider calls, collaboration, and import fidelity are sophisticated but need stronger boundary docs and regression gates as the system grows.

Current verdict: **healthy foundation, medium maintainability risk if growth continues without guardrails.**

## Verified Health Checks

| Check | Result |
| --- | --- |
| `pnpm run lint` | Passed |
| `pnpm exec tsc -b --pretty false` | Passed |
| `pnpm run quality:app` | Passed: 284 test files / 1388 tests |
| `pnpm run quality:web` | Passed |
| `pnpm run quality:docs` | Passed, including Pagefind search index generation |
| `pnpm run test:ci` | Passed |
| Main source files | ~900 TypeScript/TSX files under `src/` |
| Test files | 284 test files under `src/` |
| Production LOC under `src/` | ~86k lines excluding test files |
| Tracked generated files found | Legacy `package-lock.json` removed; `tsconfig.tsbuildinfo` removed from tracking |
| Ignored build/dependency dirs present locally | `node_modules/`, `dist/`, `web/dist/`, `docs-site/dist/`, workspace `node_modules/` |

## What Is Working Well

### 1. Architecture Has Real Boundaries

The repo already has a useful shape:

- `src/store/` contains Zustand state, actions, selectors, persistence, and document sync.
- `src/services/` carries heavy domain logic outside React components.
- `src/diagram-types/` isolates diagram-family plugins and registration.
- `src/components/flow-editor/` separates editor shell, screen model, controller params, and UI-facing controllers.
- `src/services/storage/` has a dedicated local-first persistence layer with IndexedDB/localStorage fallback behavior.
- `src/services/collaboration/` is split into contracts, reducer, runtime controller, transport, session, presence, and tests.

This is a strong base. The codebase is already past the "single app file and vibes" phase.

### 2. Test Coverage Is Broad in the Risky Areas

There are tests around:

- store behavior and persistence
- diagram-family plugins
- Mermaid import/export and compatibility
- storage runtime and IndexedDB fallback paths
- collaboration reducer/transport/session behavior
- canvas interaction helpers
- export services
- route state and i18n coverage

That is exactly where regressions would be expensive.

### 3. Lint and TypeScript Gates Are Currently Green

Both checked gates pass. This matters because the codebase is large enough that unbounded drift would become expensive quickly.

### 4. Plugin-Oriented Diagram Architecture Is a Good Direction

`src/diagram-types/core/registry.ts` is intentionally small and clear. Built-in diagram behavior lives in plugin files instead of being hardwired into the canvas everywhere. This is one of the best architectural choices in the repo.

## Main Issues

## 1. TypeScript Is Too Permissive for This Codebase Size

**Severity:** High
**Area:** `tsconfig.json`, lint policy

`tsconfig.json` does not enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, or similar hardening options. For a large local-first editor with persistence, import/export, AI providers, collaboration, and generated diagram data, this leaves avoidable runtime risk.

Current `no-explicit-any` is only a warning. Today, explicit `any` is not showing up in production code from a targeted scan, which is good. The bigger risk is implicit optional/null/index access behavior.

Recommended direction:

- Add `tsconfig.strict.json` first, without blocking regular development.
- Run strict checks on high-value folders first: `src/lib`, `src/services/storage`, `src/services/collaboration`, `src/services/mermaid`, `src/store`.
- Gradually make strictness the default after each folder is clean.

Status update, April 23, 2026:

- `tsconfig.strict.json` now enforces strict TypeScript for `src/services/storage`.
- `tsconfig.strict.json` now also covers `src/services/collaboration`.
- `tsconfig.strict.json` now also covers `src/store`.
- `tsconfig.strict.json` now covers all Phase 1 target folders: `src/lib`, `src/services/mermaid`, `src/services/storage`, `src/services/collaboration`, and `src/store`.
- `pnpm run typecheck:strict` is wired into `quality:app`.
- Broader `noUncheckedIndexedAccess` migration is intentionally deferred because the first probe exposed many real cross-module unchecked-index issues that should be fixed in focused follow-up changes.

## 2. Large Integration Files Are Becoming Change Bottlenecks

**Severity:** High
**Area:** services, hooks, components, theme

Largest production files currently include:

| File | Lines | Risk |
| --- | ---: | --- |
| `src/services/elkLayout.ts` | 862 | layout orchestration, caching, fallback, routing, and transformation concerns are too concentrated |
| `src/services/mermaid/extractLayoutFromSvg.ts` | 841 | SVG extraction is complex and difficult to safely alter |
| `src/hooks/ai-generation/codebaseAnalyzer.ts` | 839 | analyzer logic likely mixes traversal, summarization, scoring, and formatting |
| `src/theme.ts` | 805 | theme tokens and component styling are hard to navigate as one file |
| `src/services/mermaid/officialFlowchartImport.ts` | 753 | import logic is high-risk and should stay heavily tested |
| `src/services/templateLibrary/starterTemplates.ts` | 703 | large static catalog increases review noise and conflict risk |
| `src/hooks/useAIGeneration.ts` | 663 | AI orchestration is large for one hook |
| `src/components/StudioAIPanelSections.tsx` | 648 | UI sections and behavior are likely coupled |

This is not an emergency, but it is the most important maintainability pressure. These files should be decomposed around stable responsibilities, not split mechanically by line count.

Status update, April 23, 2026:

- `src/theme.ts` has been converted into the directory-backed public module `src/theme/index.ts`.
- Node defaults and section palette data now live in focused theme submodules.
- `src/services/elkLayout.ts` now delegates cache management, automatic algorithm selection, and recursive fallback layout to focused `src/services/elk-layout/*` modules.
- `src/hooks/useAIGeneration.ts` now delegates preview diff/copy construction to `src/hooks/ai-generation/previewDiff.ts`.
- `src/services/mermaid/extractLayoutFromSvg.ts` now delegates SVG path parsing and raw geometry normalization to `src/services/mermaid/svgPathGeometry.ts`.
- Existing public imports remain stable across the Phase 2 splits.

## 3. Root Workspace and Package Manager Signals Conflict

**Severity:** Medium
**Area:** dependency management

The repo has `pnpm-workspace.yaml`, workspace packages, and pnpm-style commands for web/docs builds, but `package-lock.json` is tracked. That implies npm and pnpm have both been used.

Risk:

- dependency resolution differs between developers/CI
- lockfile reviews become noisy or misleading
- workspace installs may not be reproducible

Status update, April 26, 2026:

- `pnpm-lock.yaml` has been generated with pnpm 10.14.0.
- `package-lock.json` has been removed from the working tree.
- CI has been updated to install with `pnpm install --frozen-lockfile`.

Recommended direction:

- Commit `pnpm-lock.yaml` with the package metadata and CI update.
- Keep npm lockfiles out of future commits.
- Keep CI and local quality commands using the same package manager.

## 4. Generated TypeScript Build Metadata Is Tracked

**Severity:** Medium
**Area:** repo hygiene

`tsconfig.tsbuildinfo` is tracked. This file is machine-generated and should not be committed.

Recommended direction:

- Add `*.tsbuildinfo` to `.gitignore`.
- Remove `tsconfig.tsbuildinfo` from version control.

## 5. Workspace Quality Gates Are Uneven

**Severity:** Medium
**Area:** `web/`, `docs-site/`, root scripts

Root lint explicitly ignores `web/**` and `docs-site/**`. Those workspaces have build scripts, but no lint/typecheck scripts in their own `package.json` files.

Risk:

- marketing/docs app drift can bypass normal quality checks
- React 18 in `web/` and React 19 in root may hide integration differences
- Astro upgrades or TypeScript errors can be caught late

Recommended direction:

- Add workspace-level `typecheck` scripts.
- Add workspace-level lint scripts or a shared eslint flat config.
- Add a root `quality` script that runs root lint, root typecheck, web build/typecheck, docs build/typecheck, and targeted tests.

## 6. Editor Orchestration Is Better, But Still a Hotspot

**Severity:** Medium
**Area:** `src/components/flow-editor/*`, `src/components/FlowEditorPanels.tsx`, `src/components/FlowCanvas.tsx`

The architecture guide correctly identifies the editor composition path:

1. `FlowEditor.tsx`
2. `useFlowEditorScreenModel.ts`
3. `buildFlowEditorScreenControllerParams.ts`
4. `useFlowEditorController.ts`

This is a good boundary. The risk is that future work bypasses it and reintroduces cross-wired state, callbacks, and UI behavior.

Recommended direction:

- Add an explicit "editor boundary rules" section to `ARCHITECTURE.md`.
- Add lightweight tests around controller param mapping.
- Keep `FlowEditor.tsx` render-only.
- Move any new editor side effects into hooks/services, not panels.

## 7. Storage and Browser APIs Are Spread Across Multiple Layers

**Severity:** Medium
**Area:** storage, onboarding, analytics, GitHub token, theme, i18n, collaboration

The core storage layer is thoughtfully designed, but browser storage access also appears in theme, onboarding, analytics, recent imports, GitHub token storage, i18n, and collaboration helpers.

This is normal in a browser app, but at this size the project should define which data belongs in:

- IndexedDB local-first repository
- localStorage compatibility backup
- localStorage user preference
- sessionStorage transient secret/session state
- in-memory runtime state

Recommended direction:

- Add a short storage ownership document.
- Prefer small wrappers for new browser storage usage.
- Keep secrets and API keys out of general persisted app state.

## 8. Hook Dependency Exceptions Should Be Reviewed

**Severity:** Low/Medium
**Area:** React hooks

There are a few `eslint-disable-next-line react-hooks/exhaustive-deps` comments in production code:

- `src/components/flow-editor/useFlowEditorController.ts`
- `src/components/ContextMenu.tsx`
- `src/hooks/useAssetCatalog.ts`

These may be legitimate, but each one should carry a short reason or be converted to stable callbacks/refs.

Recommended direction:

- Add a convention: every hook dependency disable needs a comment explaining the invariant.
- Remove disables where stable refs or `useCallback` can express the intent.

Status update, April 26, 2026:

- Existing production hook lint disables now carry short invariant comments.

## 9. AI Provider Client Is Functional but Too Centralized

**Severity:** Medium
**Area:** `src/services/aiService.ts`, `src/services/geminiService.ts`

`aiService.ts` handles provider selection, API key resolution, OpenAI-compatible requests, Anthropic requests, SSE parsing, image handling, and error conversion. It is currently manageable, but provider-specific behavior will keep growing.

Recommended direction:

- Extract provider adapters: `openAiCompatibleClient`, `anthropicClient`, `geminiClient`.
- Keep a small facade that selects the adapter.
- Add contract tests for streaming, bad response, cancellation, and missing API key behavior.

## Implementation Plan

### Phase 0: Repo Hygiene Baseline

Goal: remove ambiguity and make future work safer.

Tasks:

- Add `*.tsbuildinfo` to `.gitignore`.
- Remove `tsconfig.tsbuildinfo` from git.
- Standardize package management on pnpm.
- Add `"packageManager": "pnpm@<approved-version>"`.
- Remove `package-lock.json` once `pnpm-lock.yaml` is confirmed and committed.
- Add a root `quality` script that runs lint, typecheck, and a representative test/build gate.

Acceptance checks:

- Fresh install works with pnpm.
- `pnpm quality` passes locally and in CI.
- No generated metadata files appear in `git status` after typecheck/build.

### Phase 1: TypeScript Hardening Without Blocking Velocity

Goal: improve safety incrementally.

Tasks:

- Add `tsconfig.strict.json`.
- Start with strict checks for `src/lib`, `src/services/storage`, `src/services/collaboration`, `src/store`.
- Turn `@typescript-eslint/no-explicit-any` from warning to error once strict folders are clean.
- Add `noUncheckedIndexedAccess` after the first strict folder migration.

Acceptance checks:

- Strict check script passes for migrated folders.
- No behavior changes.
- Each folder migration lands with targeted tests.

### Phase 2: Split the Highest-Risk Large Files

Goal: reduce change cost in complex modules.

Recommended order:

1. `src/theme.ts`
   - Split into `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/componentStyles.ts`, `src/theme/index.ts`.
   - Lowest behavioral risk, high navigation benefit.

2. `src/services/elkLayout.ts`
   - Extract cache management, graph normalization, fallback layout, and edge rerouting.
   - Keep public exports stable.

3. `src/hooks/useAIGeneration.ts`
   - Extract provider orchestration, prompt assembly, streaming state, and UI callbacks.

4. `src/services/mermaid/extractLayoutFromSvg.ts`
   - Extract geometry helpers, cluster extraction, node matching, and edge extraction.
   - Preserve golden/corpus tests before changing internals.

Acceptance checks:

- Existing tests pass after each extraction.
- Public imports remain stable or are migrated in one scoped change.
- No large behavior refactor is mixed into mechanical extraction.

Status update, April 23, 2026:

- Phase 2 decomposition is complete for the first-pass hotspots: theme data, ELK cache/algorithm/fallback layout, AI preview diffing, and Mermaid SVG geometry.
- `pnpm run quality:app` passed after the full Phase 2 pass: lint, default typecheck, strict typecheck, and 284 test files / 1388 tests.
- Remaining large files are better treated as Phase 4+ behavior-boundary work because deeper splits require more domain-specific regression design.

### Phase 3: Workspace Quality Gates

Goal: make all runtime surfaces first-class.

Tasks:

- Add `typecheck` to `web/package.json` and `docs-site/package.json`.
- Add lint coverage for Astro/TS/TSX files in both workspaces.
- Add root scripts:
  - `quality:app`
  - `quality:web`
  - `quality:docs`
  - `quality`
- Consider CI matrix jobs for app, web, docs, and e2e.

Acceptance checks:

- Root quality command covers all workspaces.
- Web/docs failures cannot silently bypass CI.

### Phase 4: Boundary Docs and Regression Tests

Goal: protect architectural gains.

Tasks:

- Update `ARCHITECTURE.md` with explicit rules for:
  - editor controller boundaries
  - storage ownership
  - diagram plugin extension pattern
  - service-vs-hook-vs-component responsibilities
- Add small tests for editor controller param mapping and AI provider facade behavior.
- Add a storage ownership table documenting every persisted key family.

Acceptance checks:

- New contributors can find where to add editor, storage, AI, and diagram behavior.
- New storage keys have an owner, lifetime, and migration policy.

## Priority Backlog

| Priority | Work | Why |
| --- | --- | --- |
| P0 | Remove tracked generated files and package-manager ambiguity | Prevents install/build drift |
| P1 | Add strict TypeScript sidecar config | Finds hidden correctness issues without freezing development |
| P1 | Split `src/theme.ts` | Low-risk maintainability win |
| P1 | Add workspace quality scripts | Makes web/docs quality visible |
| P2 | Decompose `elkLayout.ts` | Reduces risk in core layout behavior |
| P2 | Decompose `useAIGeneration.ts` and `aiService.ts` | AI provider growth will otherwise get harder |
| P2 | Document storage ownership | Prevents persistence/security regressions |
| P3 | Review hook dependency disables | Small but useful correctness cleanup |

## Final Assessment

OpenFlowKit is not a messy codebase. It is a serious product codebase that has reached the stage where **architecture needs active gardening**. The next quality jump should focus on stricter typing, cleaner workspace gates, package-manager discipline, and carefully extracting large integration modules.

Best next move: start with Phase 0 and Phase 1. They are small, high-leverage, and will make every later refactor safer.
