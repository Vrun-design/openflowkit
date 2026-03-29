---
draft: false
title: Quick Start
description: Create your first OpenFlowKit diagram from builder templates, imports, AI, code, or the canvas.
---

This is the fastest reliable way to get productive if you are building software, documenting systems, or preparing technical diagrams for docs and reviews.

## 1. Start from the home screen

The first screen is the workspace home, not a forced blank diagram. From there you can:

- create a blank flow
- open an existing browser-stored flow
- duplicate a saved flow
- import a JSON diagram document
- jump directly into templates or AI-assisted generation paths

Each flow opens in the editor only after a real document exists.

## 2. Pick the strongest input you already have

OpenFlowKit works best when you start from the most truthful source available, then refine visually.

### Template-first

Use **Browse Templates** when you need a strong developer-oriented starting structure fast. The starter set is strongest for release flows, incident runbooks, cloud diagrams, sequence flows, C4 context, and architecture communication.

### Import or code-first

Use import or the Studio code flows when you already have a technical source artifact:

- Mermaid or OpenFlow DSL for editable diagram-as-code
- SQL or OpenAPI for structured system drafts
- Terraform, source code, or infrastructure text for system and architecture imports
- JSON/OpenFlow when you are restoring a saved graph exactly

### Prompt-to-diagram

Switch the right rail to Studio and open the **Flowpilot** tab. Enter a prompt such as:

```text
Create a SaaS onboarding workflow with signup, email verification,
team invite, workspace creation, billing setup, and first success milestone.
```

Use this when the shape is still fuzzy and you want a first draft quickly. For technical work, prompt generation is usually strongest after you already know the systems involved.

If AI is not configured yet, use the **Add key** action to open the shared AI settings modal, choose your provider, and decide whether the key should persist on this device or only for the current session.

### Blank canvas and assets

Use blank canvas when the structure is already in your head and visual iteration is faster than import. Open **Assets** from the Command Center to add developer logos, cloud-provider libraries, CNCF shapes, and icon packs into the current flow.

## 3. Refine the diagram visually

Once something is on the canvas:

- move nodes into rough position
- use the [Properties Panel](/properties-panel/) for exact edits and architecture metadata
- use [Layers](/command-center/) and page tabs when the diagram needs more structure
- run [Smart Layout](/smart-layout/) when the structure is right but spacing is rough
- use the [Command Center](/command-center/) to search, switch workflows, or insert more assets

## 4. Save recovery points

Before a major AI rewrite or import refresh, review the snapshot/history tooling so you can recover quickly if the new result is worse. See [Playback & History](/playback-history/).

## 5. Share or export the result

Use the export menu when you are ready to move the diagram into docs, design tools, code review threads, or launch assets.

- See [Choose an Export Format](/choose-export-format/)
- See [Exporting](/exporting/)
- See [Collaboration & Sharing](/collaboration-sharing/)
- Use viewer links and embed snippets when you want the diagram to stay live instead of pasting a screenshot
