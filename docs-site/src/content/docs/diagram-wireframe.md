---
title: Wireframes
description: The wireframe family — phone, tablet, browser and window screens of buttons, inputs, toggles and 30-odd other controls, written in Koboyo's syntax.
---

A wireframe is a row of screens, each a device frame holding controls stacked down its
column. The syntax is Koboyo's, so wireframe text written for Koboyo compiles here unchanged.

```openflow
wireframe
title: Onboarding

screen Login [phone] {
  heading: Welcome back
  input: Email
  input: Password
  button: Sign in [half, primary]
  button: SSO [half]
  navbar: Home | Feed | Profile [active: 0]
}
```

## Screens

`screen Name [frame] { … }` opens a screen. The frame is `phone` (the default), `tablet`,
`browser`, `window`, or a plain `frame`. An
unknown frame warns W143 and uses a phone. Screens sit side by side, named above their top
edge, and a screen grows taller when its controls need the room.

## Controls

A control is `kind` or `kind: label`, then optional attributes in `[…]`:

| Kind | Example |
| --- | --- |
| Form | `button: Save`, `input: Email`, `search: Find`, `textarea: Bio`, `dropdown: Country` |
| Choice | `checkbox: Remember me [checked]`, `radio: Weekly`, `toggle: Dark mode [on]`, `segmented: Day \| Week [active: 0]` |
| Value | `slider [60%]`, `progress [0.8]`, `rating [80%]` |
| Navigation | `navbar`, `tabs`, `tabbar`, `breadcrumbs`, `pagination`, `stepper`, `sidebar`, `menu`, `accordion`, `list` — items as `A \| B \| C` |
| Content | `heading`, `paragraph`, `link`, `image`, `avatar`, `card`, `badge`, `divider`, `tooltip`, `datepicker` |
| Chrome | `statusbar: 9:41`, `fab` |

An unknown control warns W141 and is skipped; the rest of the screen still draws.

## Attributes

| Attribute | Meaning |
| --- | --- |
| `half`, `third`, `two-thirds` | Width; `1/2`, `1/3`, `2/3` also work. Consecutive controls share a row while their widths fit. |
| `on` / `checked`, `off` | Checkbox, radio and toggle state |
| `60%` or `0.6` | Slider, progress and rating value |
| `active: N` | The selected item, counting from 0 (a date picker's selected day) |
| `info`, `success`, `warning`, `error` | Alert and badge severity |
| `primary` | A filled button |

A tab bar pins to the bottom of its screen and a `fab` floats above it, wherever they are
written. An unknown attribute warns W142.

```openflow
wireframe
screen Settings [browser] {
  breadcrumbs: Home | Account | Settings [active: 2]
  heading: Account settings
  avatar [third]
  input: Display name [two-thirds]
  toggle: Two-factor auth [on]
  toggle: Marketing emails [off]
  divider
  button: Save changes [half, primary]
  button: Discard [half]
}
```

## On the canvas

The same controls are in the toolbar's **More** flyout (`Shift + S`), under Wireframe. With a
frame selected — or anything inside one — each pick stacks into that frame's column, so a
screen can be built by clicking controls one after another. Select a control to change its
state from the style bar's **State** button; double-click to edit its label.

## What it does not do

- **Layout is a column.** There are no grids, spacing values or alignment options beyond the
  row widths; drag controls on the canvas for anything else (the text is not rewritten).
- **No real interaction.** A toggle does not flip when clicked; it is a picture of a toggle.
- **Text is measured approximately**, so a very long label can end in an ellipsis a little
  early or late.
- Comments inside a wireframe move to the end of the text when it is rewritten.

## Where to go next

- [Insert media](/insert-media/) — frames and tools from the More flyout.
- [The OpenFlow DSL](/openflow-dsl/) — how every family shares one language.
