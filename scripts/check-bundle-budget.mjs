import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

const MAIN_JS_MAX_KB = Number(process.env.ENTRY_MAIN_JS_BUDGET_KB ?? 1400);
const TOTAL_ENTRY_JS_MAX_KB = Number(process.env.ENTRY_TOTAL_JS_BUDGET_KB ?? 2800);
const ENTRY_CSS_MAX_KB = Number(process.env.ENTRY_CSS_BUDGET_KB ?? 220);

function toKb(bytes) {
  return Number((bytes / 1024).toFixed(1));
}

function parseEntryAssets(html) {
  const matches = html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g);
  const files = new Set();
  for (const match of matches) {
    files.add(match[1]);
  }
  return Array.from(files);
}

function readEntryAssetSizes() {
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    throw new Error('Missing dist/index.html. Run "npm run build" before "npm run bundle:check".');
  }

  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const entryAssets = parseEntryAssets(html);
  const sizes = new Map();

  for (const relativePath of entryAssets) {
    const filePath = path.join(DIST_DIR, relativePath);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Entry asset is missing: ${relativePath}`);
    }
    sizes.set(relativePath, fs.statSync(filePath).size);
  }

  return sizes;
}

function main() {
  const sizes = readEntryAssetSizes();
  const entries = Array.from(sizes.entries());
  const jsEntries = entries.filter(([file]) => file.endsWith('.js'));
  const cssEntries = entries.filter(([file]) => file.endsWith('.css'));
  const mainEntry = jsEntries.find(([file]) => /^assets\/index-.*\.js$/.test(file));

  if (!mainEntry) {
    throw new Error('Could not find main entry JS chunk (assets/index-*.js) in dist/index.html.');
  }

  const [mainEntryFile, mainEntryBytes] = mainEntry;
  const totalEntryJsBytes = jsEntries.reduce((sum, [, size]) => sum + size, 0);
  const totalEntryCssBytes = cssEntries.reduce((sum, [, size]) => sum + size, 0);

  const checks = [
    {
      label: 'main entry JS',
      actualKb: toKb(mainEntryBytes),
      maxKb: MAIN_JS_MAX_KB,
      detail: mainEntryFile,
    },
    {
      label: 'total entry JS',
      actualKb: toKb(totalEntryJsBytes),
      maxKb: TOTAL_ENTRY_JS_MAX_KB,
      detail: `${jsEntries.length} files`,
    },
    {
      label: 'total entry CSS',
      actualKb: toKb(totalEntryCssBytes),
      maxKb: ENTRY_CSS_MAX_KB,
      detail: `${cssEntries.length} files`,
    },
  ];

  console.log('Bundle budget check (entry assets only):');
  for (const check of checks) {
    const status = check.actualKb <= check.maxKb ? 'PASS' : 'FAIL';
    console.log(`- ${status} ${check.label}: ${check.actualKb} KB / ${check.maxKb} KB (${check.detail})`);
  }

  const failures = checks.filter((check) => check.actualKb > check.maxKb);
  if (failures.length > 0) {
    console.error('\nBundle budget violations detected.');
    process.exit(1);
  }
}

main();
