import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serializeCanonicalJson } from '../src/opencanvas/infrastructure/export/canonicalJson';
import { buildScaleDocument, buildStressDocument } from '../src/opencanvas/testing/stress/buildStressDocument';

function flag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
}

if (process.argv.includes('--help')) {
  console.log(`Generate stress canvases for manual testing.

Usage: npm run stress:generate -- [--out stress] [--block 240] [--scale 500,2000,5000]

  --out    output directory (default: stress)
  --block  nodes in the everything sheet's scale block (default: 240)
  --scale  comma-separated node counts for scale-<n>.json (default: 500,2000,5000)

Load a file in the app: Canvas menu (top-left) → Open file… → pick the JSON.`);
  process.exit(0);
}

const outDir = flag('--out', 'stress');
const scaleBlock = Number(flag('--block', '240'));
const scaleSizes = flag('--scale', '500,2000,5000')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value >= 2);

mkdirSync(outDir, { recursive: true });

const everything = await buildStressDocument({ scaleNodes: scaleBlock });
const everythingText = serializeCanonicalJson(everything);
writeFileSync(join(outDir, 'everything.json'), everythingText);
const page = everything.pages[0];
console.log(
  `${outDir}/everything.json — 1 page, ${page?.nodes.length ?? 0} nodes, ${page?.connectors.length ?? 0} connectors, ${Math.round(everythingText.length / 1024)} KB`
);

for (const nodes of scaleSizes) {
  const scale = buildScaleDocument(nodes);
  const text = serializeCanonicalJson(scale);
  writeFileSync(join(outDir, `scale-${nodes}.json`), text);
  console.log(`${outDir}/scale-${nodes}.json — ${nodes} nodes, ${nodes - 1} connectors, ${Math.round(text.length / 1024)} KB`);
}

console.log('\nLoad in the app: Canvas menu (top-left) → Open file… → pick a file above.');
