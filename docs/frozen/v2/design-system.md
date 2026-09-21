---
name: OpenFlowKit
description: A precise, spacious, local-first diagramming studio for builders.
status: direction-required-before-token-freeze
interaction_benchmark: FigJam
connector_benchmark: Miro
brand_seed:
  accent: Builder Orange
  rule: Preserve recognition, redesign the product UI system.
---

# Design System v2: OpenFlowKit

Target-system brief, revised 2026-09-20. This is the sole design-system document in
the current plan. The current tokens/components in `src/index.css`, `src/theme/`,
and `src/components/ui/` are audit evidence, not the v2 visual specification. Reuse
only primitives that pass the new system's visual, interaction, accessibility, and
dependency gates. V2 must not look like the current product with new spacing or a
new renderer. Product scope and behavior are defined by the linked requirements
and interaction specifications in [the docs index](../README.md).

## Overview

**Creative North Star: "The Builder's Instrument"**

OpenFlowKit is a precise workspace, not a decorative canvas. Its visual system
keeps the diagram dominant: quiet neutral surfaces establish orientation, a
single warm orange marks consequential action, and compact controls stay close
to the object being edited. The interface should feel calm at rest and immediate
in motion.

Density is progressive. The first useful action is obvious, while advanced
routing, semantics, layout, and export controls appear in context. The system
rejects generic AI SaaS dashboards, playful sketch-only whiteboards, dense legacy
enterprise diagram tools, and decorative futuristic GPU demos.

The interaction-quality reference is FigJam: generous working space, low-friction
discovery, direct manipulation, restrained chrome, and coherent details at every
zoom. Miro is the reference for technical connector power. These products define
the quality bar, not a visual skin to copy. OpenFlowKit should feel quieter, more
precise, more technical, and more agent-aware.

**Key Characteristics:**

- Local-first and trustworthy.
- Technical, legible, and compact without becoming cramped.
- Restrained at rest; tactile during direct manipulation.
- Consistent across React, DOM overlays, Canvas, WebGL, and exported output.
- Responsive to system theme and reduced-motion preferences.

## Full-system redesign boundary

The v2 design system is rebuilt as a coherent system. It includes application
shell, canvas ground, navigation, toolbars, panels, popovers, menus, dialogs,
toasts, fields, buttons, segmented controls, tabs, lists, trees, empty/error/loading
states, tooltips, icons, cursor vocabulary, selection/connector affordances, agent
presence/proposal states, source-evidence states, typography, spacing, elevation,
color, motion, responsive rules, and export/presentation controls.

Builder Orange and brand recognition may survive. Exact legacy typography, scale,
control dimensions, radii, panel geometry, card patterns, shadows, inspector layout,
white-label abstractions, and component implementations do not receive automatic
compatibility. Document appearance is migrated separately from application chrome.

Before implementation, produce and accept three distinct shell directions using
the same realistic reference document and tasks. Evaluate them at 1440×900,
1280×800, tablet landscape, light/dark, 100% and 200% browser zoom. Choose one
direction using task evidence and explicit principles, then freeze its token and
primitive vocabulary for the first vertical slice. Avoid premature pixel polishing
before spatial composition and interaction hierarchy are accepted.

Use the model roles and independent-review loop in
[the model-assisted execution strategy](model-assisted-execution.md). GPT-6 Astra
is the primary design collaborator for direction and live implementation; Claude
Opus supplies an independent first-pass critique; GPT-5.6 Sol completes bounded
implementation and state coverage. The accepted system and observed task evidence,
not any model's aesthetic preference, decide the result.

## Spatial composition and perceived scale

The current product feels too zoomed in. V2 must give the canvas substantially more
visual breathing room and make the document feel like a workspace rather than a
viewport cropped by application UI.

- At 1440×900 with no utility panel open, persistent chrome should target no more
  than 15% of usable viewport area. V2-00 records FigJam, Miro, current-product, and
  candidate measurements before setting the final budget.
- The canvas begins immediately below/behind compact document controls; avoid a
  dashboard header, permanent inspector, stacked tool rows, or oversized page title.
- Tool groups float at the edge of the workspace or occupy compact rails. Contextual
  controls replace duplicated permanent controls and dismiss when irrelevant.
- Opening a panel must preserve context. Prefer overlay/dismissible panels for short
  tasks; when a docked panel is needed, remember its width and provide a one-action
  collapse. Ordinary editing must never require both side panels open.
- Default `fit` includes comfortable screen-space breathing room and all visible
  labels/markers. Initial Mermaid/import placement fits the created content when
  practical instead of presenting an arbitrarily magnified crop.
- UI controls maintain usable physical hit targets without visually reading as
  oversized. Icons, labels, row heights, canvas handles, and popovers use separate
  visual-size and hit-area tokens.
- Canvas zoom, browser zoom, display scaling, and UI density are separate concerns.
  Browser zoom must not corrupt the camera; canvas handles remain screen-space
  consistent; a future compact preference must use tokens rather than CSS overrides.
- Large empty regions are intentional working space. Do not fill them with cards,
  tips, permanent chat, templates, or decorative effects.

Acceptance uses screenshots only as supporting evidence. Measure canvas-area ratio,
chrome bounds, fit padding, panel occlusion, task time, misclicks, and zoom/pan
corrections on the same realistic diagram. A candidate fails if users repeatedly
zoom out merely to understand the diagram because chrome or default scale consumed
the workspace.

## Colors

Warm signal orange sits over slate-based technical neutrals. Semantic colors are
reserved for status and never replace labels or icons.

### Primary

- **Builder Orange:** The sole product accent. Use for primary actions, active connection states, focus emphasis, and small moments of authorship.
- **Deep Builder Orange:** Hover and pressed emphasis where brightness alone is insufficient.
- **Orange Wash:** Selected or hovered neutral surfaces that need a quiet brand tint.

### Secondary

- **Signal Blue:** Informational status only; it is not a competing brand accent.
- **Recovery Red:** Destructive and failure states only, paired with explicit text.

### Neutral

- **Tool Surface:** Panels, controls, and floating containers.
- **Canvas Ground:** Application background and low-emphasis section surfaces.
- **Ink Slate:** Primary text, strong icons, and high-contrast geometry.
- **Working Slate:** Secondary text, metadata, and inactive icons.
- **Hairline Slate:** One-pixel borders, dividers, and object boundaries.

**The One Signal Rule.** Builder Orange is the only product accent. Do not add a
second ornamental accent to make a screen feel more exciting.

**The Meaning Survives Color Rule.** Selection, error, warning, and connection
states always retain a shape, label, icon, or stroke treatment when color is
unavailable.

## Typography

**Display Font:** Inter (with Segoe UI and system sans fallbacks)  
**Body Font:** Inter (with Segoe UI and system sans fallbacks)  
**Label/Mono Font:** Google Sans Code (with system monospace fallbacks)

**Character:** The primary sans is neutral and highly readable under dense tool
use. Monospace is functional: code, identifiers, generated syntax, and measured
values only.

### Hierarchy

- **Display** (700): Product-level moments and rare empty-state statements; never routine editor chrome.
- **Headline** (600–700): Panel and workflow titles with compact line height.
- **Title** (600): Card, section, and dialog titles.
- **Body** (400–500): Instructions, properties, and explanatory text; keep long prose near 70 characters per line.
- **Label** (600): Controls and concise metadata; uppercase is limited to short menu section labels.
- **Mono** (400–500): Diagram source, code, IDs, coordinates, and diagnostic output.

**The Canvas Owns the Hierarchy Rule.** Editor chrome must not visually outrank
the user's diagram through oversized type or heavy display treatment.

## Elevation

Depth is structural and restrained. Tonal separation and one-pixel borders define
most surfaces; shadows clarify temporary layers such as menus, floating badges,
dialogs, and drag states. Dark mode uses stronger opacity because tonal surfaces
are closer together.

### Shadow Vocabulary

- **Hairline Lift:** `--shadow-xs` for bordered cards and stable editor sections.
- **Control Lift:** `--shadow-sm` for actionable controls and low floating surfaces.
- **Menu Lift:** `--shadow-md` for context menus and popovers.
- **Dialog Lift:** `--shadow-overlay` for modal panels over blocked content.
- **Canvas Float:** `--shadow-floating` for transient badges and canvas affordances.

**The Flat Until Needed Rule.** Stable workspace surfaces remain nearly flat.
Shadows become stronger only when z-order or interaction state must be understood.

## Components

Components are compact, tactile, and keyboard-visible. New implementation uses
scoped tokens under `src/opencanvas/presentation/design-system/`; `src/index.css`
is legacy audit evidence and must not be imported as the new system contract.

### Buttons

- **Shape:** Gently curved by default (8px); pill and square are explicit semantic choices.
- **Primary:** Builder Orange with white text; medium controls are 40px tall with 16px horizontal padding.
- **Hover / Focus:** Increase clarity with brightness or tint, preserve visible focus, and use a restrained pressed scale of 0.98.
- **Secondary / Ghost / Danger:** Secondary uses a bordered Tool Surface; ghost uses transparent chrome; danger uses the semantic recovery surface.

### Cards / Containers

- **Corner Style:** 8px for nested surfaces, 12px for cards, and 16px for modal panels.
- **Background:** Canvas Ground for sections and Tool Surface for controls or overlays.
- **Shadow Strategy:** Hairline Lift at rest; Menu or Dialog Lift only for temporary layers.
- **Border:** One-pixel Hairline Slate is the default boundary.
- **Internal Padding:** Compact and task-dependent; 16px is the standard card baseline.

### Inputs / Fields

- **Style:** Tool Surface, one-pixel Hairline Slate border, 8px radius, and compact body text.
- **Focus:** Builder Orange border emphasis plus a low-opacity ring.
- **Error / Disabled:** Pair semantic color with text; disabled fields reduce emphasis but preserve readable content.

### Navigation

Navigation uses compact labels, restrained icons, and Canvas Ground hover surfaces.
Active state is communicated with contrast and a persistent marker, not color
alone. On narrow screens, preserve access to creation, undo, and export before
secondary settings.

### Canvas Context Menu

The context menu is a 12px-radius Tool Surface with a one-pixel border, Menu Lift,
6px internal padding, 200–280px width, roving keyboard focus, and viewport-aware
placement. Actions are grouped by fine dividers; destructive actions stay red and
spatially separated.

## Do's and Don'ts

### Do:

- **Do** keep the diagram visually dominant and editor chrome compact.
- **Do** use Builder Orange only for primary action, focus, selection, or active connection meaning.
- **Do** use 4px, 6px, 8px, 12px, and 16px radii according to component depth.
- **Do** preserve visible focus, reduced-motion behavior, keyboard operation, and non-color state cues.
- **Do** make renderer changes visually consistent across DOM overlays, WebGL content, fallback rendering, and exports.
- **Do** make errors recoverable and state whether the user's work remains safe.

### Don't:

- **Don't** build generic AI SaaS dashboards that make the assistant more prominent than the work.
- **Don't** imitate playful sketch-only whiteboards that trade precision and semantics for novelty.
- **Don't** recreate dense legacy enterprise diagram tools with modal-heavy, form-first workflows.
- **Don't** add decorative futuristic GPU demos whose effects reduce legibility or predictability.
- **Don't** introduce purple gradients, neon glow, glass-heavy surfaces, or competing accent colors as generic "innovation" styling.
- **Don't** hide essential canvas actions behind pointer-only gestures or color-only feedback.


## Production foundation and adoption (2026-09-20)

Owner explicitly prioritized reusable production UI foundations ahead of further
standalone explorations. Lead direction: light, spacious canvas with floating tools;
dark mode remains first-class. The standalone HTML study was rejected and removed.
This changes design-foundation sequencing only, not schema, persistence, or release gates.

Implementation entry: [UI foundation README](../../src/opencanvas/presentation/design-system/README.md).
Contributor rules: [module AGENTS.md](../../src/opencanvas/presentation/design-system/AGENTS.md).
These explain code contracts; this document retains design authority.

### Token ownership

- Foundation scales own type, weight, leading, spacing, control/hit sizes, radius,
  focus, canvas sizing, motion, layout and layer order.
- Semantic colors own canvas/surface/raised, four text levels, borders, primary,
  focus/selection and paired status colors. Both themes expose the same role keys.
- Components consume roles through scoped `--ofk-*` properties. Pixi adapters
  consume numeric colors from the same source. No computed-style reads per frame.
- Brand seed remains `#e95420`. Accessible text/action variants are darker in light
  mode and lighter in dark mode. Do not place white normal text on the seed by default.
- Current color transport uses shared sRGB values for deterministic DOM/Pixi output.
  Perceptual palette authoring can evolve, but must preserve tested contrast and
  synchronized renderer output. Avoid independent CSS/Pixi color definitions.
- Appearance follows the host's resolved preference; density changes control size,
  not camera zoom. Touch target minimum remains 44 CSS pixels in both densities.
- Document appearance is a separate portable contract. Chrome tokens are never
  silently written into imported diagram styles or used to override authored colors.

### State and workflow quality gates

| Surface | Required contract |
| --- | --- |
| Controls | Default, hover, pressed, selected, focus-visible, disabled, busy, error; native semantics; localized labels |
| Menus and popovers | Focus entry/return, Escape, collision avoidance, keyboard navigation and touch equivalents; not implemented yet |
| Panels | Task-scoped, one-action dismissal, stable camera, responsive width, long content and labels; not implemented yet |
| Canvas manipulation | Screen-space handles/targets, immediate pointer response, explicit cancel, one commit/inverse per gesture |
| AI work | Named scope, cancellable generation, separate preview, change summary, stale-revision state, atomic accept, undo |
| Save/recovery | Dirty/pending/saved/failed/conflict are distinct; saved only after durable success; reachable backup path |
| Motion | Direct manipulation 0ms; feedback 150ms; navigation 180ms; reveal 220ms; settle 240ms; interruption and reduced motion |
| Large AI batches | One bounded feedback sequence, no object-count-dependent stagger, no unsolicited pan/zoom |
| Accessibility | Non-color markers, contrast, keyboard, screen readers, RTL, touch, 200% browser zoom, reduced motion and forced colors |

A polished isolated state is not complete feature acceptance. Every new roadmap
capability must compose these contracts with the shared operation registry and
production persistence/undo/export/agent coverage. Designers and implementation
agents may not add alternate buttons, palettes or motion recipes locally.

### Current component coverage

Implemented: SystemRoot, Button/IconButton, Field, Toolbar, Status, ProposalBar,
canvas feedback recipes/SVG adapter and motion recipes. Camera controls are the
first app consumer, in the existing flag-gated OpenCanvas canary route. Proposal UI
and feedback adapters are reusable code, not a shipped AI integration or new canvas
controller. See implementation status for checks and limitations.

Next primitive is selected by the next real vertical slice, not a generic catalogue.
Menus, tooltip, dialog, panel, tree, command surface and full contextual editing must
receive complete behavior before adoption. Do not infer their delivery from this list.

### Design lab route (2026-09-20)

Owner asked to see the direction before the shell exists. `/_labs/v2` (dev only,
`VITE_V2_LAB=1`, tree-shaken from default builds) renders a mock of the target shell
and a gallery of every primitive state in both themes/densities, built only from
the real design-system primitives. It is a review surface for tweaking tokens and
composition, not product code and not progress toward V2-04. Owner reviews the
lab instead of standalone HTML/Storybook. Source: `src/opencanvas/presentation/V2LabPage.tsx`.
