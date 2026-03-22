---
draft: false
title: Design Systems & Branding
description: Manage reusable design systems in OpenFlowKit and import or export theme definitions for consistent diagrams.
---

OpenFlowKit includes design-system support so your diagrams can inherit a repeatable visual language instead of being styled one by one.

## What the design-system flow supports

From the Command Center you can:

- switch the active design system
- create a new theme from an existing base
- duplicate and edit themes
- import theme JSON
- export the active theme

This is the right workflow when consistency matters as much as diagram correctness.

## When to use it

Use design systems when:

- multiple diagrams should share a consistent look
- your team has visual standards you want to reuse
- you want architecture, workflow, and product diagrams to feel like one system
- you need to package diagram styling as something reusable instead of manual

## Import and export

The design-system view supports JSON import and export. That makes it possible to:

- move a theme between environments
- create branded variants
- version visual settings outside the current session

## Relationship to Figma

Figma style import is a related workflow. Use it when you want to fetch colors and text styles from a Figma file and apply them to a design system inside OpenFlowKit.

## Recommended pattern

Keep one stable default theme for everyday work and create variants only when the audience or brand needs are genuinely different. Too many themes usually create inconsistency instead of flexibility.

## Related pages

- [Figma Design Import](/figma-design-import/)
- [Templates & Starter Flows](/templates-assets/)
- [Command Center](/command-center/)
