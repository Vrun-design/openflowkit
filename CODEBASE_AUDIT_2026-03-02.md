# OpenFlowKit Codebase Audit

Date: 2026-03-02  
Auditor: Codex (static + tooling audit)  
Scope: Full repository scan (`src`, configs, scripts, tests, build artifacts)

## Executive Summary

Overall quality is now **good**, with major stability/maintainability improvements completed.

- Code Quality: **8/10**
- Scalability: **7.5/10**
- Maintainability: **7.5/10**
- Test Confidence: **6/10**
- Production Readiness: **7.5/10**

Top concerns:

1. Full browser-level end-to-end flows are still lighter than ideal, despite stronger integration coverage.
2. Global store orchestration is now slice-composed, with moderate coupling still only at central composition boundaries.
3. CI guardrails are in place; enforce them continuously as provider/model matrices evolve.

## Remediation Progress Update (2026-03-02)

Current verification snapshot after fixes:

- `npm run lint`: **pass** (0 errors, 0 warnings)
- `npm test -- --run`: **pass** (10 files, 46 tests)
- `npm run test:ci`: **pass** (lint + tests + i18n check + build smoke + guardrails)

Status by finding:

1. API key exposure path: **Resolved**
2. Docs chatbot docs glob/context issue: **Resolved**
3. React correctness/lint blockers: **Resolved**
4. Dual persistence systems: **Resolved** (legacy autosave migration path removed; store persist is the single persistence path)
5. Monolithic modules: **Partially resolved** (`AISettings`, `NodeProperties`, and `mermaidParser` split; `store.ts` reduced and action groups extracted into `src/store/actions/*`; `FlowEditor.tsx`, `TopNav.tsx`, `HomePage.tsx`, and `Toolbar.tsx` reduced with extracted hooks/components)
6. Type safety erosion (`any`): **Resolved for current lint scope**
7. Provider config duplication: **Resolved** (`aiProviders.ts` is source-of-truth for defaults/base URLs and validated by CI guardrail tests)
8. i18n duplication drift: **Resolved** (single canonical locale source + maintenance script)
9. Generated artifacts in source tree: **Resolved** (artifacts removed/ignored in active workspace)
10. Determinism/ID generation: **Resolved** (`crypto.randomUUID` and deterministic defaults)

## Method

- Structural scan: file inventory, module size ranking, duplication signals.
- Static checks: `npm run lint`, `npm test -- --run`.
- Hotspot review: store, editor/canvas, AI stack, parser/export, docs chatbot, persistence hooks.

## Tooling Results

### Lint

`npm run lint` now passes with:

- **0 errors**
- **0 warnings**

### Tests

`npm test -- --run` now passes:

- 6 test files
- 38 tests
- Coverage improved (including autosave and flow editor action hooks), but still leans toward unit tests over full integration flows.

## Findings (Ordered by Severity)

## 1) High: Potential API key exposure path in client bundle

- `vite.config.ts:14-17` defines:
  - `process.env.API_KEY`
  - `process.env.GEMINI_API_KEY`
- `src/services/geminiService.ts:232` reads `process.env.API_KEY` in browser code.

Risk:

- Any key set at build time can be embedded into shipped JS and visible to users.
- This conflicts with BYOK/local privacy expectations.

Recommendation:

- Remove server-style `process.env.*` injection from Vite client config.
- Use explicit runtime BYOK only (`aiSettings.apiKey`) or backend proxy pattern.

## 2) High: Docs chatbot likely loads no docs context

- `src/components/docs/DocsChatbot.tsx:13` uses `import.meta.glob('/docs/*.md', ...)`.
- Actual docs are nested in `docs/en/*.md` and `docs/tr/*.md`.

Risk:

- Docs AI answers may run without intended docs grounding.
- Quality and trust drop despite "docs-based" UX promise.

Recommendation:

- Change to `import.meta.glob('/docs/**/*.md', ...)`.
- Add a guard/assertion that `docsContext.length > 0` and show warning if empty.

## 3) High: React correctness violations in production code

- Ref access during render:
  - `src/components/CustomEdge.tsx:100-102`
- Conditional hook calls:
  - `src/components/ui/Input.tsx:17`
  - `src/components/ui/Textarea.tsx:17`
- Synchronous setState in effect:
  - `src/hooks/usePlayback.ts:94`
  - `src/components/properties/NodeProperties.tsx:132`
- JSX comment rendered as text:
  - `src/components/HeroCanvas.tsx:42-44`

Risk:

- Render instability, unnecessary rerenders, brittle behavior, lint-gated CI blockage.

Recommendation:

- Fix hook usage ordering, move ref/path measurement into effect/layout effect, and refactor effect-driven setState patterns.

## 4) High: Dual persistence systems create state drift risk

- Zustand persisted store:
  - `src/store.ts:245-613` (`persist`, key `openflowkit-storage`)
- Independent autosave:
  - `src/hooks/useAutoSave.ts:4-91` (`flowmind_app_state`)

Risk:

- Competing sources of truth for tabs/nodes/history.
- Recovery behavior becomes nondeterministic and hard to debug.

Recommendation:

- Consolidate persistence into a single persistence pipeline (prefer store-level with versioned migrations).
- Remove duplicated localStorage contract or strictly scope one as backup/export.

## 5) Medium-High: Large monolithic modules ("spaghetti vector")

Original hotspots by size/responsibility were:

- `src/components/SettingsModal/AISettings.tsx` (765 lines)
- `src/store.ts` (613 lines)
- `src/lib/mermaidParser.ts` (567 lines)
- `src/components/properties/NodeProperties.tsx` (521 lines)
- `src/components/FlowEditor.tsx` (488 lines)

Current sizes after remediation:

- `src/components/SettingsModal/AISettings.tsx` (**335** lines)
- `src/store.ts` (**397** lines)
- `src/lib/mermaidParser.ts` (**277** lines)
- `src/components/properties/NodeProperties.tsx` (**310** lines)
- `src/components/FlowEditor.tsx` (**337** lines)

Risk:

- Low change locality, high merge conflict rate, hard onboarding, fragile regressions.

Recommendation:

- Split by concern:
  - Store slices (`tabs`, `design-system`, `ai`, `brand`, `view`).
  - AI settings into metadata/config + presentational subcomponents.
  - Node properties into per-node-type sections.

## 6) Medium-High: Type safety erosion (`any` in core paths)

Evidence:

- Widespread `any` in AI, parser, edges, playback, exporter, node operations.
- Lint shows many `@typescript-eslint/no-explicit-any` warnings.

Risk:

- Hidden runtime errors, weaker IDE assistance, expensive refactoring.

Recommendation:

- Introduce strict typed interfaces for:
  - AI response payloads
  - Edge/node data contracts
  - parser attribute values (`unknown` + narrowing)

## 7) Medium: Configuration/data duplication

Provider defaults and model lists duplicated across:

- `src/components/SettingsModal/AISettings.tsx`
- `src/services/aiService.ts`

There is even a manual sync comment:

- `src/services/geminiService.ts:3`

Risk:

- Silent drift (UI shows one default, runtime uses another).

Recommendation:

- Centralize provider registry in one typed config module shared by UI + service.

## 8) Medium: i18n duplication and potential drift

Two locale trees exist:

- `src/i18n/locales/*/translation.json`
- `public/locales/*/translation.json`

Current files are not byte-identical (all language cmp checks returned different).

Risk:

- Confusion over source of truth, stale translations, unnecessary review churn.

Recommendation:

- Keep one canonical locale source; generate/copy at build-time if needed.

## 9) Medium: Generated artifacts and packaging leftovers in source tree

Observed:

- `dist-lib/*` tracked in git.
- `src/lib/openflowkit-core-0.1.0.tgz` present in source.
- `src/lib/dist/*` exists locally and influences lint noise.

Risk:

- Repo bloat, noisy diffs, accidental stale bundle usage.

Recommendation:

- Keep generated bundles out of primary app repo branch (or isolate release branch/process).
- Enforce ignore/build-clean rules.

## 10) Medium: Determinism and ID generation quality

Examples:

- IDs from `Date.now()` in multiple places (`useNodeOperations`, `store` tab creation, etc.).
- Randomized default node placement (`Math.random()`).

Risk:

- Harder reproducibility, flaky tests, edge-case ID collisions in high-frequency ops.

Recommendation:

- Use deterministic ID generator (`nanoid`/`crypto.randomUUID`) and predictable placement strategy.

## Architecture Assessment

What is good:

- Clear feature richness and practical decomposition into hooks/services/components.
- Zustand + ReactFlow stack is appropriate for this product.
- Parser/export/test foundation exists and is functional.

What limits scalability:

- High coupling through one large global store and orchestrator components.
- Weak domain boundaries in AI + settings modules.
- Missing integration tests around critical user flows (AI generation, tab persistence, export/import, edge editing).

## Maintainability Assessment

Current state:

- Maintainability is **below desired level** for long-term velocity.
- The codebase is workable, but brittle under frequent feature changes.

Primary maintainability blockers:

1. Large mixed-responsibility files.
2. Lint debt and type debt.
3. Duplicated config/data sources.
4. Overlapping persistence systems.

## "Spaghetti / Duplication / Stupid Code" Verdict

- **Spaghetti risk:** Present and growing (monolith modules, cross-cutting store access).
- **Duplication:** Significant (AI provider metadata, locale trees, persistence layers, generated artifacts).
- **Stupid code:** Not broadly; mostly pragmatic fast-shipping code, but there are avoidable correctness violations and config drift traps.

## 30-Day Remediation Plan (Pragmatic)

1. Stabilize correctness (Week 1)
- Fix all lint errors (not warnings) and enforce CI lint pass.
- Patch docs glob issue and verify docs context loading.
- Remove client build-time API key injection path.

2. Reduce coupling (Week 2)
- Split `store.ts` into slices.
- Extract `AISettings` metadata + reusable subcomponents.
- Normalize provider config into one source module.

3. De-risk persistence and typing (Week 3)
- Unify local persistence contract.
- Replace critical `any` paths with typed interfaces and guards.

4. Raise confidence (Week 4)
- Add integration tests for: AI generate flow, tab restore, import/export roundtrip, edge label drag.
- Add a small architecture decision record for persistence and AI provider model.

## Final Verdict

The repository is **feature-strong but engineering-debt heavy**.  
It can scale functionally in the short term, but without debt reduction, development speed and reliability will degrade quickly as contributors and features grow.
