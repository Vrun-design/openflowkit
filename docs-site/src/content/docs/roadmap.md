---
draft: false
title: Roadmap
description: Current product direction for OpenFlowKit, separated clearly from already shipped behavior.
---

This docs site focuses mainly on current shipped behavior, but this page exists to make the near-term direction explicit without pretending those items are already done.

## Shipping now

The current product direction is built around a few clear pillars that already shape the product:

- a real workspace home instead of a forced default draft
- local-first saved documents and editor recovery
- AI, code, and import workflows living alongside the visual editor
- asset libraries for developer, cloud, and icon-heavy diagrams
- design systems, pages, layers, and structured canvas controls

## Recently shipped

These capabilities have been released and are documented in the docs:

- **Workspace Home**: Create, open, import, and organize multiple flows
- **Local-First Storage**: All diagrams saved in browser, survives refresh
- **Flowpilot AI**: Generate diagrams from prompts
- **Mermaid Import**: Import and edit Mermaid diagrams
- **OpenFlow DSL**: Text-based diagram definition language
- **Infrastructure Sync**: Import Terraform, Kubernetes, Docker Compose
- **Smart Layout**: Automatic arrangement of nodes
- **Playback History**: Step through diagram changes
- **Snapshots**: Save and restore named versions
- **Diagram Diff**: Compare current state against snapshots
- **Architecture Linting**: Check diagrams for architectural rules
- **Context Menu**: Right-click actions for nodes, edges, selections
- **Settings Modal**: Configure AI, canvas, and keyboard shortcuts
- **Multiple Diagram Families**: Flowchart, State, Class, ER, GitGraph, Mindmap, Journey, Architecture

## Near-term roadmap

These are the highest-signal improvements currently worth planning around:

- better layers and page workflows so larger diagrams are easier to organize, lock, focus, and navigate
- better code and structured-import diagram quality, especially for application architecture and source-driven drafts
- stronger auto-layout quality for complex technical graphs, including smarter defaults and less cleanup after import
- performance boosts for larger canvases, heavier diagrams, and more demanding editor sessions
- a cleaner asset browsing experience with stronger developer and infrastructure libraries
- continued docs-site refreshes so product surfaces stay aligned with reality

## Likely follow-on improvements

These are important, but they should be treated as direction rather than guarantees:

- richer architecture review and linting workflows
- better import-to-layout pipelines for infra and code analysis
- more polished workspace/home flows for templates, import, and AI-first starts
- more capable export and publishing paths for documentation and reviews

## How to read this page

- Docs pages describe current shipped behavior first.
- This roadmap page names current product priorities and likely next areas of investment.
- If a capability is not described elsewhere in the docs as a current workflow, treat it as planned direction rather than a shipped feature.
