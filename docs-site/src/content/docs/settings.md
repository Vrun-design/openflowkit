---
title: Settings and preferences
description: Every preference OpenFlowKit keeps — appearance, grid, palette, the agent bridge — and where each one lives.
---

Preferences are stored per browser in `localStorage` under one key and are validated
field by field on read; a corrupt entry falls back to the default. Nothing is synced: every
origin and browser has its own set.

## Settings popover

Open the canvas menu → **Settings**.

| Setting | Options | Effect |
| --- | --- | --- |
| Appearance | Light, Dark, System | The app's theme; System follows the OS |
| Density | Comfortable, Compact | Control sizes throughout the chrome |
| Dot grid | On, Off | The canvas grid |
| Snap to grid | On, Off | Whether drags snap to the grid (hold `⌘`/`Ctrl` to bypass) |

## Elsewhere in the app

Some preferences live with the thing they affect:

| Preference | Where |
| --- | --- |
| Canvas background | Camera controls; reset to the theme default |
| Diagram palette (`pastel`, `paper`, `builder`, `mono`) | The code panel's palette picker; the default for generated frames, and synced from a frame you open with **Edit as code** |
| Agent bridge port, token, enable | The **Connect agent** panel — see [MCP Server](/mcp-server/) |
| Tag perspectives | The [model panel](/architecture-c4/) — which tags stay bright |
| Recent emoji | The [emoji picker](/insert-media/), newest first |

## The diagram palette

The palette is a document-level default: compiled frames carry the palette that generated
them, and a frame's own `appearance:` line wins over the panel. Paper and mono exist for
print-friendly and greyscale output; see [Theming](/theming/).

## What it cannot do

- **No account or profile.** Preferences are per browser, not per person.
- **No preference import/export.** Copy them by hand if you move machines.
- **No per-document theme.** The theme is an app preference; a document's diagram palette is
  the per-document part.

## Where to go next

- [Theming](/theming/) — palettes and the light/dark pair.
- [Canvas basics](/canvas-basics/) — how grid and snapping behave during a drag.
