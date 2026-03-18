---
draft: false
title: Playback & History
---

OpenFlowKit has two related but distinct recovery systems:

- regular undo/redo history
- snapshot-based history and playback state stored on tabs/documents

## Undo and redo

The editor keeps standard editing history for canvas operations. Use:

- `Cmd/Ctrl + Z` to undo
- `Cmd/Ctrl + Shift + Z` to redo

This is your fastest local recovery path during active editing.

## Snapshots

The history panel exposes:

- manual snapshots you name yourself
- automatic snapshots queued while you work

Use snapshots when you are about to:

- run a major AI rewrite
- switch diagram family direction
- do a broad text apply from Studio
- restructure a large architecture map

## Playback model

The data model already supports playback scenes, timeline steps, selected scenes, and default step durations.

In practice this means OpenFlowKit is structured for diagram playback authoring, even though some playback-studio surfaces remain behind rollout flags.

## Animated export status

Animated export code exists for:

- GIF
- browser-recorded video

However, these options are only shown when `animatedExportV1` is enabled. Do not assume every deployment exposes them.

## Recommended workflow

For stable edits:

1. save a manual snapshot
2. perform your risky change
3. compare visually
4. restore if needed

This is safer than relying only on a long undo chain.

### Version Checkpoints
Every time you perform a significant action (adding a node, changing a color, auto-layout), a "snapshot" is saved.
*   **Undo/Redo**: Uses this same system to jump back and forth (`Cmd+Z`).

## Playback Mode

Press the **Play** button in the History panel to watch a "movie" of your diagram being built from start to finish.
*   **Speed Control**: Adjust playback speed (1x, 2x, 4x).
*   **Scrubbing**: Drag the slider to specific points in time.
*   **Restore**: Found an older version you like better? Click "Restore" to revert the canvas to that state perfectly.
