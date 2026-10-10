// Copies the canonical grammar (src/dsl/grammar.md), minus its §0 research notes, into mcp-server/data so
// the published package can serve `get_syntax` and the grammar resource without
// the repository around it. Run by `prebuild`; missing source is tolerated.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const SOURCE = resolve(REPO_ROOT, 'src', 'dsl', 'grammar.md');
const OUT_FILE = resolve(HERE, '..', 'data', 'grammar.md');

async function main() {
  let grammar;
  try {
    grammar = await readFile(SOURCE, 'utf8');
  } catch {
    console.error(`[grammar] ${relative(REPO_ROOT, SOURCE)} not found; leaving data/grammar.md untouched.`);
    return;
  }
  // §0 is the design record (sources we checked), not reference: agents get the language only.
  const shipped = grammar.replace(/^## 0\. [^\n]*\n[\s\S]*?(?=^## )/m, '').replace('§0 prior art · ', '');
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, shipped, 'utf8');
  console.log(`[grammar] wrote ${relative(REPO_ROOT, OUT_FILE)} (${shipped.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
