---
title: Architecture workspace
description: Keep the DSL, layout overrides and ADRs in a folder on disk, and check the model against the repository with MCP discovery and drift.
---

Two features make an architecture model live outside the app: a folder on disk that holds the
source, and MCP tools that read the repository the model describes.

## The workspace folder

Open a folder from the canvas menu (**Open workspace folder…**). The folder layout is fixed:

| Path | What it holds |
| --- | --- |
| `architecture.ofk` | the DSL source — the model and its views |
| `views/*.snap` | layout overrides: element id → position, per view |
| `adr/*.md` | architecture decision records, linked from elements |

The folder is read when you open it and written when you edit. Snaps are applied over the
computed layout, so a hand-placed element keeps its position across regenerations.

The picker uses the File System Access API, which currently means Chrome and Edge; on other
browsers the menu item is not offered at all rather than failing after the click. There is no
git client inside the app: the folder is plain files, and committing them is your git.

## Discovery from the repository

The MCP server (see [MCP Server](/mcp-server/)) carries three architecture tools:

- **`discover_architecture`** — scans a repository and returns the elements it found.
- **`drift_report`** — compares a model against the repository and lists what the model has
  that the code does not, and the other way round. Matching is by element name and
  technology only; it cannot see intent, renames or moved code.
- **`explain_element`** — returns what the model says about one element, plus the ADR
  markdown files its `link:` attributes point at.

Discovery is deterministic and local: same repository, same result. Nothing leaves the
machine.

## What it cannot do

- **No git operations.** Read and write files; branch, commit and review are your tools.
- **No watcher.** Re-open the folder (or re-run discovery) to pick up changes made outside
  the app.
- **Drift is name-and-tech matching.** A renamed service looks like a deletion plus an
  addition.
- **Snaps cover positions only.** Sizes, colours and notes are not in a `.snap` file.

## Where to go next

- [Architecture (C4)](/architecture-c4/) — the model and view syntax.
- [MCP Server](/mcp-server/) — the tool surface, including these three.
