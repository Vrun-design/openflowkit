---
draft: false
title: Mermaid Integration
description: Import, edit, validate, and export Mermaid while keeping OpenFlowKit as the visual editing workspace.
---

OpenFlowKit includes Mermaid import, editing, and export paths, but Mermaid should be treated as a compatibility workflow rather than the editor's only source of truth.

## What Mermaid support is for

Use Mermaid support when:

- you already have Mermaid diagrams in docs or repos
- you want a Markdown-friendly text format
- another system in your workflow expects Mermaid syntax

## Mermaid in Studio

The Studio code rail has a dedicated Mermaid mode. From there you can:

- view Mermaid generated from the current canvas
- edit Mermaid directly
- apply the parsed graph back into the editor
- review diagnostics when parsing fails

This makes Mermaid useful as a bridge between documentation-centric workflows and a richer visual editor.

## Mermaid export

The export menu can copy Mermaid text for the current graph to the clipboard. That is especially useful when a diagram needs to live in Markdown or Git-based documentation after you finish editing it visually.

## Fidelity expectations

Mermaid round-tripping is useful, but not every OpenFlowKit concept maps perfectly. Be especially careful with:

- highly visual hand-tuned layouts
- provider-specific architecture icon presentation
- family-specific semantics that are richer in the native graph model

If exact recovery matters, export JSON alongside Mermaid.

## Recommended pattern

Use Mermaid as the publishing or portability layer, not always the editing master. If you need both portability and fidelity, keep JSON or OpenFlow DSL as the authoritative version and regenerate Mermaid when needed.

## Related pages

- [Mermaid vs OpenFlow](/mermaid-vs-openflow/)
- [OpenFlow DSL](/openflow-dsl/)
- [Choose an Export Format](/choose-export-format/)
