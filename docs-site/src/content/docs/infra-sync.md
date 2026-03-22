---
title: Infrastructure Sync (Living Diagrams)
description: Parse Terraform state, Kubernetes manifests, and Docker Compose files directly into diagrams without depending on an AI provider.
---

Infrastructure Sync converts real infrastructure files into OpenFlow diagrams deterministically. It works offline for supported inputs and produces diagrams that stay close to your actual infrastructure sources.

## Supported formats

- **Terraform State** (`.tfstate` JSON)
- **Kubernetes YAML**
- **Docker Compose YAML**
- **Terraform HCL** through the AI-assisted path when needed

## When to use it

Use Infrastructure Sync when:

- you already have real infrastructure files
- you want deterministic parsing
- you need an offline-friendly import path
- you want an editable starting point for architecture review

## Why it is different from AI import

AI import is useful when the model needs to interpret messy or conceptual input. Infrastructure Sync is for cases where the source artifact already contains the structure and you want OpenFlowKit to parse it rather than reinterpret it.

That distinction matters for trust. If the goal is to stay close to the underlying infra source, deterministic parsing is usually the better first move.

## How to use it

1. Open Studio.
2. Switch to the **Infra** tab.
3. Select the matching format.
4. Paste or drop the file contents.
5. Generate the diagram.
6. Review the summary.
7. Apply it to the canvas.

## After import

The result is still an editable OpenFlowKit diagram. After applying it to the canvas, you can:

- annotate it
- regroup it
- run layout
- export it
- compare it against later snapshots
- apply lint rules for architecture review

## Best use cases

- cloud topology reviews
- current-state architecture documentation
- infra change communication
- turning operational source files into something easier to discuss visually

## Related pages

- [Import from Structured Data](/import-from-data/)
- [Architecture Linting](/architecture-lint/)
- [Diagram Diff & Compare](/diagram-diff/)
