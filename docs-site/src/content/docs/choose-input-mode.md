---
draft: false
title: Choose an Input Mode
description: Decide when to use templates, AI, OpenFlow DSL, Mermaid, structured imports, or direct canvas editing.
---

OpenFlowKit supports multiple ways to create a diagram. The best choice depends on what source material already exists and how deterministic you need the result to be.

## Quick guide

| If you have... | Start with... |
| --- | --- |
| a common builder workflow you want to adapt quickly | [Templates & Starter Flows](/templates-assets/) |
| a rough idea | [AI Generation](/ai-generation/) |
| a diagram you want to sketch manually | [Canvas Basics](/canvas-basics/) |
| editor-native text you want to control precisely | [OpenFlow DSL](/openflow-dsl/) |
| Mermaid already used elsewhere | [Mermaid Integration](/mermaid-integration/) |
| SQL, OpenAPI, Terraform, or K8s source text | [Import from Structured Data](/import-from-data/) |

## Rules of thumb

- Choose templates when the shape is familiar but the exact labels are not.
- Choose AI for speed and ideation.
- Choose OpenFlow DSL for editor-native precision.
- Choose Mermaid for ecosystem compatibility.
- Choose structured import when a source artifact already exists.
- Choose Infra Sync when you want deterministic, non-AI parsing of supported infra inputs.

## Common mistakes

- Using AI when you already have a precise source artifact.
- Starting from a blank canvas when a starter template is already close to the workflow.
- Using Mermaid as the editing master when fidelity inside OpenFlowKit matters more.
- Redrawing infrastructure manually when the source files already exist.

## Recommended pattern

Start with the most structured truthful input you already have. Move from template or source text into the visual editor, then use AI only when the stronger input does not exist or when you want alternate drafts fast.
