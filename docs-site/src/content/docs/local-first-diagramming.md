---
draft: false
title: Local-First Diagramming
description: Understand what local-first means in OpenFlowKit and how it affects privacy, sharing, and day-to-day diagram work.
---

Local-first means your diagram work starts in the browser, not on a required hosted backend. In OpenFlowKit, that changes how you think about privacy, portability, and failure modes.

## What local-first means here

In practical terms:

- your diagram state lives in the browser by default
- refreshes and browser restarts should restore your saved documents instead of inventing a fake default file
- AI usage can follow a BYOK model instead of mandatory platform credits
- collaboration can fall back to local-only behavior instead of blocking all work
- export is explicit, so you decide when a diagram leaves the current device

OpenFlowKit now treats the browser database as the durable source of truth for saved document state. The live editor is rebuilt from that local data after reload rather than assuming the in-memory canvas is still available.

## Why it matters

Local-first workflows are useful when:

- you are working with internal architecture diagrams
- you do not want to depend on account creation for first use
- you need a browser-native tool that still works well as a solo editor
- you want control over when artifacts become shared assets

## What stays on the current device

By default, OpenFlowKit keeps these things in browser-local storage on the current device:

- saved diagrams and tabs
- workspace home state and document listings
- document-oriented chat history for Flowpilot sessions
- persistent AI settings when you choose persistent storage
- local workspace preferences

Session-only secrets can still be kept for just the current browser session when you prefer that behavior.

## What it does not mean

Local-first does not mean isolated forever. OpenFlowKit still supports:

- exports for images, JSON, text formats, and design-tool handoff
- collaboration rooms and share links
- embed flows for docs and GitHub-style usage

It means those are explicit actions instead of prerequisites.

If no document exists, the app stays on the workspace home instead of silently recreating an `Untitled` flow.

## Recommended next reads

- [Introduction](/introduction/)
- [Collaboration & Sharing](/collaboration-sharing/)
- [Choose an Export Format](/choose-export-format/)
