import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PIXI_ROOT = 'node_modules/pixi.js';
const ALLOWED_LICENSES = new Set([
  '0BSD', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC0-1.0', 'ISC', 'MIT',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveDependencyPath(packages, fromPath, dependencyName) {
  let cursor = fromPath;
  while (cursor.startsWith('node_modules/')) {
    const candidate = `${cursor}/node_modules/${dependencyName}`;
    if (packages[candidate]) return candidate;
    const marker = cursor.lastIndexOf('/node_modules/');
    if (marker < 0) break;
    cursor = cursor.slice(0, marker);
  }
  const rootCandidate = `node_modules/${dependencyName}`;
  return packages[rootCandidate] ? rootCandidate : null;
}

export function collectDependencyClosure(lock, rootPath = PIXI_ROOT) {
  const packages = lock.packages ?? {};
  const pending = [rootPath];
  const visited = new Set();
  const records = [];
  while (pending.length > 0) {
    const packagePath = pending.pop();
    if (!packagePath || visited.has(packagePath)) continue;
    visited.add(packagePath);
    const entry = packages[packagePath];
    if (!entry) throw new Error(`Dependency lock entry is missing: ${packagePath}`);
    const name = packagePath
      .replace(/^.*\/node_modules\//, '')
      .replace(/^node_modules\//, '');
    const license = typeof entry.license === 'string' ? entry.license : '';
    records.push({ name, version: entry.version ?? '', license, path: packagePath });
    const dependencies = { ...entry.dependencies, ...entry.optionalDependencies };
    for (const dependencyName of Object.keys(dependencies).sort().reverse()) {
      const dependencyPath = resolveDependencyPath(packages, packagePath, dependencyName);
      if (!dependencyPath) throw new Error(
        `${packagePath}: dependency ${dependencyName} is absent from package-lock.json`
      );
      pending.push(dependencyPath);
    }
  }
  return records.sort((left, right) => left.path.localeCompare(right.path));
}

export function extractOpenCanvasFlags(source) {
  const definitions = [];
  const pattern = /\n\s*(openCanvas[A-Za-z0-9]+):\s*\{[\s\S]*?envVar:\s*'([^']+)'[\s\S]*?defaultEnabled:\s*(true|false)/g;
  for (const match of source.matchAll(pattern)) {
    definitions.push({ key: match[1], envVar: match[2], defaultEnabled: match[3] === 'true' });
  }
  return definitions;
}

export function buildOpenCanvasReleaseReport(root = ROOT) {
  const packageJson = readJson(path.join(root, 'package.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  const dependencies = collectDependencyClosure(lock);
  const licenseErrors = dependencies
    .filter((dependency) => !ALLOWED_LICENSES.has(dependency.license))
    .map((dependency) => `${dependency.name}@${dependency.version}: unsupported or missing license "${dependency.license}"`);
  const rolloutSource = fs.readFileSync(path.join(root, 'src/config/rolloutFlags.ts'), 'utf8');
  const flags = extractOpenCanvasFlags(rolloutSource);
  const flagErrors = flags.length === 0
    ? ['No OpenCanvas rollout flags were discovered.']
    : flags.filter((flag) => flag.defaultEnabled)
        .map((flag) => `${flag.key}: OpenCanvas rollout flag must default off`);
  const capabilitySource = fs.readFileSync(
    path.join(root, 'src/opencanvas/infrastructure/pixi/capabilities.ts'),
    'utf8'
  );
  const pageSource = fs.readFileSync(
    path.join(root, 'src/opencanvas/presentation/OpenCanvasDocumentPage.tsx'),
    'utf8'
  );
  const capabilities = {
    webGlRuntimeDetection: capabilitySource.includes("getContext('webgl2')")
      && capabilitySource.includes("getContext('webgl')"),
    reactFlowFallback: pageSource.includes('Use React Flow'),
    contextLossFallback: pageSource.includes('webglcontextlost')
      || pageSource.includes('context-lost'),
    canonicalImportExport: pageSource.includes('Export canonical JSON'),
    semanticAccessibility: flags.some((flag) => flag.key === 'openCanvasA11yV1'),
  };
  const capabilityErrors = Object.entries(capabilities)
    .filter(([, supported]) => !supported)
    .map(([name]) => `${name}: capability evidence missing`);
  const errors = [...licenseErrors, ...flagErrors, ...capabilityErrors];
  return {
    schemaVersion: 1,
    product: packageJson.name,
    productVersion: packageJson.version,
    status: errors.length === 0 ? 'pass' : 'fail',
    capabilities,
    rolloutFlags: flags,
    dependencies,
    policy: { allowedLicenses: [...ALLOWED_LICENSES].sort(), root: 'pixi.js' },
    errors,
  };
}

function main() {
  const report = buildOpenCanvasReleaseReport();
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (process.argv.includes('--write')) {
    const outputPath = path.join(
      ROOT,
      'docs/evidence/opencanvas-release-readiness.latest.json'
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialized);
  } else {
    process.stdout.write(serialized);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
