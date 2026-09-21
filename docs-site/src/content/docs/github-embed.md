---
draft: false
title: Embed diagrams in GitHub
description: Put OpenFlowKit diagrams in a README, wiki or PR with an exported SVG that stays crisp and versioned.
---

A diagram belongs next to the code it explains. The reliable way to put one in a
README, wiki page or PR description is to **export it and commit the file** — no server,
no sharing link that can rot.

## 1. Export from the app

Open the Canvas menu → **Export…**, choose:

- **SVG** for READMEs, wikis and PRs — vector, crisp at every zoom, diffable in review.
- **PNG 2×** when the target renders SVG poorly (some chat clients, older wikis).
- **All pages** if the document has more than one page; each page becomes its own file.

## 2. Commit it next to the docs

```bash
mkdir -p docs/diagrams
# move the exported file in, then:
git add docs/diagrams/checkout.svg
```

Keep the source text with it. A diagram whose DSL is lost becomes impossible to edit:

```bash
openflowkit docs/diagrams/checkout.openflow.json   # or export JSON from the same menu
```

## 3. Reference it in Markdown

```markdown
![Checkout flow](docs/diagrams/checkout.svg)
```

That is all GitHub needs. Two habits make this pleasant long-term:

- **Light and dark**: GitHub swaps your README's theme, not your SVG. Export a dark copy
  too and use `<picture>`:
  ```html
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/diagrams/checkout-dark.svg">
    <img alt="Checkout flow" src="docs/diagrams/checkout-light.svg">
  </picture>
  ```
- **Review**: an SVG diff shows exactly which label moved, so a PR that changes a flow is
  reviewable like code.
