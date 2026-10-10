---
title: Map mode and repo maps
description: Browse an architecture model, or a public GitHub repository, as boxes that open in place — every arrow backed by the file and line it came from.
---

Map is a second way to look at a document. Canvas is the drawing you edit; Map draws the
document's architecture model as nested boxes you open and close in place. Nothing you do while
browsing a map changes the document or adds an undo step.

## Canvas | Map

The **Canvas | Map** switch sits in the document bar, right after the title. Press `M` to flip
between them; a reload keeps your last choice. Leaving Map lands back on Canvas with the page,
the camera and the selection you had.

Map is built from an architecture model. On a document without one, Map shows a start screen:
**Start an architecture model**, **Connect agent**, or map a GitHub repo (below). Your drawing is
not touched.

## Reading a map

| Do | What happens |
| --- | --- |
| Click a box | Opens it in place (or shuts it); the box and the boxes it talks to stay bright, the rest dims |
| Click an arrow | Focuses the arrow and its two ends, and lists what is behind it |
| Arrow keys | Walk between boxes; `↓` enters an open box, `↑` goes back out |
| `Enter` | Opens the selected box |
| `Esc` | Closes the box around the selection and selects it; with nothing left to close, clears the selection |
| `⌘F` | Find in map: opens the boxes around a match and selects it; `Esc` puts things back |
| Double-click a box | Opens its card in the model panel with the name ready to type |

The depth control in the Map toolbar sets how far the boxes open: **Top level** (only the
top-level boxes, shut), **One level in** (the top-level boxes open) or **All levels** (as deep as
the screen allows). A click on a single box still opens or shuts just that one.

On a C4 model, an arrow lists the model relations it stands for. On a repo map, an arrow is
evidence: it lists each import or call behind it as `file:line`, each a link to that line on
GitHub. **Connections** in the toolbar switches each kind of arrow (imports, calls, uses, builds)
on and off.

## Editing from a map

Map does not move boxes. Edits go to the model: double-click a box, use its right-click menu, or
remove it with `⌘⇧⌫`. Typing, a drag or Delete on a box explains this once per visit instead of
doing something you did not mean.

**Edit as drawing** (`⇧M`) copies the map as drawn now to a new Canvas page you can rearrange and
draw on, as one undo step. The model is not changed.

## Repo maps

Paste a GitHub address into **Map a GitHub repo** (Map's start screen, or the empty canvas), or
open `#/map/github/<owner>/<repo>` (add `/tree/<branch>` for a branch). These all work:

- `owner/repo`
- `github.com/owner/repo`, with or without `https://` and `www.`
- `https://github.com/owner/repo/tree/<branch>` or a `/blob/<branch>/<file>` link (the whole repo
  is read at that branch)
- `…/repo.git` and `git@github.com:owner/repo.git`

The browser reads the repository itself — the file list from `api.github.com`, the files from
`raw.githubusercontent.com` — and draws it. Nothing goes through an OpenFlowKit server. The map's
parts come from what discovery finds deployable: Dockerfiles, compose files, Kubernetes and
Terraform files, package manifests and Wrangler (Cloudflare Workers) configs, with the imports
between source files as arrows. A repo built from those maps best.

Big repos are sampled to stay quick: no file over 256 KB, at most 8 MB in all. The chip on the
map says how much was read ("Read N of M files"). A repo map document is read-only; use **Edit
as drawing** to get an editable page. Opening the same address again reopens the same document.

### Rate limits and tokens

Without a token GitHub allows 60 API reads an hour per network. When that runs out the page asks
for an optional GitHub token (5,000 reads an hour). The token is kept in this tab's
sessionStorage and sent to `api.github.com` only, never to the raw file downloads — which also
means private repositories cannot be read here.

### From a checkout: the CLI

For a private repo, or no rate limit, map a local checkout with the CLI in the MCP server package:

```text
npx -p @vrun-design/openflowkit-mcp openflowkit map . [--depth overview|detailed|everything] [--html map.html]
```

It prints the parts, files, lines and imports; `--html` also writes the interactive map as one
offline page. In a git checkout only tracked files are mapped.

## Repo → architecture diagram

`#/from/github/<owner>/<repo>` (add `/tree/<branch>` for a branch) opens the repository as a C4
architecture model in the editor instead of a map, built by the same discovery. Its evidence
links are pinned to the commit that was read, so they keep pointing at the right lines after the
repo moves on. The CLI equivalent is `openflowkit discover .`.

## What it cannot do

- **No layout of your own in Map.** Boxes are laid out for you; **Edit as drawing** is the way to
  arrange them by hand.
- **GitHub only, public only** in the browser. GitLab is not read; use the CLI on a checkout.
- **A slashed branch in a pasted URL** reads as its first segment (`release/2.0` → `release`);
  write it `release%2F2.0`.
- **Static reading.** Arrows come from imports and config files, not from running code.

## Where to go next

- [Architecture (C4)](/architecture-c4/) — the model Map draws.
- [Architecture workspace](/architecture-workspace/) — discovery and drift against a repo.
- [MCP Server](/mcp-server/) — the package the CLI ships in.
