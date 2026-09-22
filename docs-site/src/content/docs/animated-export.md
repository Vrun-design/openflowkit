---
draft: false
title: Animated Export
description: Export any diagram as an animated SVG, GIF, MP4 or WebM — built in your browser, driven by the animate block in the DSL.
---

Every diagram can leave as a short animation, not just a still. Open **Export…** (the canvas
menu) and switch to **Animation**: pick a preset, watch the exact result play in the dialog,
scrub it, drag the step chips to reorder them, then download a file.

Nothing is rendered on a server. Sequencing, rasterising and encoding all run in your browser,
so a 1080p 15-second MP4 costs about ten seconds of local CPU and nothing else.

## Formats and where they play

| Format | Plays inline in | Does not | Size, 10 s / 8 nodes | How we make it |
| --- | --- | --- | --- | --- |
| **Animated SVG** (CSS keyframes) | GitHub README (`<img>` runs CSS/SMIL, no JS), docs sites, Notion, web pages | Slack, X/LinkedIn, Google Docs, most chat | ~40–80 KB, vector, loops | string from the SVG exporter + one `<style>` block |
| **GIF** | everywhere (Slack, GitHub, Notion, X, email) | — (256 colours, no half-alpha, ≤ ~20 fps sane) | 3–15 MB at 800 px | frames → `gifenc` (median-cut quantiser) |
| **MP4 / H.264** | Slack, X, LinkedIn, YouTube, Keynote/PowerPoint, GitHub issues/PRs (as attachment) | GitHub README inline | 1–3 MB at 1080p | frames → WebCodecs `VideoEncoder` → `mediabunny` mux |
| **WebM / VP9** | Chrome, Firefox, Slack | Safari-only contexts, Office | ~1 MB | same path, or `MediaRecorder` fallback |

MP4 needs WebCodecs (Chrome/Edge 94+, Firefox 130+ desktop, Safari 26+). Where it is missing
the MP4 option is hidden rather than offered and broken; WebM then comes from `MediaRecorder`,
which records in real time, so a ten-second clip takes ten seconds. GIF and animated SVG always
work.

## Presets

| Preset | What it does | Good for |
| --- | --- | --- |
| **Build** (default) | Everything appears in order; solid connectors draw themselves on | a first look at a diagram, a README hero |
| **Walkthrough** | Spotlights one step at a time, everything else dimmed, the camera glides | replaying a flow, a code review |
| **Pulse** | Everything shown; connectors carry a travelling light, forever | the looping "system is alive" GIF |

## Order: Auto, a flow, or your own steps

- **Auto** walks the connector graph: roots first, containers before their children, cycles
  broken by position, unconnected shapes last. Zero clicks and it looks right for a plain
  flowchart.
- **A flow** (if the page belongs to a C4 model with flows) replays that flow's steps with
  longer holds for notes.
- **From code** plays the `animate` block in the diagram source. The step chips in the dialog
  write that block for you: drag to reorder, drop one chip onto another to merge them, click a
  chip to set its hold. Every edit lands in the code panel, so the chips *are* the DSL,
  rendered.

```openflow
flowchart
order = Order service [rounded]
db    = Database [cylinder]
queue = Queue [hexagon]

animate build 10s loop {
  step order, db       // reveal these nodes together
  step order -> queue : POST   // a step about the edge; both endpoints show too
  step queue hold 2s   // hold longer than the default beat
}
```

Omit the block and you get **Auto**. The serializer never invents a block, and moving things on
the canvas never rewrites the text.

## What you preview is what you get

The preview and every downloaded frame come from one timeline, so a still at time *t* and the
animated file paused at *t* are the same picture — the headed test suite compares them pixel by
pixel. Scrubbing shows the still; pressing space plays the animation from the playhead;
`←`/`→` jump whole steps.

## Notes and limits

- Fonts in video frames are the SVG's system stack: what your machine has, the same as PNG
  export.
- GIF is quantised to 256 colours and capped at 20 fps; it is the "paste anywhere" format, not
  the pretty one.
- Steps, not keyframes. Per-property curves and camera paths are a later phase; if you need
  them, edit the exported SVG's `<style>` block.
