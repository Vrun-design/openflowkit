---
draft: false
title: Introduction
---

OpenFlowKit is a local-first diagram editor for technical flows, architecture maps, mind maps, journey maps, and code-backed diagram workflows.

The current product combines four working modes:

- A visual canvas for direct editing
- A command-driven asset and template browser
- A studio rail for AI, OpenFlow DSL, and Mermaid editing
- Export and import paths for sharing diagrams outside the app

## What OpenFlowKit is good at

OpenFlowKit works best when you need a diagram that starts rough and becomes structured over time:

- You can begin from a blank canvas, a template, imported JSON, Mermaid text, or an AI prompt.
- You can keep refining the result visually with node handles, layout tools, properties, and edge controls.
- You can switch to code when you want a more repeatable or reviewable representation.

## Diagram families in the app

The editor currently has first-class support for these diagram types:

- `flowchart`
- `stateDiagram`
- `classDiagram`
- `erDiagram`
- `gitGraph`
- `mindmap`
- `journey`
- `architecture`

You will also see reusable node families for general-purpose flows, architecture icon nodes, annotations, sections, images, and wireframe-style surfaces.

## Core product concepts

### Local-first by default

Regular editing state is stored in the browser. You do not need an account to create or edit diagrams.

### Bring your own model access

AI generation uses the provider and model you configure in Settings. API keys stay in local browser storage.

### Visual plus code workflow

The Studio panel lets you work in:

- **FlowPilot** for AI-driven edits
- **OpenFlow DSL** for OpenFlowKit-native code
- **Mermaid** for Mermaid-compatible text editing

### Export beyond the canvas

You can export or copy diagrams as:

- PNG
- JPG
- JSON document
- OpenFlow DSL
- Mermaid
- PlantUML
- Figma-friendly SVG payload

Animated playback export exists in the codebase, but it is currently gated behind a rollout flag and should be treated as optional rather than universally available.

## What to read next

- Start with [Quick Start](/quick-start/)
- Learn the editor model in [Canvas Basics](/canvas-basics/)
- Review data and syntax in [OpenFlow DSL](/openflow-dsl/)
- See automation workflows in [AI Generation](/ai-generation/)
