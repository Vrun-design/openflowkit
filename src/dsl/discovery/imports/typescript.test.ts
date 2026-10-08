import { describe, expect, it } from 'vitest';
import { extractImports } from './typescript';

const specs = (source: string) => extractImports(source).map((i) => [i.spec, i.line]);

describe('extractImports', () => {
  it('reads a multi-line import at the line the statement starts', () => {
    expect(specs("const a = 1;\nimport {\n  b,\n  c,\n} from './x';\n")).toEqual([['./x', 2]]);
  });

  it('reads default, namespace, type and side-effect imports', () => {
    const source = "import a from 'a';\nimport * as b from 'b';\nimport type { C } from 'c';\nimport type D from 'd';\nimport './side';\nimport e, { f } from 'e';\n";
    expect(specs(source).map(([s]) => s)).toEqual(['a', 'b', 'c', 'd', './side', 'e']);
  });

  it('reads export-from in every form', () => {
    expect(specs("export * from './a';\nexport * as ns from './b';\nexport { x } from './c';\nexport type { T } from './d';\n").map(([s]) => s)).toEqual(['./a', './b', './c', './d']);
  });

  it('reads dynamic import() and require()', () => {
    const source = "const m = await import('./lazy');\nconst r = require('./cjs');\nconst t: typeof import('./ty') = x;\n";
    expect(specs(source)).toEqual([['./lazy', 1], ['./cjs', 2], ['./ty', 3]]);
  });

  it('ignores commented-out imports, template samples and plain strings, keeping later line numbers', () => {
    const source = "// import a from 'a';\n/* import b from 'b';\nimport c from 'c'; */\nconst s = `\nimport d from 'd';\n`;\nconst t = \"import e from 'e'\";\nimport f from 'f';\n";
    expect(specs(source)).toEqual([['f', 8]]);
  });

  it('is not fooled by exports that merely contain a string, or method calls named require', () => {
    expect(specs("export const a = 'x';\nexport default 'y';\njest.require('z');\nobj.import('w');\n")).toEqual([]);
  });

  it('keeps the statement text with whitespace collapsed', () => {
    expect(extractImports("import {\n  a,\n  b,\n} from './x';")[0]!.text).toBe("import { a, b, } from './x'");
  });

  it('does not pair a `from` inside a string with an earlier real keyword', () => {
    expect(specs("export function f() {\n  return 1;\n}\nconst s = \"import a from 'b'\";\n")).toEqual([]);
    expect(specs("export function f() { return \"x from 'y'\" }")).toEqual([]);
    expect(specs("import {\n  a,\n  b,\n} from './ok';")).toEqual([['./ok', 1]]);
  });

  it('ignores a specifier longer than 256 characters', () => {
    expect(specs(`import a from '${'x'.repeat(300)}';\nimport b from 'ok';`)).toEqual([['ok', 2]]);
  });

  it('finds imports after a semicolon and in minified code', () => {
    expect(specs("a();import x from 'y';export{z}from'w';import'side'")).toEqual([['y', 1], ['w', 1], ['side', 1]]);
  });
});

describe('extractImports cost', () => {
  const inputs: [string, string][] = [
    ['open braces', 'import {\n'.repeat(40000)],
    ['export blocks', 'export interface A {\n'.repeat(40000)],
    ['wide space', `import${' '.repeat(1e5)}x`],
    ['1 MB of keywords', 'import {\n'.repeat(110000)],
    ['1 MB specifier', `import x from '${'a'.repeat(1e6)}'`],
    ['many froms', "import {\n a } from 'x'\n".repeat(40000)],
  ];
  it.each(inputs)('scans %s in under 200 ms', (_name, source) => {
    const started = performance.now();
    extractImports(source);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
