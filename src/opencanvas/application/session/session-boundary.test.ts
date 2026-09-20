import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sessionDir = path.dirname(fileURLToPath(import.meta.url));
const opencanvasDir = path.resolve(sessionDir, '..', '..');
const v2StorageDir = path.resolve(sessionDir, '..', '..', '..', 'services', 'storage', 'v2');

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

function moduleSpecifier(node: ts.Node): string | undefined {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text;
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments[0] &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0].text;
  }
  return undefined;
}

function directWriteReasons(file: string, forbiddenModules: readonly string[]): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const reasons: string[] = [];
  function visit(node: ts.Node): void {
    const specifier = moduleSpecifier(node);
    if (specifier && forbiddenModules.some((marker) => specifier.includes(marker))) {
      reasons.push(`imports ${specifier}`);
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

describe('V2 storage and session boundaries', () => {
  it('routes presentation and active-document writes through the session', () => {
    const roots = [
      path.join(opencanvasDir, 'presentation'),
      path.join(opencanvasDir, 'application', 'active-document'),
    ];
    const violators = new Set(
      roots
        .flatMap(sourceFiles)
        .filter((file) => directWriteReasons(file, ['domain/commands/execute']).length > 0)
        .map((file) => path.relative(opencanvasDir, file))
    );
    const unexpected = [...violators].filter((file) => !LEGACY_DIRECT_WRITERS.has(file));
    expect(unexpected, 'new direct document writers must go through application/session').toEqual(
      []
    );
    const stale = [...LEGACY_DIRECT_WRITERS].filter((file) => !violators.has(file));
    expect(stale, 'migrated files must leave the legacy allowlist').toEqual([]);
  });

  it('keeps the session free of legacy round trips and direct record writes', () => {
    const forbidden = [
      'domain/commands/execute',
      'infrastructure/reactflow',
      'services/storage',
      'legacyProjection',
      '/store/',
    ];
    const offenders = sourceFiles(sessionDir).flatMap((file) =>
      directWriteReasons(file, forbidden).map((reason) => `${path.basename(file)}: ${reason}`)
    );
    expect(offenders).toEqual([]);
  });

  it('keeps the v2 repository free of v1 record types', () => {
    const forbidden = [
      'infrastructure/reactflow',
      'legacyProjection',
      '/store/',
      'flowDocumentModel',
      'persistedDocumentAdapters',
    ];
    const offenders = sourceFiles(v2StorageDir).flatMap((file) =>
      directWriteReasons(file, forbidden).map((reason) => `${path.basename(file)}: ${reason}`)
    );
    expect(offenders).toEqual([]);
  });
});
