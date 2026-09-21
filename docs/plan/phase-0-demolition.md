# Phase 0 — Demolition (2 days)

Goal: the repo contains only the new product. `npm run dev` opens the canvas at `/`.
Green typecheck/lint/tests. Nothing legacy is imported by anything that ships.

Why: V1 (React Flow editor, ~60k LOC in `src/components`, `src/hooks`, `src/store`)
is dead weight. Owner decision: delete, no compatibility, keep only a one-shot JSON
import for old files.

## Keep list (everything else in `src/` is a delete candidate)

- `src/opencanvas/domain/**`, `application/**` (minus `collaboration/`,
  `renderer/rendererFamilyFlags.ts`), `infrastructure/pixi/**`, `infrastructure/export/**`,
  `infrastructure/import/canonicalReactFlowImport.ts` (V1 file import),
  `presentation/design-system/**`, `presentation/v2/**`, `testing/**`.
- `src/services/storage/v2/**` and the helpers it imports (`indexedDbHelpers.ts`,
  asset* files if used by v2 export/assets — check with tsc, not by guessing).
- `src/services/mermaid/**` (phase 3 reuses detection/parsing/corpus; it currently
  imports `@/lib/types`/legacy node types in places — leave it compiling, prune later).
- `src/services/elkLayout*`, `src/services/shapeLibrary/**`, `src/services/iconAssetCatalog.ts`
  and the icon packs under `public/`.
- `src/services/ai/**` provider adapters (BYOK; phase 4).
- `src/agent/**`, `mcp-server/**` (phase 4 rebuilds tools on the new surface).
- `src/lib/types.ts` only as far as kept code needs it — shrink, don't delete.
- `docs-site/`, `web/` (public site + docs) untouched.

## Slices

### 0.1 New entry + routes
- Replace `src/App.tsx`: routes `/` → redirect to `/d/<new-id>`; `/d/:id` → V2 editor;
  `/v2/:id` → redirect to `/d/:id`. Nothing else. No rollout flags: `v2Editor` is
  always on; delete `src/config/rolloutFlags.ts` and its two call sites in `v2/`.
- `src/index.tsx` mounts App. Drop i18n import, cinematic context, mobile gate.
- Rename presentation `v2/` → keep the folder name for now (renames are noise);
  drop the `V2` prefix only when touching a file for another reason.
- Check: `npm run dev`, open `/`, draw a rectangle, reload, it persists.

### 0.2 Delete legacy trees
- `git rm -r src/components src/hooks src/store src/store.ts src/context src/canvas
  src/diagram-types src/i18n src/theme src/theme.ts src/app src/docs`
  `src/opencanvas/presentation/*.ts*` (non-v2, non-design-system files),
  `src/opencanvas/application/collaboration`, `src/opencanvas/infrastructure/reactflow`,
  `src/services/collaboration`, `src/services/infraSync`, `src/services/export/mermaid`,
  `src/services/figmaImport`, `src/lib/flowmindDSLParserV2.ts` + `openFlowDSL*`
  (phase 2 writes the new language), `benchmarks/`, `e2e/workflows.spec.ts`.
- Run `npx tsc -b --pretty false`. For every error: delete the file if it is legacy,
  inline the type if it is a small shared type, never re-add a legacy module.
  Iterate until green. Then `npx knip` (add as devDep) to list unreferenced files
  and delete them too.
- Check: tsc green, `git diff --stat` shows deletions ≫ additions.

### 0.3 Dependencies and scripts
- Remove: `@xyflow/react`, `yjs`, `y-webrtc`, `y-indexeddb`, `i18next*`,
  `react-i18next`, `framer-motion`, `posthog-js`, `react-syntax-highlighter`,
  `react-markdown`, `remark-*`, `rehype-slug`, `html-to-image`, `mp4-muxer`,
  `@google/genai` (phase 4 re-adds provider SDKs it actually uses). Keep `mermaid`,
  `@mermaid-js/layout-elk`, `elkjs`, `pixi.js`, `zustand`, `zod-to-json-schema`,
  `jszip`, `pako`, `d3-shape`, `@tabler/icons-react`, `lucide-react` (pick one icon
  set later), `react-router-dom`.
- `package.json` scripts: keep `dev build preview test lint e2e e2e:headed
  build:agent eval:agent shape-pack:*`; add `"typecheck": "tsc -b --pretty false"`;
  delete every `test:s*`, `bench:*`, `test:opencanvas:*`, `opencanvas:release-report`,
  `audit:*`, `mermaid:compat-report`, `build:lib*`.
- Delete `scripts/` files whose script entry was removed. Keep `check-v2-polish.mjs`
  (phase 1 turns it into the feel probe), `generate-sitemap.js`, bundle budget,
  shape-pack tooling, `tighten-svg-viewboxes.mjs`.
- Check: `npm i`, `npm run typecheck && npm run lint && npm run test -- --run` green.

### 0.4 Tests and e2e
- Vitest: deleted code takes its tests with it. Any remaining test that imports a
  deleted module is deleted, not stubbed. Target: whole suite green in < 60 s.
- `e2e/smoke.spec.ts`: open `/`, press `r`, click, expect one node; reload, expect
  it persisted. That is the only e2e until phase 1 adds feel checks.
- `scripts/check-v2-polish.mjs`: point at `/#/d/<id>`.

### 0.5 Repo hygiene
- Root: `STATE.md` (≤40 lines: done / next / open feel bugs), `AGENTS.md` (points
  at `docs/plan/README.md` + the code rules), delete `PRODUCT.md`, `ARCHITECTURE.md`,
  `DESIGN.md` root pointers if they only pointed at frozen docs.
- `README.md`: one paragraph what it is, how to run, link to the plan.
- Remove `V1`/`legacy`/`rollout`/`canary` words from kept code paths where cheap.
- Fix links to `docs/v2/` in `CONTRIBUTING.md`, `src/opencanvas/domain/*/README.md`,
  `src/opencanvas/presentation/design-system/{README,AGENTS}.md` → point at
  `docs/plan/`. Delete `scripts/v2-baseline.mjs`.
- Commit per slice. Push after 0.3 so others can start phase 1/2 on a green tree.

## Done when
`/` shows the canvas; typecheck/lint/test green; `npx knip` reports no unused files
in `src/`; `package.json` has no removed deps; STATE.md says "Phase 0 done".
