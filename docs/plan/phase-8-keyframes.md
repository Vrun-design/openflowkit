# Phase 8 — keyframe motion (after phase 7 ships and people use it)

Owner decision, 2026-09-22: phase 7 is steps (reveal · walkthrough · pulse), because steps
are text. Phase 8 is the Excalimate-class editor: per-object keyframes, camera paths, a
real timeline, presenting on the live canvas. Not started until phase 7 has users asking.
Still zero infra: it is the same in-browser pipeline with a richer timeline.

Read first: `phase-7-motion.md` (the timeline, `frameAt`, the encoders — all reused).

## What it adds on top of phase 7

- **Tracks**: per object (node, connector, group, camera) a list of `{ t, props }` keyframes
  over `x y scale rotation opacity drawProgress`; easing per keyframe (linear · ease · spring).
  `frameAt` interpolates tracks; steps compile to tracks, so phase-7 files play unchanged.
- **Timeline panel** (bottom dock, like the chart data panel docks right): ruler, one lane
  per animated object, playhead, drag keyframes, ⌘D duplicate, snap to steps. Selecting on
  the canvas selects the lane. Scrub = `frameAt`, exact.
- **Camera track**: pan/zoom keyframes; "frame selection" adds one at the playhead.
- **Present**: play button in the document bar plays the timeline on the live canvas (Pixi:
  the renderer takes a `FrameState`; the storyboard veil from `PixiFocusOverlay` is the
  walkthrough look). Fullscreen, ←/→ steps, Esc.
- **Text**: `keyframes` block per object in the DSL — verbose by design; the panel is the
  primary editor, text keeps agent parity and round-trip laws.
- **Agent**: `animate_diagram` MCP tool: "walk through the checkout flow, 12 s, dark" → a
  timeline the human can then tweak. That is the Excalimate MCP pitch, done inside the canvas.

## Slices (sketch — spec properly when phase 7 is in)

8.1 tracks + interpolation (domain, pure) · 8.2 steps → tracks compile + DSL block ·
8.3 renderer takes `FrameState` (Pixi + SVG) · 8.4 timeline panel · 8.5 camera track ·
8.6 Present mode · 8.7 MCP `animate_diagram` · 8.8 audit.

## Ceilings to accept

Keyframes do not merge across text edits (a renamed node keeps its track by id, a deleted
one drops it). No audio. No video-in-video. Panel is desktop-only.
