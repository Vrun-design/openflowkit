import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';
const root = path.dirname(fileURLToPath(import.meta.url));
const pure = new Set(['tokens.ts', 'motion.ts', 'canvasFeedback.ts', 'spring.ts', 'color.ts']);
describe('V2 UI dependency boundary', () => {
  for (const file of fs
    .readdirSync(root)
    .filter((name) => /\.tsx?$/.test(name) && !name.includes('.test.'))) {
    it(`${file} stays inside presentation foundation`, () => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node) {
        let specifier: string | undefined;
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          specifier = node.moduleSpecifier.text;
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        )
          specifier = node.arguments[0].text;
        if (specifier) {
          const local =
            specifier.startsWith('./') && path.resolve(root, specifier).startsWith(root + path.sep);
          expect(
            local ||
              (!pure.has(file) && specifier === 'react') ||
              (!pure.has(file) &&
                (specifier === 'react-dom' || specifier === '@tabler/icons-react')),
            `${file} imports forbidden dependency: ${specifier}`
          ).toBe(true);
          if (pure.has(file))
            expect(['./tokens', './motion', './canvasFeedback', './spring', './color']).toContain(
              specifier
            );
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
      if (pure.has(file))
        expect(source).not.toMatch(
          /\b(?:window|document|localStorage|fetch|requestAnimationFrame)\s*[.(]/
        );
    });
  }
});
