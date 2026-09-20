import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
function walk(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(file) : [file];
  }).sort();
}
const files = walk('src').filter(file => /\.[cm]?[jt]sx?$/.test(file) && !/\.(test|spec)\.|\/__tests__\//.test(file));
const signals = {
  legacyStoreReferences: /\buseFlowStore\b/,
  legacyWriteCandidates: /\b(?:setNodes|setEdges|setGraph|setGraphAndLayers|replacePageWorkspace)\s*\(/,
  reactFlowDependencies: /(?:from\s*|import\s*\()['"][^'"]*(?:reactflow|@xyflow\/react)/i,
  projectionRoundTrips: /\bprojectSceneDocumentToReactFlow\b/,
  themeManagementDependencies: /(?:from\s*|import\s*\()['"][^'"]*(?:designSystem|theme\/resolvers|theme\/palettes)/,
};
const inventory = Object.fromEntries(Object.entries(signals).map(([name, pattern]) => {
  const hits = files.flatMap(file => read(file).split('\n').flatMap((line, i) => pattern.test(line) ? [{ file, line: i + 1 }] : []));
  return [name, { files: new Set(hits.map(hit => hit.file)).size, occurrences: hits.length, hits }];
}));
const fixtures = [
  ['benchmarks/fixtures/small-100.json', '100-node performance input'],
  ['benchmarks/fixtures/medium-300.json', '300-node performance input'],
  ['benchmarks/fixtures/large-1000.json', '1000-node performance input'],
  ['scripts/mermaid-compat-fixtures.json', 'Mermaid supported/invalid/unsupported corpus'],
  ['src/opencanvas/domain/connectors/obstacleRouting.test.ts', 'Connector routing assertions; test source, not a portable document'],
  ['src/services/storage/canonicalPersistence.test.ts', 'Persistence assertions; test source, not a portable document'],
].map(([file, purpose]) => ({ file, purpose, sha256: hash(file), provenance: 'existing repository asset; no customer data collected', customerPermission: 'not applicable', migrationQualification: 'pending' }));
const report = {
  schemaVersion: 1,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  worktree: 'Working-tree bytes measured; commit alone does not reproduce uncommitted changes.',
  method: 'Lexical candidates in production src TS/JS only. Includes definitions and references; not a call graph, confirmed writer count, or v2 dependency gate.',
  sourceDigest: crypto.createHash('sha256').update(files.map(file => `${file}:${hash(file)}`).join('\n')).digest('hex'),
  productionSourceFiles: files.length,
  inventory,
  uiPrimitives: walk('src/components/ui').filter(file => !file.includes('.test.')),
  fixtures,
  unmeasured: ['Customer task success and pain frequency', 'FigJam/Miro task benchmark', 'Real GPU latency and memory', 'Legacy themed document migration fidelity', 'Manual screen reader and touch', 'Production v2 dependency graph (not implemented)'],
};
const output = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes('--check-fixtures')) {
  const pinned = JSON.parse(read('docs/v2/baseline-fixtures.json')).fixtures;
  for (const fixture of pinned) {
    if (hash(fixture.file) !== fixture.sha256) throw new Error(`Fixture changed: ${fixture.file}. Review compatibility evidence before updating the manifest.`);
  }
  console.log(`PASS: ${pinned.length} pinned fixture hashes`);
  process.exit(0);
}
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.join(root, 'docs/evidence/v2-00'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/evidence/v2-00/baseline.json'), output);
  console.log(JSON.stringify({ sourceDigest: report.sourceDigest, inventory: Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, { files: value.files, occurrences: value.occurrences }])), fixtures: fixtures.length }, null, 2));
} else process.stdout.write(output);
