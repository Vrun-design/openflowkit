import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

const BUDGETS = [
  { label: 'entry index js', match: /^assets\/index-.*\.js$/, maxBytes: 450 * 1024 },
  { label: 'entry react vendor js', match: /^assets\/react-vendor-.*\.js$/, maxBytes: 520 * 1024 },
  { label: 'entry flow vendor js', match: /^assets\/flow-vendor-.*\.js$/, maxBytes: 220 * 1024 },
  { label: 'entry css', match: /^assets\/index-.*\.css$/, maxBytes: 180 * 1024 },
  { label: 'entry flow vendor css', match: /^assets\/flow-vendor-.*\.css$/, maxBytes: 20 * 1024 },
];

function parseAssetPathsFromIndexHtml(html) {
  const assets = [];
  const assetRegex = /(?:src|href)="\.\/(assets\/[^"]+)"/g;
  let match = assetRegex.exec(html);
  while (match) {
    assets.push(match[1]);
    match = assetRegex.exec(html);
  }
  return Array.from(new Set(assets));
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    throw new Error(`Missing dist/index.html. Run "npm run build:ci" before checking bundle budget.`);
  }

  const indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const entryAssets = parseAssetPathsFromIndexHtml(indexHtml);
  const fileSizes = new Map();

  for (const relativeAssetPath of entryAssets) {
    const fullPath = path.join(DIST_DIR, relativeAssetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Entry asset listed in index.html is missing: ${relativeAssetPath}`);
    }
    fileSizes.set(relativeAssetPath, fs.statSync(fullPath).size);
  }

  const lines = ['Bundle budget check (entry assets only):'];
  const violations = [];

  for (const budget of BUDGETS) {
    const matchedAsset = Array.from(fileSizes.entries()).find(([relativePath]) => budget.match.test(relativePath));
    if (!matchedAsset) {
      violations.push(`Missing asset for budget "${budget.label}" (${budget.match})`);
      continue;
    }

    const [relativePath, bytes] = matchedAsset;
    const status = bytes <= budget.maxBytes ? 'PASS' : 'FAIL';
    lines.push(
      `- ${status} ${budget.label}: ${relativePath} (${formatKb(bytes)} / max ${formatKb(budget.maxBytes)})`
    );

    if (bytes > budget.maxBytes) {
      violations.push(
        `${budget.label} exceeded: ${relativePath} (${formatKb(bytes)} > ${formatKb(budget.maxBytes)})`
      );
    }
  }

  console.log(lines.join('\n'));

  if (violations.length > 0) {
    console.error('\nBundle budget violations:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }
}

main();
