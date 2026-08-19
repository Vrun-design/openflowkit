---
name: OpenFlowKit
description: A precise, local-first diagramming studio for builders.
colors:
  primary: '#e95420'
  primary-deep: '#d14a1b'
  primary-soft: '#fef4f0'
  surface: '#ffffff'
  background: '#f8fafc'
  text: '#0f172a'
  secondary-text: '#64748b'
  border: '#e2e8f0'
  danger: '#b91c1c'
  info: '#1d4ed8'
typography:
  display:
    fontFamily: 'Inter, Segoe UI, ui-sans-serif, system-ui, sans-serif'
    fontWeight: 700
  body:
    fontFamily: 'Inter, Segoe UI, ui-sans-serif, system-ui, sans-serif'
    fontWeight: 400
  label:
    fontFamily: 'Inter, Segoe UI, ui-sans-serif, system-ui, sans-serif'
    fontWeight: 600
  mono:
    fontFamily: 'Google Sans Code, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    fontWeight: 400
rounded:
  xs: '4px'
  sm: '6px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  pill: '9999px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    rounded: '{rounded.md}'
    padding: '10px 16px'
    height: '40px'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '10px 16px'
    height: '40px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.secondary-text}'
    rounded: '{rounded.md}'
    padding: '10px 16px'
    height: '40px'
  field-default:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
    height: '40px'
  surface-card:
    backgroundColor: '{colors.background}'
    textColor: '{colors.text}'
    rounded: '{rounded.lg}'
    padding: '16px'
---

# Design System: OpenFlowKit

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

**Key Characteristics:**

- Local-first and trustworthy.
- Technical, legible, and compact without becoming cramped.
- Restrained at rest; tactile during direct manipulation.
- Consistent across React, DOM overlays, Canvas, WebGL, and exported output.
- Responsive to system theme and reduced-motion preferences.

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

Components are compact, tactile, keyboard-visible, and built from the shared CSS
custom properties in `src/index.css`.

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
