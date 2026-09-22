---
title: Sequence diagrams
description: The sequence family — participants, messages, activations and fragments, for API calls and time-ordered interactions.
---

Sequence diagrams are ordered by time, not by layout: every line is one message between two
participants, and the vertical position is the line order. Use it for request/response
traces, protocol walks and failure paths.

## Header

```openflow
sequence
Browser -> API : POST /login
API ->> Store : SELECT user
Store -->> API : row
API --> Browser : 200 token
note over Browser, API : retry once on 5xx
```

`sequence` takes no direction. Participants are declared by first mention; `participant` makes
one explicit when you want a type or a stable order, and `alias = Long Name` gives an id you
can mention.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Message | `A -> B : request` | solid, arrow head |
| Reply | `A --> B : response` | dashed |
| Async | `A ->> B : fire` | open head; `-->>` is the dashed form |
| Self call | `A -> A : retry` | draws a loop |
| Participant | `participant DB [db]` | `actor`, `person`, `db`, `queue`, `icon` |
| Alias | `gw = API Gateway` | the label no longer has to slug to the id |
| Activation | `activate A` / `deactivate A` | bars sized between the two |
| Fragment | `loop every 5s { … }`, `alt ok { … } else fail { … }` | also `opt`, `par` (`} and {`), `break` |
| Note | `note over A, B : text` | also `note left of A`, `note right of A` |
| Numbering | `autonumber` | numbered message labels |

Blocks become fragment frames that enclose their messages, and participant lifelines are sized
to the last message that touches them.

## What it does not do

- **No chains or fans.** `A -> B -> C` and `A -> B, C` are rejected with W112; write one
  message per line, because the order is the meaning.
- **No direction.** The family line has no `right`/`down`; time always flows down.
- **No layout hints beyond order.** `rank`, `pin` and `align` are not meaningful here; the
  vertical position is the statement order.
- Lifeline spacing is computed; you cannot drag a participant to a different column and have
  the text still be canonical.

## Where to go next

- [Flowchart diagrams](/diagram-flowchart/) — when layout is free and order is not.
- [State machines](/diagram-state/) — when the subject is one object's states, not messages.
- [OpenFlow DSL](/openflow-dsl/) — the code panel workflow.
