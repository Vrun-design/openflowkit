---
title: Charts
description: The chart family — bar, line, area, scatter, pie, donut, radar, heatmap, table and quadrant charts from data lines.
---

Charts are the one family where the text is data, not structure. One chart per diagram, one
line per series, and the data panel writes the same text back when you edit a bar.

## Header

```openflow
chart bar
title: Monthly revenue
Revenue: Jan 12, Feb 19, Mar 9, Apr 22
Costs: Jan 8, Feb 9, Mar 7, Apr 11
```

The family line carries the kind: `bar`, `line`, `area`, `scatter`, `pie`, `donut`, `radar`,
`heatmap`, `table` or `quadrant`. An unknown kind warns W131 and falls back to `bar`. In a
series line, categories with spaces are quoted, and the first series defines the axis order.

## Quadrant charts

```openflow
chart quadrant
x: Low effort, High effort
y: Low impact, High impact
quadrants: Quick wins, Big bets, Deprioritise, Time sinks
Ship faster [0.8, 0.9]
Fix onboarding [0.7, 0.4]
Automate billing [0.35, 0.75]
Rewrite docs [0.3, 0.25]
```

Points are `Label [x, y]` with both axes in `0`–`1`. `x:` and `y:` name each axis's low and
high end; `quadrants:` names the four regions. Leave any of them out for the defaults.

## Statements

| Statement | Example | Notes |
| --- | --- | --- |
| Kind | `chart line` | ten kinds; `bar` when omitted |
| Title | `title: Monthly revenue` | the chart card's title |
| Series | `Revenue: Jan 12, Feb 19` | `Name: Category value, …` |
| Axis labels | `x: Low effort, High effort` | quadrant only; `y:` likewise, low end first |
| Regions | `quadrants: Quick wins, Big bets, Deprioritise, Time sinks` | quadrant only, four names |
| Point | `Feature A [0.32, 0.78]` | quadrant only, `0`–`1` per axis |

## What it does not do

- **One chart per diagram.** A second `chart` header in the same document is a statement, not
  a second card; make another page or another diagram.
- **No computed values.** There is no aggregation syntax, no formulas and no links to a data
  source — the numbers are the numbers you typed.
- **No axis configuration.** Scales and gridlines come from the data range; units are just
  text in the category or series names.
- Editing a chart on the canvas goes through the data panel, which rewrites the DSL source;
  dragging a bar is not a data edit the canvas can perform.

## Where to go next

- [Insert media](/insert-media/) — charts are inserted from the same toolbar as icons and images.
- [OpenFlow DSL](/openflow-dsl/) — the code panel workflow.
