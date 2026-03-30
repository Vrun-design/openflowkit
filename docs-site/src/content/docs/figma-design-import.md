---
draft: false
title: Figma Design Import
description: Fetch colors and text styles from Figma and apply them to an OpenFlowKit design system.
---

OpenFlowKit includes a Figma import flow for design-system work. Instead of recreating theme tokens manually, you can fetch styles from a Figma file and apply them to a diagram theme.

## What you need

- a Figma file URL
- a Figma personal access token

The token is used in your browser to fetch styles. This is a token-based import flow, not a permanent synced integration.

### Getting a Figma Token

1. Go to Figma Settings > Account
2. Scroll to "Personal access tokens"
3. Create a new token with a descriptive name
4. Copy the token (it won't be shown again)

## What the import previews

The current import flow can preview:

- color styles
- text styles
- font families represented in those text styles

After review, you can apply the result to a design system inside OpenFlowKit.

## Best use cases

- aligning diagrams with an existing design language
- quickly creating a theme from a product or brand system
- reducing manual token setup work before building multiple diagrams

## Recommended workflow

1. Open the Figma import flow.
2. Paste the Figma file URL.
3. Enter a personal access token.
4. Fetch styles and review the preview.
5. Apply the imported result to a design system.
6. Use that design system across your diagram set.

## Related pages

- [Design Systems & Branding](/design-systems-branding/)
- [Templates & Starter Flows](/templates-assets/)
