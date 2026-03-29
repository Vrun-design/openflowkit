---
draft: false
title: Studio Overview
description: Understand the OpenFlowKit Studio rail for AI, code, imports, infrastructure sync, and architecture linting.
---

Studio is the right-side workspace for generation, code-backed editing, structured imports, infrastructure parsing, and rule-driven validation. Use it when the canvas alone is not the best tool for the job.

Studio matters because OpenFlowKit is not only a drag-and-drop editor. The product is built around moving between visual editing and structured inputs. Studio is where those structured workflows live.

## Studio tabs in the current product path

| Tab | Purpose |
| --- | --- |
| **Flowpilot** | AI-assisted generation, revision, and guided import flows |
| **Code** | OpenFlow DSL and Mermaid editing against the current canvas |
| **Infra** | Infrastructure Sync for supported infra file inputs |
| **Lint** | Architecture rules and live violation feedback |

## When to open Studio

Open Studio when you want to:

- draft a diagram from a prompt
- paste or edit OpenFlow DSL or Mermaid
- import SQL, OpenAPI, Terraform, or code-oriented inputs
- parse infra files without AI
- define architecture constraints and review violations

If you are already happy with the diagram structure and only need visual cleanup, stay on the canvas and use the [Properties Panel](/properties-panel/) instead.

## Flowpilot tab

Flowpilot is the AI-first area of Studio. Use it when you want:

- a first draft from plain language
- a different structural take on an existing concept
- code-to-architecture generation
- structured imports that benefit from model interpretation

Good Flowpilot sessions are specific. Name the systems, actors, branches, constraints, and intended audience. If you want output that is easy to refine later, ask for explicit structure instead of purely aesthetic phrasing.

## Code tab

The Code tab is where you switch from visual editing to text representations.

Use it when:

- you want to review or edit [OpenFlow DSL](/openflow-dsl/)
- you already have Mermaid and want to apply it to the canvas
- you want to compare an editor-native representation with a portable one
- you want diagram-as-code control before running visual cleanup or auto layout

This tab is best when you want repeatability and precision. It is also the right choice when AI is unnecessary and the diagram is easier to reason about as code.

## Infra tab

The Infra tab exists for deterministic infrastructure parsing. It is the best option when you already have:

- Terraform state
- Kubernetes YAML
- Docker Compose YAML
- other supported infra-oriented inputs

Use this tab when you want a trustworthy structural import instead of a model-generated interpretation. The result still comes back as a regular editable OpenFlowKit diagram.

## Lint tab

The Lint tab turns the diagram into something closer to a governed system model. You can define JSON rules and review violations as errors, warnings, or informational findings.

This is useful when a diagram is doing real architecture work instead of just presentation work. It helps answer questions like:

- should this service be allowed to talk to that datastore?
- did an imported architecture diagram violate an agreed boundary?
- did a large refactor accidentally break a documented rule?

## How Studio fits into the editor

Studio complements, rather than replaces, the canvas:

- use the canvas for spatial editing
- use Studio for generation, import, code, and rule workflows
- switch back to the [Properties Panel](/properties-panel/) when a generated result needs exact tuning
- use the [Command Center](/command-center/) when you want to jump between workflows quickly

## Recommended workflow

For most serious diagrams, a good sequence is:

1. start with AI, code, template, or import
2. inspect the result on the canvas
3. use auto layout, layers, or pages if the structure is right but the organization is not
4. make exact changes in the inspector
5. save a snapshot before another major Studio operation
6. export or share once the structure is stable

## Related pages

- [AI Generation](/ai-generation/)
- [OpenFlow DSL](/openflow-dsl/)
- [Infrastructure Sync](/infra-sync/)
- [Architecture Linting](/architecture-lint/)
- [Choose an Input Mode](/choose-input-mode/)
