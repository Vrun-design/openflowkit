// Generates the DSL reference page from the canonical grammar
// (src/dsl/grammar.md). Run by `predev`/`prebuild` so the page can never
// drift from the parser: one grammar, one source.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const SOURCE = resolve(REPO_ROOT, 'src', 'dsl', 'grammar.md');
const OUT_FILE = resolve(HERE, '..', 'src', 'content', 'docs', 'openflow-dsl-reference.md');

const FRONTMATTER = `---
title: OpenFlow DSL reference
description: The complete, versioned OpenFlow DSL grammar — families, statements, attributes, canonical form.
---

:::note[Generated]
This page is generated from \`src/dsl/grammar.md\` in the repository by
\`npm run generate:dsl\`. Edit the grammar, not this file.
:::

`;

async function main() {
  const grammar = await readFile(SOURCE, 'utf8');
  // Drop the "this file is the language" status paragraph; the page is public.
  const body = grammar
    .replace(/^# OFK grammar — version 1\n/, '')
    .replace(/^Status:.*\n(?:.*\n)*?\n/m, '')
    .replace(/^## /gm, '## ');
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, FRONTMATTER + body, 'utf8');
  console.log(`[dsl-reference] wrote ${relative(REPO_ROOT, OUT_FILE)} (${body.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
