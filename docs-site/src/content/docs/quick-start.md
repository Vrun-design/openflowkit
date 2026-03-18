---
draft: false
title: Quick Start
---

This walkthrough is the fastest reliable way to get productive in the current app.

## 1. Open or create a flow

From the home screen you can:

- create a new flow
- open an existing browser-stored flow
- duplicate a saved flow
- import a JSON diagram document

Each flow opens in its own tab inside the editor.

## 2. Pick a starting point

You have five realistic entry paths:

### Blank canvas

Use this when you already know the structure and want to sketch directly.

### Template

Open the Command Center with `Cmd/Ctrl + K`, then choose **Start from Template**. Templates cover flowcharts, cloud diagrams, mind maps, journeys, and wireframes.

### Assets

Open **Assets** from the Command Center to add notes, text, sections, wireframes, images, or provider-backed icons.

### AI

Switch the right rail to Studio and open the **AI** tab. Enter a prompt such as:

```text
Create a SaaS onboarding workflow with signup, email verification,
workspace setup, billing check, and success/failure branches.
```

### Code

Open Studio and switch to **OpenFlow DSL** or **Mermaid** if you prefer to start from text.

## 3. Edit on the canvas

Once you have content:

- drag nodes to reposition them
- click a node or edge to open the Properties panel
- drag from a handle to create a connection
- use `Shift + Click` or `Shift + Drag` for multi-select
- use `Cmd/Ctrl + D` to duplicate
- use `Delete` or `Backspace` to remove the current selection

## 4. Clean up the structure

For fast organization:

1. Open `Cmd/Ctrl + K`
2. Choose **Auto Layout**
3. Pick direction, algorithm, and spacing

The app uses ELK-based layout strategies and passes the active diagram type into layout decisions where relevant.

## 5. Save a recovery point

Open the history panel and create a manual snapshot before major edits. OpenFlowKit also keeps automatic snapshots while you work.

## 6. Export or share

Use the top-right export menu for:

- PNG
- JPG
- JSON
- OpenFlow DSL
- Mermaid
- PlantUML
- Figma payload copy

Use the Share control if you want a lightweight collaboration room link.

## Recommended next steps

- Read [Canvas Basics](/canvas-basics/) for navigation and selection details
- Read [Properties Panel](/properties-panel/) for editing controls
- Read [AI Generation](/ai-generation/) if you plan to use FlowPilot or BYOK models
