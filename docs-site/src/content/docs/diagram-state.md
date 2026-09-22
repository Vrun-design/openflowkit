---
title: State machines
description: The state family — states, transitions, composite states and fork/join/choice pseudo-states in OpenFlow DSL.
---

A state diagram describes one thing's lifecycle: where it can be, and what moves it. Use it
for order state machines, retry logic, session lifecycles and protocol states.

## Header

```openflow
state
[*] -> Idle
Idle -> Running : start
state Running {
  Queued -> Working
  Working -> Queued : retry
}
Running -> [*] : done
```

`state` defaults to `down`. `[*]` is the start marker before an arrow and the final marker
after one — the two are distinct nodes, even when they share a name.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Transition | `Idle -> Running : start` | label after `:`; attributes on the edge |
| Start | `[*] -> Idle` | the token is never a node name |
| End | `Running -> [*]` | a distinct final node |
| Composite | `state Running { … }` | the block holds the inner states and transitions |
| Concurrent regions | `--` on its own line inside a composite | splits the region |
| Fork / join | `F [fork]`, `J [join]` | drawn as filled bars, no label |
| Choice | `C [choice]` | drawn as a diamond |

Pseudo-states are ordinary nodes with a shape word, so they keep an addressable id. Transitions
between them are ordinary edges.

## What it does not do

- **No history or entry/exit actions.** There is no `[H]` pseudo-state and no action syntax;
  the label carries whatever prose you need.
- **Fork and join are visual.** The compiler draws the bar; it does not verify that branches
  balance.
- **No self-edge labels on a bar.** A fork or join draws no text — the id stays addressable in
  the model, but nothing renders inside the bar.
- Direction is the family line's; there is no per-state layout control.

## Where to go next

- [Sequence diagrams](/diagram-sequence/) — when the subject is messages, not states.
- [Flowchart diagrams](/diagram-flowchart/) — when there is no single subject.
- [OpenFlow DSL](/openflow-dsl/) — the code panel workflow.
