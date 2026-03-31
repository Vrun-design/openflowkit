---
draft: false
title: Choose an Export Format
description: Pick the right OpenFlowKit export format for editing, docs, collaboration, embeds, or design-tool handoff.
---

OpenFlowKit supports both visual exports and editable handoff formats. The right format depends on what happens next.

## Quick guide

| Need | Best format |
| --- | --- |
| editable archival backup | JSON |
| editor-native text | OpenFlow DSL |
| Markdown or repo-friendly text | Mermaid |
| docs, slides, or tickets | PNG, JPG, or SVG |
| design-tool handoff | Figma |
| short playback artifact | cinematic video |
| live viewer or room access | Share / Embed |

## Rules of thumb

- Use JSON when fidelity matters most.
- Use OpenFlow DSL when OpenFlowKit remains the editing home.
- Use Mermaid when another docs or repo workflow expects Mermaid.
- Use SVG when you need scalable vector output.
- Use PNG or JPG for lightweight visual sharing.
- Use share/embed when the diagram should remain interactive.

## Default recommendation

If you want a safe pattern, keep:

- JSON as the editable master
- a visual export for presentation
- Mermaid or DSL only when another text-based workflow needs it
