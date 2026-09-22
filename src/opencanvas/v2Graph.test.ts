import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ocDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(ocDir, '..');

// Every file the editor ships lives under these roots.
const V2_ROOTS = [
  path.join(ocDir, 'application', 'session'),
  path.join(ocDir, 'application', 'ai'),
  path.join(ocDir, 'application', 'dsl'),
  path.join(ocDir, 'presentation', 'design-system'),
  path.join(ocDir, 'presentation', 'v2'),
  path.join(srcDir, 'services', 'storage', 'v2'),
  path.join(srcDir, 'services', 'dsl'),
];

// The kernel the editor builds on: pure domain, application services, adapters.
const SHARED_KERNEL = [
  path.join(ocDir, 'domain'),
  path.join(srcDir, 'dsl'),
  path.join(ocDir, 'application', 'history'),
  path.join(ocDir, 'application', 'selection'),
  // Pure command builders for pages and layers; the document bar commits them.
  path.join(ocDir, 'application', 'active-document'),
  path.join(ocDir, 'application', 'renderer'),
  path.join(ocDir, 'infrastructure', 'pixi'),
  path.join(ocDir, 'infrastructure', 'export'),
  path.join(srcDir, 'services', 'storage', 'indexedDbHelpers'),
  path.join(srcDir, 'services', 'storage', 'indexedDbSchema'),
  path.join(srcDir, 'services', 'elk-layout'),
  path.join(srcDir, 'services', 'shapeLibrary'),
  // The Mermaid parsers feed the DSL hub's transpiler (services/dsl/mermaidToDsl).
  path.join(srcDir, 'services', 'mermaid'),
  // BYOK provider clients: pure fetch adapters (no DOM, no React).
  path.join(srcDir, 'services', 'ai'),
  // The pure agent surface: the editor hosts it (live bridge) and the MCP
  // server bundles it. Nothing under src/agent may reach into presentation.
  path.join(srcDir, 'agent'),
  // Folder workspaces (File System Access API adapter) and their pure merge
  // helpers; no DOM beyond the picker call itself.
  path.join(srcDir, 'services', 'workspace'),
];

// Data read as text at runtime (the grammar for get_syntax), not code.
const RAW_DATA_ROOTS = [path.join(srcDir, '..', 'docs')];


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
  if (specifier.endsWith('?raw')) {
    const absolute = resolveLocal(specifier.slice(0, -'?raw'.length), fromFile);
    // Docs are data, not code: raw imports may only reach into docs/.
    return absolute === null || RAW_DATA_ROOTS.some((root) => under(absolute, root));
  }
  const absolute = resolveLocal(specifier, fromFile);
  if (!absolute) return true;
  return [...V2_ROOTS, ...SHARED_KERNEL].some((root) => under(absolute, root));
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
  it('imports only from the editor graph and the kernel', () => {
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


  it('routes presentation and active-document writes through the session', () => {
    const roots = [
      path.join(ocDir, 'presentation'),
      path.join(ocDir, 'application', 'active-document'),
    ];
    const violators = roots
      .flatMap(sourceFiles)
      .filter((file) => directWriteReasons(file, ['domain/commands/execute']).length > 0)
      .map((file) => path.relative(ocDir, file));
    expect(violators, 'direct document writers must go through application/session').toEqual([]);
  });
});
