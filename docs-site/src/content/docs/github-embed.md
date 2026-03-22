---
draft: false
title: Embed Diagrams in GitHub
description: Create viewer links for OpenFlowKit diagrams and embed them into GitHub-flavored documentation workflows.
---

OpenFlowKit diagrams can be embedded in any GitHub README or Markdown file as interactive, read-only views. No server setup or GitHub App required.

## How it works

The `/view` route renders any OpenFlow DSL passed as a URL parameter. You encode your diagram as a URL-safe string and link to it from your README.

```
https://openflowkit.dev/#/view?flow=BASE64_ENCODED_DSL
```

When someone clicks the link, they see the fully rendered, interactive diagram and can pan, zoom, and click **Open in Editor** to load it into the canvas for editing.

## When this is useful

Use the GitHub embed workflow when:

- your team documents systems in Markdown
- you want a richer diagram experience than a static PNG
- you want readers to be able to open the diagram back in the editor

## Step-by-step

### 1. Write your diagram in OpenFlow DSL

```
flow: "My Architecture"
direction: LR

[browser] client: Web App
[system] api: API Server
[system] db: PostgreSQL

client -> api |HTTP|
api -> db |SQL|
```

### 2. Encode it

In the browser console, or any JavaScript environment:

```js
const dsl = `flow: "My Architecture"
direction: LR

[browser] client: Web App
[system] api: API Server
[system] db: PostgreSQL

client -> api |HTTP|
api -> db |SQL|`;

const encoded = btoa(encodeURIComponent(dsl));
console.log(encoded);
// → paste this into the URL below
```

### 3. Embed in your README

```markdown
[![Architecture Diagram](https://openflowkit.dev/og-diagram.png)](https://openflowkit.dev/#/view?flow=PASTE_ENCODED_VALUE_HERE)
```

The outer image link makes GitHub show a clickable preview image. Replace `og-diagram.png` with a screenshot of your diagram for the best preview.

Or link directly without an image:

```markdown
[View Architecture Diagram →](https://openflowkit.dev/#/view?flow=PASTE_ENCODED_VALUE_HERE)
```

## Updating diagrams

Edit your DSL, re-encode, and update the URL in the README. Because the entire diagram is in the URL, there is no external file to keep in sync.

For diagrams you want to iterate on frequently, store the raw DSL in a `.flow` file in your repo and reference it in a comment next to the embed link:

```markdown
<!-- Source: ./docs/architecture.flow -->
[View Architecture →](https://openflowkit.dev/#/view?flow=...)
```

## Encoding helper

You can also export the viewer URL directly from the OpenFlowKit editor:

1. Open your diagram in the editor
2. Open **Studio → Code → OpenFlow DSL**
3. Copy the DSL
4. Encode it with the snippet above

## Supported DSL features

All OpenFlow DSL node types and edge types render in the viewer:

- All node types: `[system]`, `[browser]`, `[mobile]`, `[process]`, `[decision]`, `[section]`, `[annotation]`, and more
- All edge styles: solid, dashed (`..>`), curved (`-->`), thick (`==>`)
- Edge labels, colors, icons, and grouping sections

## Related reading

- [OpenFlow DSL Reference](/openflow-dsl/)
- [Exporting Diagrams](/exporting/)
- [Import from Structured Data](/import-from-data/)
