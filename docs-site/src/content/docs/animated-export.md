---
title: Animated export
description: Export a page as an animated SVG, GIF, MP4 or WebM — sequenced in the browser, driven by the animate block in the DSL.
---

Every page can leave as a short animation, not just a still. **Export… → Animate this page**
opens the panel: pick a preset and an order, watch the exact result play, scrub it, drag the
step chips to reorder them, then download a file or copy it to the clipboard.

Sequencing, rasterising and encoding all run in your browser. Nothing is rendered on a server.

## Formats

| Format | Built by | Notes |
| --- | --- | --- |
| **Animated SVG** | The SVG exporter plus one `<style>` block of CSS keyframes | The only format that is vector and loops; the download is an `.svg` |
| **GIF** | Frames encoded with `gifenc`, palette drawn from the finished diagram | 256 colours, capped at 20 fps |
| **MP4** | Frames through WebCodecs `VideoEncoder`, muxed with `mediabunny` | Hidden when the browser has no WebCodecs, instead of offered and broken |
| **WebM** | The same path, or `MediaRecorder` when WebCodecs is missing | The fallback records in real time, so the clip takes as long as it plays |

GIF, MP4 and WebM can be copied to the clipboard where the browser allows it; the animated SVG
is download-only. Sizes are 720p, 1080p or 1440p, at 12, 24 or 30 fps, in light or dark.

## Presets

| Preset | What it does |
| --- | --- |
| **Build** (default) | Everything appears in order; solid connectors draw themselves on |
| **Walkthrough** | Spotlights one step at a time, everything else dimmed, the camera glides |
| **Pulse** | Everything shown; connectors carry a travelling light, forever |

## Order: connections, a flow, or your own steps

- **Connections** walks the connector graph: roots first, containers before their children, cycles
  broken by position, unconnected shapes last.
- **A flow** — when the page belongs to a [C4 model](/architecture-c4/) with flows — replays
  that flow's steps, with longer holds for notes.
- **Custom** plays the `animate` block in the diagram source. The step chips in the dialog
  write that block: drag to reorder, drop one chip onto another to merge them, click a chip to
  set its hold. Every edit lands in the code panel, so the chips *are* the DSL, rendered.

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

Omit the block and you get **Connections**. The serializer never invents a block, and moving things on
the canvas never rewrites the text. The block's grammar — presets, durations, `hold`, unknown
reference warnings — is in the [DSL reference](/openflow-dsl-reference/).

## Preview equals output

The preview and every encoded frame come from one timeline: a still at time *t* and the
animation paused at *t* are the same picture, and the headed test suite compares them pixel by
pixel. Scrub for the still; press space to play; `←`/`→` jump whole steps.

## What it cannot do

- **Steps, not keyframes.** Per-property curves, custom camera paths, audio and per-element
  timing do not exist yet; the sequence is the `animate` block.
- **GIF is the compatibility format.** 256 colours, no half-alpha, at most 20 fps.
- **MP4 needs WebCodecs.** Where it is missing the option is hidden; WebM falls back to a
  real-time recorder.
- **Fonts are the SVG's stack.** Video frames use the fonts the machine rendering them has,
  the same as PNG export.
- **One page per export.** Animate one page at a time.

## Where to go next

- [Exporting](/exporting/) — the still formats and scopes.
- [Architecture (C4)](/architecture-c4/) — where flows come from.
- [OpenFlow DSL reference](/openflow-dsl-reference/) — §6.8 of the grammar, in full.
