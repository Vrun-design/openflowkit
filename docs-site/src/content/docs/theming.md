---
draft: false
title: Theming
description: Use design systems in OpenFlowKit to keep diagram styling consistent without manually restyling every canvas.
---

OpenFlowKit handles theming through reusable design systems rather than ad hoc per-diagram styling.

## What theming means in OpenFlowKit

Theming is not a separate rendering mode. It is the design-system layer that controls how diagrams feel across sessions and teams.

Use it when you want to:

- keep multiple diagrams visually consistent
- create branded variants for different audiences
- avoid hand-tuning colors and styling on every new flow
- move styling definitions between environments

## Recommended workflow

The practical workflow is:

1. Start from a stable default design system.
2. Duplicate it when you need a branded or audience-specific variant.
3. Apply the active design system while editing instead of restyling each diagram manually.
4. Export theme JSON when the styling needs to travel outside the current browser session.

## Where to manage it

Open the Command Center and use the design-system tools to:

- switch the active design system
- duplicate or edit existing themes
- import a theme from JSON
- export the active theme

## Keep the system small

Too many themes usually create drift instead of flexibility. In most cases, one default system and a small number of variants is the maintainable path.

## Related pages

- [Design Systems & Branding](/theming/)
- [Command Center](/keyboard-shortcuts/)
- [Figma Design Import](/theming/)
