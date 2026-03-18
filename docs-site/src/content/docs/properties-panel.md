---
draft: false
title: Properties Panel
---

The Properties panel is the right-side inspector that appears when you select a node or edge. It is the main place for exact edits after rough structure is already on the canvas.

## What opens in the right rail

The rail changes based on selection state:

- one node selected: node inspector
- multiple nodes selected: bulk edit
- one edge selected: edge inspector
- Studio mode active: AI, code, or playback rail instead of properties

## Node editing

For a typical node, the inspector exposes combinations of these sections:

- **Content** for label and sublabel
- **Shape** for geometry selection
- **Color** for presets and custom color
- **Icon** for icon changes
- **Typography** for font and emphasis controls
- **Image** settings for image nodes
- **Variant** settings for browser/mobile wireframes

Some families add their own controls. For example:

- mind maps expose child and sibling creation actions
- architecture nodes expose architecture-specific semantics
- icon-backed asset nodes expose asset search and category filtering

## Edge editing

When an edge is selected, the panel exposes:

- **Label**
- **Route**
- **Color**
- **Appearance**
- **Condition**

If both ends are architecture nodes, you also get an **Architecture** section for connection semantics such as protocol and direction.

## Bulk edit mode

When you multi-select nodes, the panel switches to bulk mode. Use this for operations like:

- applying the same color to a group
- changing shared typography
- normalizing labels with prefixes or suffixes

This is faster than editing nodes one by one after template insertion or AI generation.

## Practical workflow

A good editing pattern is:

1. create structure on canvas
2. select key nodes and assign the right family or icon style
3. use bulk edit for visual consistency
4. finish with edge labels and route cleanup

## When not to use the panel

Do not force everything through the inspector.

- For large structural changes, use auto layout
- For mass insertion, use templates or assets
- For text-first refactors, use Studio with OpenFlow DSL or Mermaid

### Visual Styling
Make your diagrams pop with custom styles:
*   **Colors**: Choose from a curated palette of semantic colors (Red for danger, Green for success, etc.).
*   **Icons**: Add an icon to any node to make it instantly recognizable. We support the full Lucide React icon library.
*   **Stroke Style**: Toggle between `Solid` and `Dashed` borders (great for representing tentative or future states).

### Layout & Sizing
*   **Width/Height**: Manually set dimensions for pixel-perfect alignment.
*   **Position**: View and edit exact X/Y coordinates.

## Bulk Editing

> [!TIP]
> You can select multiple nodes (`Shift + Click`) to edit them all at once!

When multiple nodes are selected, the Properties Panel will apply changes (like color or icon) to **all** selected nodes.
