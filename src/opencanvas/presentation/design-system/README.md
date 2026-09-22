# OpenFlowKit UI foundation

Internal React + TypeScript foundation for the editor. Product plan:
[docs/plan/README.md](../../../../docs/plan/README.md). No document storage or authoring ownership lives here.

## Layers and integration

| Layer               | API                                                  | Responsibility                                                  |
| ------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Foundation          | `foundation`                                         | Spacing, typography, density, geometry, timing, brand seed      |
| Semantic appearance | `themes`, `ColorRole`                                | Light/dark surface, text, interaction and status roles          |
| Platform adapter    | `SystemRoot`, `rendererColor`                        | Scoped CSS variables; numeric Pixi colors from same source      |
| Primitives          | `Button`, `IconButton`, `Field`, `NumberField`, `Dropdown`, `Slider`, `Segmented`, `Checkbox`, `Switch`, `ColorSwatch`, `Tabs`, `Toolbar`, `Status` | Native inputs underneath (keyboard, AT, forms), our tokens and icons on top; `Dropdown` is the listbox |
| Overlays            | `Popover`, `Menu`, `Dialog`, `Panel`, `CommandPalette`, `Tooltip`, `ToastRegion`, `ContextBar` | Anchored layers with collision flip, focus entry/return, Escape; panels clear the top toolbar lane, the context bar floats above panels |
| Loading             | `Skeleton`, `SkeletonLines`, `Spinner`, `Progress`, `Thinking`, `EmptyState`, `ErrorState` | Shimmer placeholders, busy marks, determinate/indeterminate bars, agent cognition, empty/failed states with recovery |
| Workflow pattern    | `ProposalBar`, `ProposalReview`, `Composer`, `AgentPanel`, `AgentPresence` | Scope, preview, stale, pending, failed and applied presentation |
| Canvas feedback     | `canvasFeedback`, `CanvasFeedbackOverlay`            | Selection/binding/change cues in CSS screen pixels              |
| Motion policy       | `motionRecipe`, `spring`                             | Immediate manipulation; bounded, interruptible feedback         |

```tsx
import { SystemRoot, Toolbar, Button } from './design-system';

<SystemRoot appearance={resolvedAppearance} dir={direction}>
  <Toolbar label={t('canvas.tools')}>
    <Button variant="quiet" selected={tool === 'select'} onClick={selectTool}>
      {t('canvas.select')}
    </Button>
  </Toolbar>
</SystemRoot>;
```

The host owns appearance preference, locale, tool state, keyboard shortcuts, actions,
permissions, history and storage. SystemRoot writes scoped tokens, comfortable/compact density, not global CSS or
localStorage. Existing app integration is OpenCanvasCameraControls in the opt-in
OpenCanvas route. The default editor shell has not been replaced.

Use direct imports for pure adapters:

```ts
import { canvasFeedback, screenPixelsToWorld } from './design-system/canvasFeedback';
const style = canvasFeedback('selection', appearance, pointerType);
const worldHitSize = screenPixelsToWorld(style.hitTargetPx, camera.zoom);
```

Inputs are CSS screen pixels, not device pixels. Convert once. DPR belongs to renderer.
The SVG feedback adapter receives already projected, viewport-culled bounds. It draws
axis-aligned feedback only; rotated outlines, connector handles and hit testing remain
owned by the editor geometry/interaction adapters. Feedback never intercepts pointers.
Expose the same state in the semantic scene tree; decorative SVG is aria-hidden.

## Floating lanes

Panels are overlays, never docked push-canvas: docking reflows the camera and
spends the 85%-canvas budget permanently, while these panels are transient task
surfaces. Collisions are prevented by contract, not by docking:

- `foundation.layout.topLane` (72px) reserves the top toolbar lane. Side panels
  start below it, so doc/history/share controls are never covered.
- `foundation.layer.context` (35) puts the selection context bar above side
  panels and below menus/popovers opened from it. The editing surface never
  loses to a reference surface.
- Every dismiss path (Escape, outside pointer, Tab) restores focus to the
  invoker *before* unmount; unmount cleanups run after the browser has already
  reset focus and are only a fallback.

## Component contracts

- Button defaults to `type=button`. Native disabled prevents interaction. Busy
  preserves focus, suppresses click/keyboard activation and exposes `aria-busy`.
  IconButton requires an accessible label. Title is supplemental, not a complete
  touch-accessible tooltip implementation. Selected controls have border/underline
  cues as well as color. Host owns confirmation for destructive operations.
- Field connects label/hint/error through IDs and preserves external descriptions.
  Errors use text plus border. Host validates values and localizes messages.
- Toolbar is one button Tab stop with Home/End and wrapping arrow navigation,
  reversed in RTL. Native inputs keep caret keys. Disabled tools are skipped;
  busy focus is retained. Hidden native descendants are excluded.
- Dropdown is a single Tab stop opening an anchored listbox: arrows move with
  disabled options skipped, Home/End jump, 600ms typeahead matches Menu,
  Enter commits, Escape/Tab close with focus back on the trigger. The list
  matches the trigger width and flips on collision like Popover.
- NumberField is a spinbutton with draft typing: partial input ("1.", "") never
  clobbers, Escape reverts, Enter/blur/steppers commit once via `onCommit`.
- Dialog generates unique title/description IDs per instance; native `<dialog>`
  provides modal focus trap, inert background and Escape.
- Panel focuses its close control on mount, closes on Escape with focus back
  on the invoker, and slides in from its edge (bottom sheet under 720px).
- Status pairs a symbol with text. Use `live` for meaningful state changes, not
  pointer movement or streaming tokens. Avoid repeated announcements per frame.
- ProposalBar guards stale/pending acceptance for UX. `onAccept(id, revision)` must
  return the commit-service promise. The host must publish the resulting applied
  or stale state. No UI guard substitutes for atomic revision/idempotency checks.
  Render keyed by document/session identity to isolate pending asynchronous work.
  Discard/cancel must abort the corresponding operation in the host.

## Interaction and motion language

1. Human pointer motion, text editing, handles and bindings respond immediately.
   No spring following the pointer, animated hit target, or delayed mutation.
2. AI generation is a cancellable status beside its declared scope. Never animate
   invented progress or add model streaming tokens as temporary document records.
3. Proposed additions use plus/dashed outlines, changes delta markers, removals
   minus/dashed outlines. Originals stay intact. Show scope and a text summary.
4. Accept validates and commits once. The host switches to applied only after
   success. Feedback may settle in 240ms; history/save are never delayed for it.
5. Large batches get one summary, no per-object stagger. New content outside the
   viewport gets an explicit Show changes action, not a camera hijack.
6. Escape/cancel/lost capture discard uncommitted preview. Undo is one action after
   successful commit. Stale output offers a fresh request; it cannot overwrite edits.
7. Reduced motion sets recipe duration to zero. CSS controls suppress transitions.
   Existing camera easing remains its tested cubic interpolation; its duration now
   uses the shared navigation token. Recipes do not schedule animations themselves.

## Extension rules and known coverage

Add a real consumer and complete state contract together. Prefer composition over
feature-specific button variants. No prop that fetches/saves/accepts a provider name.
No domain imports this presentation package. Build editor UI around one operation
registry; shortcuts and buttons must dispatch the same operation.

Implemented checks cover text/primary contrast, control/focus contrast, zoom-invariant
feedback sizing, busy/stale guards, field naming, toolbar navigation and motion policy.
Menus/popovers/dialogs, tooltip behavior, focus trapping/return, layer stack, semantic
tree integration, full canvas controller, authored styles, and production proposal
integration are not implemented here yet. Build each against its roadmap consumer.

Do not claim mature product acceptance until actual route, all input modes, real
screen readers, 200% browser zoom, localization, GPU and customer-task gates pass.

```sh
npm run test -- --run src/opencanvas/presentation/design-system/foundation.test.tsx
npm run lint
npm run build:ci
```

Visual review: `VITE_V2_LAB=1 npm run dev`, open `/#/_labs/v2`. Shell tab is a mock
of the target product shell (fake data, real primitives); Primitives tab lists every
state. Light/dark and density toggles are in the lab bar. Not a product route.

Browser integration check (fresh profile, synthetic local document only): start
`VITE_OPEN_CANVAS_DOCUMENT_V1=1 VITE_OPEN_CANVAS_RENDERER_V1=1 npm run dev -- --host 127.0.0.1 --port 4188`,
then run `node scripts/check-v2-design-foundation.mjs`. Evidence goes to
`docs/evidence/v2-foundation/`; the script does not use your browser profile.
