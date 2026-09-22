---
title: Git graphs
description: The gitgraph family — branches as lanes, commits as columns, tags, merges and cherry-picks in OpenFlow DSL.
---

Git graphs show branch topology: lanes are branches, columns are commits, and the lines
between them are history. Use it for release diagrams and explaining a branching strategy.

## Header

```openflow
gitgraph
commit Initial [tag: v1.0]
branch feature
commit "Add API"
commit "Fix typo" [highlight]
checkout main
commit "Hotfix" [revert]
merge feature [tag: v1.1]
```

`gitgraph` defaults to `right`, so history reads left to right. The family is imperative:
canonical form is the line order.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Commit | `commit "Add API"` | quote labels with spaces |
| Commit tag | `commit Initial [tag: v1.0]` | `highlight` and `revert` are flags |
| Branch | `branch feature` | creates **and** switches to the branch |
| Switch | `checkout main` | `switch` is an alias; moves without committing |
| Merge | `merge feature [tag: v1.1, label: …]` | draws a curve from the branch tip |
| Cherry-pick | `cherry-pick initial` | by commit slug; dashed curve from that commit |

`main` exists implicitly. An unknown branch or commit is warning W150 in the code panel.

## What it does not do

- **No dates or authors.** A commit is a label; there is no commit metadata.
- **No `git log` import.** The DSL is the source; nothing reads a repository.
- **Lanes are assigned by branch order.** You cannot pin a branch to a lane.
- Tags render beside the commit; there is no separate tag row or annotated-tag detail.

## Where to go next

- [Flowchart diagrams](/diagram-flowchart/) — when the graph is about process, not history.
- [OpenFlow DSL](/openflow-dsl/) — the code panel workflow.
