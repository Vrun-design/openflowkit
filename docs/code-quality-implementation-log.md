# Code Quality Implementation Log

## April 26, 2026

### CI and Repo Hygiene Alignment

#### Implemented

- Generated `pnpm-lock.yaml` with pnpm 10.14.0.
- Removed the legacy tracked `package-lock.json`.
- Updated GitHub Actions to use pnpm install, pnpm caching, the full `quality` gate, and `pnpm exec playwright`.
- Added invariant comments to the remaining production hook lint-disable lines.

#### Quality Rationale

- CI and local package metadata now point at the same package manager and lockfile.
- The stronger `quality` gate covers app lint/type/tests plus marketing and docs checks.
- Hook lint exceptions are now reviewable instead of being unexplained suppressions.

## April 23, 2026

### Phase 2 Complete: Large Module Decomposition

#### Implemented

- Extracted ELK layout cache ownership into `src/services/elk-layout/cache.ts`.
- Extracted ELK automatic algorithm selection into `src/services/elk-layout/algorithm.ts`.
- Extracted ELK recursive fallback layout into `src/services/elk-layout/fallback.ts`.
- Extracted AI generation preview diff/copy logic into `src/hooks/ai-generation/previewDiff.ts`.
- Extracted Mermaid SVG path parsing and raw geometry normalization into `src/services/mermaid/svgPathGeometry.ts`.
- Preserved existing public exports for `src/services/elkLayout.ts`, `src/hooks/useAIGeneration.ts`, and `src/services/mermaid/extractLayoutFromSvg.ts`.

#### Plan Changes

- Expanded the original Phase 2A theme-only split into the full Phase 2 decomposition at the user's request.
- Chose stable responsibility splits over broad mechanical slicing: cache, algorithm, fallback layout, preview diffing, and SVG geometry.
- Kept larger behavioral refactors, such as provider adapter work and deeper Mermaid matching extraction, out of this phase to avoid mixing architecture movement with runtime behavior changes.

#### Quality Rationale

- The largest integration files now have smaller, testable support modules without changing their caller-facing contracts.
- Cache, fallback, diff, and geometry logic are easier to reason about independently, reducing future regression and merge-conflict risk.
- Focused tests passed after the splits, and the full app gate passed with lint, default typecheck, strict typecheck, and all tests.

### Phase 2A: Theme Module Decomposition

#### Implemented

- Converted `src/theme.ts` into the directory-backed public module `src/theme/index.ts`.
- Extracted node defaults into `src/theme/nodeDefaults.ts`.
- Extracted section color palette types and data into `src/theme/sectionPalette.ts`.
- Preserved existing `@/theme` and relative `theme` imports without changing call sites.

#### Plan Changes

- Started Phase 2 with `theme` because it is the lowest-risk large-file decomposition target.
- Limited this change to self-contained data extraction instead of mixing in behavior refactors.

#### Quality Rationale

- Keeping the public theme module stable avoids broad import churn.
- Moving static data into focused files reduces navigation cost and future merge conflict risk.
- Targeted and full app quality gates passed after the split.

### Phase 1 Complete: Strict TypeScript Target Expansion

#### Implemented

- Expanded `tsconfig.strict.json` to cover all Phase 1 target folders:
  - `src/lib`
  - `src/services/mermaid`
  - `src/services/storage`
  - `src/services/collaboration`
  - `src/store`
- Fixed strict typing in shared icon resolution by adding a typed icon-name guard.
- Updated markdown editor refs to model React's nullable ref lifecycle correctly.
- Hardened mindmap layout helpers against missing map lookups.
- Hardened bulk node capability checks for nodes without a defined `type`.
- Normalized nullable Mermaid import route and handle metadata to `undefined` where downstream contracts expect optional values.

#### Plan Changes

- Collapsed the remaining Phase 1 mini-phases into one broader strictness pass at the user's request.
- Kept `noUncheckedIndexedAccess` deferred because it introduces a larger cross-module migration that should be handled separately with focused parser and theme tests.

#### Quality Rationale

- The strict sidecar now protects the key domain folders identified in the audit without destabilizing the default build.
- The fixes remove implicit indexing, nullable ref, missing node lookup, and null-vs-undefined risks in shared code paths.
- Full app quality passed after the expansion, so the stricter gate is production-ready for current Phase 1 scope.

### Phase 1C: Store Strict TypeScript Gate

#### Implemented

- Expanded `tsconfig.strict.json` to include `src/store`.

#### Plan Changes

- No store code changes were needed because the store already passed the current strict sidecar rules.

#### Quality Rationale

- The Zustand store is now part of the incremental strict gate, protecting state, persistence, selectors, actions, and document sync from nullability regressions.
- Shipping this as a gate-only expansion avoids unnecessary churn while still increasing reliability.

### Phase 1B: Collaboration Strict TypeScript Gate

#### Implemented

- Expanded `tsconfig.strict.json` to include `src/services/collaboration`.
- Fixed nullable controller access in collaboration canvas snapshot flushing.
- Tightened the Yjs realtime provider event interface to the events actually exposed by `y-webrtc`.
- Removed the unsupported legacy `sync` provider subscription.

#### Plan Changes

- Kept the strict migration focused on one domain after storage instead of expanding to all remaining high-value folders at once.

#### Quality Rationale

- Collaboration is a high-risk runtime path, so strict null checks on its controller and transport contracts reduce remote-sync failure risk.
- Removing the unsupported provider event subscription prevents transport code from depending on events the real provider type does not guarantee.

### Phase 1A: Storage Strict TypeScript Gate

#### Implemented

- Added `tsconfig.strict.json` as a sidecar strict TypeScript config for `src/services/storage`.
- Added `typecheck:strict` and wired it into `quality:app`.
- Added an in-memory persistence fallback when browser storage is unavailable.
- Added a regression test for the no-browser-storage persistence path.

#### Plan Changes

- Narrowed the first strictness migration from several high-value folders to `src/services/storage`.
- Deferred `noUncheckedIndexedAccess` for the broader app because the first probe surfaced many cross-module unchecked index issues outside a safe single change set.

#### Quality Rationale

- Storage is a critical reliability surface, so making it strict first gives immediate production value.
- The in-memory fallback removes an SSR/test/pre-render boot risk where `createJSONStorage` can return `undefined`.
- The sidecar config allows strict migration to proceed incrementally without destabilizing the existing build.

### Implemented

- Added root `typecheck`, `quality:app`, `quality:web`, `quality:docs`, and `quality` scripts.
- Added workspace `typecheck` scripts for `web/` and `docs-site/`.
- Added `packageManager: pnpm@10.14.0` to the root package metadata.
- Added `*.tsbuildinfo` to `.gitignore`.

### Plan Changes

- Deferred removal of `package-lock.json` because the repo does not currently have a committed `pnpm-lock.yaml`.
- Replaced `astro check` with `astro sync && tsc --noEmit --project tsconfig.json` for workspace type checks.

### Quality Rationale

- The new quality scripts make app, marketing site, and docs site verification explicit and repeatable.
- The workspace type checks are non-interactive, so they are suitable for CI and local automation.
- The package manager metadata reduces install ambiguity while avoiding a noisy lockfile migration in the same change set.
- Ignoring TypeScript build metadata prevents machine-generated files from polluting future diffs.
