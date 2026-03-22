---
draft: false
title: AI Generation
description: Generate and refine diagrams in Studio with FlowPilot, BYOK providers, code-to-architecture, and structured imports.
---

OpenFlowKit includes AI-assisted diagram generation through the Studio rail. FlowPilot is best used for first drafts, structural revisions, and code-backed architecture exploration.

AI generation is most valuable when you need to go from ambiguity to structure quickly. It is not the only way to create diagrams in OpenFlowKit, and it is usually not the final step. Think of it as a draft accelerator.

## Where AI lives in the product

AI is available in the Studio panel under **FlowPilot** and through the **Open FlowPilot** command in the Command Center. Common sub-flows include:

| Mode | What it does |
| --- | --- |
| **FlowPilot** | Chat-based generation and iteration |
| **From Code** | Paste source code and generate an architecture diagram |
| **Import** | Paste SQL, Terraform, K8s, or OpenAPI and generate a draft |

Typical generation flow:

1. capture your prompt and optional image
2. send it through the configured provider
3. receive a structured graph representation
4. compose nodes and edges
5. apply layout
6. replace or update the current graph

## Provider model

The app supports multiple BYOK providers, including:

- Gemini
- OpenAI
- Claude
- Groq
- NVIDIA
- Cerebras
- Mistral
- OpenRouter
- Custom OpenAI-compatible endpoint

This matters because you are not locked to one hosted AI vendor or one billing model.

## When AI is the right tool

Use AI when:

- you are starting from a plain-language idea
- you want a fast first-pass architecture or workflow draft
- you want to revise an existing diagram conceptually rather than move boxes one by one
- you have source code and want a generated architecture view

Avoid AI when:

- you already have a precise text format such as Mermaid or OpenFlow DSL
- you need deterministic output from infrastructure files
- the diagram is small enough that manual editing is faster

In those cases, prefer [OpenFlow DSL](/openflow-dsl/), [Mermaid Integration](/mermaid-integration/), or [Infrastructure Sync](/infra-sync/).

## How to get better results

Strong prompts usually include:

- the intended audience
- the systems or actors involved
- important branches or failure paths
- the preferred diagram direction
- the level of detail you want

Weak prompts ask for “a diagram” without constraints. Strong prompts explain the system.

## Recommended workflow

1. Generate a first draft with FlowPilot.
2. Inspect the structure on the canvas.
3. Use the [Properties Panel](/properties-panel/) to normalize labels, color, and routing.
4. Run [Smart Layout](/smart-layout/) if the structure is right but spacing is poor.
5. Save a snapshot before another major rewrite.

## Practical caution

AI output should be treated as a draft, not a certified system model. For documentation, architecture review, or infra communication, you should still check naming, boundaries, and missing branches before exporting or sharing.

## Related pages

- [Ask FlowPilot](/ask-flowpilot/)
- [Studio Overview](/studio-overview/)
- [Choose an Input Mode](/choose-input-mode/)
- [Prompting AI Agents](/prompting-agents/)
