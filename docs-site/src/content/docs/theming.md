---
title: Theming
description: Light and dark themes, the four diagram palettes, and how a document's appearance travels with the text.
---

There are two layers of colour in OpenFlowKit: the **app's theme**, which is a preference, and
the **diagram palette**, which belongs to a document.

## The app theme

Appearance is Light, Dark or System in [Settings](/settings/). The chrome and the canvas
default background follow it; the default canvas colour is `#f7f7f5` in light and `#191b19` in
dark, and the camera controls override it per browser.

Exports have their own theme control, independent of the app theme: **Light**, **Dark** and
**Print**. Print forces the white page background used for paper; light and dark match the
canvas's colour scheme.

## Diagram palettes

| Palette | Character |
| --- | --- |
| `pastel` | The default soft fills |
| `paper` | Muted, print-leaning fills |
| `builder` | Stronger, higher-contrast fills |
| `mono` | Greyscale, for monochrome documents |

The palette is a property of the compiled content, not just the frame: nodes and connectors
carry their appearance, so a palette survives export, copy/paste between documents, and
round-trips through JSON.

Set the default in the [code panel's palette picker](/settings/), or per document in the text:

```openflow
%% ofk 1
flowchart
appearance: mono
Client -> API : request
```

An authored `appearance:` line wins over the panel preference.

## Colour in the text

Nodes take a palette word or a hex value as an attribute: `Cache [cylinder, blue]`,
`Queue [orange]`, `Note [#f43f5e]`. `fill` chooses the mode (`pastel` default, `bold`,
`outline`). Hex values are kept verbatim in canonical output (lowercased), so an exported
document never loses a colour to the palette.

## What it cannot do

- **No design-system import or export.** The four palettes and the attribute colours are the
  system; there is no theme file to load.
- **No per-page theme.** The app theme is one preference, and a document's palette is one
  directive.
- **No dark/light pair authored by hand.** The exporter derives the dark rendering; you cannot
  write two colour sets in one document.
- **No Figma or CSS variables import.** Colours arrive as attributes or through the palette.

## Where to go next

- [Settings](/settings/) — where appearance and the palette default live.
- [Properties panel](/properties-panel/) — per-shape colour overrides.
- [Exporting](/exporting/) — the light/dark/print choice per export.
