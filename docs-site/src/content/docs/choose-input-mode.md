---
draft: false
title: Choose an Input Mode
description: Decide when to use the canvas, AI, OpenFlow DSL, Mermaid, structured imports, or Infrastructure Sync.
---

OpenFlowKit supports multiple ways to create a diagram. The right choice depends on what you already have and how much control or determinism you need.

## Quick guide

| If you have... | Start with... |
| --- | --- |
| a rough idea | [AI Generation](/ai-generation/) |
| a diagram you want to sketch manually | [Canvas Basics](/canvas-basics/) |
| editor-native text you want to control precisely | [OpenFlow DSL](/openflow-dsl/) |
| Mermaid already used elsewhere | [Mermaid Integration](/mermaid-integration/) |
| SQL, OpenAPI, Terraform, or K8s source text | [Import from Structured Data](/import-from-data/) |
| infra files you want parsed deterministically | [Infrastructure Sync](/infra-sync/) |

## Rules of thumb

- Choose AI for speed and ideation.
- Choose OpenFlow DSL for editor-native precision.
- Choose Mermaid for ecosystem compatibility.
- Choose structured import when a source artifact already exists.
- Choose Infra Sync when you want deterministic, non-AI parsing of supported infra inputs.

## Common mistakes

- Using AI when you already have a precise source artifact.
- Using Mermaid as the editing master when fidelity inside OpenFlowKit matters more.
- Redrawing infrastructure manually when the source files already exist.

## Recommended pattern

Start with the most structured truthful input you already have. Only move to a looser mode such as AI when the stronger input does not exist.
