---
draft: false
title: Local-First Diagramming
description: Understand what local-first means in OpenFlowKit and how it affects privacy, sharing, and day-to-day diagram work.
---

Local-first means your diagram work starts in the browser, not on a required hosted backend. In OpenFlowKit, that changes how you think about privacy, portability, and failure modes.

## What local-first means here

In practical terms:

- your diagram state lives in the browser by default
- AI usage can follow a BYOK model instead of mandatory platform credits
- collaboration can fall back to local-only behavior instead of blocking all work
- export is explicit, so you decide when a diagram leaves the current device

## Why it matters

Local-first workflows are useful when:

- you are working with internal architecture diagrams
- you do not want to depend on account creation for first use
- you need a browser-native tool that still works well as a solo editor
- you want control over when artifacts become shared assets

## What it does not mean

Local-first does not mean isolated forever. OpenFlowKit still supports:

- exports for images, JSON, text formats, and design-tool handoff
- collaboration rooms and share links
- embed flows for docs and GitHub-style usage

It means those are explicit actions instead of prerequisites.

## Recommended next reads

- [Introduction](/introduction/)
- [Collaboration & Sharing](/collaboration-sharing/)
- [Choose an Export Format](/choose-export-format/)
