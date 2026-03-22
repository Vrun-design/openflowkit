---
draft: false
title: Architecture Linting
description: Define JSON-based architecture rules in Studio and highlight diagram violations in real time.
---

Architecture Linting lets you define rules that catch violations directly on the canvas. It is the closest thing OpenFlowKit has to diagram linting for system design.

## Where it lives

Open Studio and switch to the **Lint** tab.

## What it does

The lint panel lets you:

- paste or edit JSON-based rules
- save and clear rule sets
- see parse errors in the rule file
- review live violations with error, warning, or info severity

Violations are surfaced while you work, so the diagram becomes something you can validate, not just draw.

## Why this matters

Many diagrams are only descriptive. Architecture linting makes them evaluative as well. That is useful when the diagram represents real constraints, such as:

- a frontend should not talk directly to a database
- only certain services should cross a trust boundary
- an imported topology should still conform to platform rules

## Practical workflow

1. Draft or import the diagram.
2. Open Studio → **Lint**.
3. Add or paste the rule JSON.
4. Save rules and review violations.
5. Fix the diagram and re-check until the rules pass.

## Best use cases

- architecture review
- governance for platform diagrams
- validating diagrams created from infrastructure sync
- checking that large AI-assisted revisions did not break intended boundaries

## Related pages

- [Studio Overview](/studio-overview/)
- [Infrastructure Sync](/infra-sync/)
- [Diagram Diff & Compare](/diagram-diff/)
