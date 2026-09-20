import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ocDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(ocDir, '..');

// Every file v2 ships lives under these roots. Legacy deletion at V2-15 keeps
// V2_ROOTS + SHARED_KERNEL and removes everything else under src/opencanvas.
const V2_ROOTS = [
  path.join(ocDir, 'application', 'session'),
  path.join(ocDir, 'presentation', 'design-system'),
  path.join(ocDir, 'presentation', 'v2'),
  path.join(srcDir, 'services', 'storage', 'v2'),
];

// Store-free code v2 shares with legacy and keeps after deletion.
const SHARED_KERNEL = [
  path.join(ocDir, 'domain'),
  path.join(ocDir, 'application', 'history'),
  path.join(ocDir, 'application', 'selection'),
  path.join(ocDir, 'application', 'renderer'),
  path.join(ocDir, 'infrastructure', 'pixi'),
  path.join(ocDir, 'infrastructure', 'export'),
  path.join(srcDir, 'config', 'rolloutFlags'),
  path.join(srcDir, 'services', 'storage', 'indexedDbHelpers'),
  path.join(srcDir, 'services', 'storage', 'indexedDbSchema'),
];

// Store-free legacy presentation files reused without moving yet. Each entry
// names the sub-slice that moves it; the list must shrink to zero by V2-05.
const ADOPTION_ALLOWLIST: readonly { path: string; moveTarget: string }[] = [
  { path: 'presentation/pixiPointerOperations.ts', moveTarget: 'V2-05' },
];

// Pre-session v1 writers that stamp updatedAt and project to the legacy
// ReactFlow store. They stay until their surfaces migrate to the session;
// nothing new may join them.
const LEGACY_DIRECT_WRITERS = new Set([
  'application/active-document/productionNodeBridge.ts',
  'application/active-document/productionConnectorBridge.ts',
  'application/active-document/productionTransformBridge.ts',
  'presentation/OpenCanvasDocumentPage.tsx',
]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) return [];
    return [full];
  });
}

function moduleSpecifiers(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];
  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return specifiers;
}

function npmPackageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

function resolveLocal(specifier: string, fromFile: string): string | null {
  if (specifier.startsWith('.')) return path.resolve(path.dirname(fromFile), specifier);
  if (specifier.startsWith('@/')) return path.join(srcDir, specifier.slice(2));
  if (specifier.startsWith('oc/')) return path.join(srcDir, specifier);
  return null;
}

function under(file: string, root: string): boolean {
  return file === root || file.startsWith(root + path.sep) || file === `${root}.ts` || file === `${root}.tsx`;
}

function isAllowedImport(specifier: string, fromFile: string): boolean {
  if (specifier.endsWith('.css')) return true;
  const absolute = resolveLocal(specifier, fromFile);
  if (!absolute) return !npmPackageName(specifier).startsWith('@xyflow/');
  const adopted = ADOPTION_ALLOWLIST.map(({ path: allowed }) =>
    path.join(ocDir, allowed.replace(/\.tsx?$/, ''))
  );
  return [...V2_ROOTS, ...SHARED_KERNEL, ...adopted].some((root) => under(absolute, root));
}

function directWriteReasons(file: string, forbiddenModules: readonly string[]): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const reasons: string[] = [];
  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      if (forbiddenModules.some((marker) => specifier.includes(marker))) {
        reasons.push(`imports ${specifier}`);
      }
    }
    if (
      (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) &&
      node.name.text === 'applyDocumentCommand'
    ) {
      reasons.push('binds applyDocumentCommand directly');
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return reasons;
}

describe('v2 production graph', () => {
  it('imports only from the v2 graph, domain, and the adoption allowlist', () => {
    const offenders: string[] = [];
    for (const root of V2_ROOTS) {
      for (const file of sourceFiles(root)) {
        for (const specifier of moduleSpecifiers(file)) {
          if (!isAllowedImport(specifier, file)) {
            offenders.push(`${path.relative(srcDir, file)} imports ${specifier}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps every adoption allowlist entry live and scheduled', () => {
    const importers = new Set<string>();
    for (const root of V2_ROOTS) {
      for (const file of sourceFiles(root)) {
        for (const specifier of moduleSpecifiers(file)) {
          if (!specifier.startsWith('.')) continue;
          const absolute = path.resolve(path.dirname(file), specifier);
          const ocRelative = path.relative(ocDir, absolute);
          importers.add(ocRelative);
        }
      }
    }
    const stale = ADOPTION_ALLOWLIST.filter(
      ({ path: allowed }) =>
        !importers.has(allowed) && !importers.has(allowed.replace(/\.tsx?$/, ''))
    ).map(({ path: allowed }) => allowed);
    expect(stale, 'migrated files must leave the adoption allowlist').toEqual([]);
    for (const entry of ADOPTION_ALLOWLIST) {
      expect(entry.moveTarget, `${entry.path} must name the sub-slice that moves it`).toMatch(
        /^V2-0[45]/
      );
    }
  });

  it('routes presentation and active-document writes through the session', () => {
    const roots = [
      path.join(ocDir, 'presentation'),
      path.join(ocDir, 'application', 'active-document'),
    ];
    const violators = new Set(
      roots
        .flatMap(sourceFiles)
        .filter((file) => directWriteReasons(file, ['domain/commands/execute']).length > 0)
        .map((file) => path.relative(ocDir, file))
    );
    const unexpected = [...violators].filter((file) => !LEGACY_DIRECT_WRITERS.has(file));
    expect(unexpected, 'new direct document writers must go through application/session').toEqual(
      []
    );
    const stale = [...LEGACY_DIRECT_WRITERS].filter((file) => !violators.has(file));
    expect(stale, 'migrated files must leave the legacy allowlist').toEqual([]);
  });
});
