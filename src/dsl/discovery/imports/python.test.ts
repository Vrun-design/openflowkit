import { describe, expect, it } from 'vitest';
import { extractPython, stripPython } from './python';
import { scanImports } from './scan';

// Linear scans take ~60 ms here and ~250 ms on a CI runner; catastrophic backtracking
// on ~1 MB takes seconds, so this cap catches it without timing the runner.
const HOSTILE_INPUT_MS = 1000;

const file = (path: string, content = '') => ({ path, content });
const edges = (files: ReturnType<typeof file>[]) => scanImports(files).imports.map((i) => `${i.from}>${i.to}${i.toKind ? ':dir' : ''}@${i.line}`);
const specs = (source: string) => extractPython(source).map((i) => [i.spec, i.line, ...(i.names ? [i.names.join('|')] : [])]);

describe('extractPython', () => {
  it('reads every import form, with the line the statement starts on', () => {
    const source = 'import os, a.b as x\nfrom .m import (\n    one,\n    two as t,\n)\nfrom . import y\nfrom ..pkg.mod import z\nfrom .x import *\n    import indented\n';
    expect(specs(source)).toEqual([['a.b', 1], ['os', 1], ['.m', 2, 'one|two'], ['.', 6, 'y'], ['..pkg.mod', 7, 'z'], ['.x', 8, '*'], ['indented', 9]]);
  });

  it('ignores comments, docstrings and strings, keeping later line numbers', () => {
    const source = '# import a\n"""\nimport b\n"""\ns = "from c import d"\nt = \'\'\'\nimport e\n\'\'\'\nimport real\n';
    expect(specs(source)).toEqual([['real', 9]]);
  });

  it('ends a string at an escaped-quote-aware close', () => {
    expect(stripPython("x = 'it\\'s'\nimport a\n")).toBe('x =        \nimport a\n');
  });
});

describe('python resolution', () => {
  it('resolves modules, packages, submodules and attributes', () => {
    const files = [
      file('app/__init__.py'), file('app/main.py', 'import app.util\nfrom app import models\nfrom app import VERSION\nfrom app.util import helper\n'),
      file('app/util.py'), file('app/models/__init__.py'),
    ];
    expect(edges(files)).toEqual(['app/main.py>app/util.py@1', 'app/main.py>app/models/__init__.py@2', 'app/main.py>app/__init__.py@3', 'app/main.py>app/util.py@4']);
  });

  it('resolves relative imports from the file package, and reports a missing one as unresolved', () => {
    const files = [
      file('pkg/__init__.py'), file('pkg/a.py', 'from . import b\nfrom .b import f\nfrom ..top import g\nfrom .nope import h\n'), file('pkg/b.py'), file('top.py'),
    ];
    const scan = scanImports(files);
    expect(scan.imports.map((i) => `${i.to}@${i.line}`)).toEqual(['pkg/b.py@1', 'pkg/b.py@2', 'top.py@3']);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['.nope']);
  });

  it('handles the src/ layout and any top-level package folder', () => {
    const files = [file('src/_pytest/__init__.py'), file('src/_pytest/a.py'), file('tools/run.py', 'import _pytest.a\n'), file('backend/svc/__init__.py'), file('backend/svc/x.py'), file('main.py', 'from svc.x import y\n')];
    expect(edges(files)).toEqual(['main.py>backend/svc/x.py@1', 'tools/run.py>src/_pytest/a.py@1']);
  });

  it('reads package roots from pyproject.toml', () => {
    const files = [file('pyproject.toml', '[tool.setuptools.packages.find]\nwhere = ["lib"]\n'), file('lib/ns/mod.py'), file('app.py', 'import ns.mod\n')];
    expect(edges(files)).toEqual(['app.py>lib/ns/mod.py@1']);
  });

  it('resolves a namespace package (no __init__.py) as a dir', () => {
    expect(edges([file('ns/mod.py'), file('app.py', 'import ns\n')])).toEqual(['app.py>ns:dir@1']);
  });

  it('ignores stdlib, lets a local module shadow it, and names external distributions', () => {
    const scan = scanImports([file('a.py', 'import os\nimport json.decoder\nfrom collections import abc\nimport yaml\nfrom fastapi.routing import APIRouter\nimport numpy as np\n')]);
    expect(scan.imports).toEqual([]);
    expect(scan.externals.map((e) => e.pkg)).toEqual(['PyYAML', 'fastapi', 'numpy']);
    expect(edges([file('types.py'), file('a.py', 'import types\n')])).toEqual(['a.py>types.py@1']);
  });

  it('does not call an import through a skipped folder broken', () => {
    const scan = scanImports([file('django/__init__.py'), file('django/core.py', 'from django.test import X\nfrom django.nope import Y\n')]);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['django.nope']);
  });

  it('skips tests, conftest and docs examples', () => {
    expect(edges([file('a.py'), file('test_a.py', 'import a\n'), file('tests/b.py', 'import a\n'), file('conftest.py', 'import a\n'), file('docs_src/x.py', 'import a\n')])).toEqual([]);
  });
});

describe('python statements and limits', () => {
  it('reads statements after ; and :, and joins backslash continuations', () => {
    expect(specs('import a; import b\ntry: import x\nif X: from y import z\nfrom m import a, \\\n  b\nimport after\n')).toEqual([
      ['a', 1], ['b', 1], ['x', 2], ['y', 3, 'z'], ['m', 4, 'a|b'], ['after', 6],
    ]);
  });

  it('ignores a module path longer than 256 characters or 32 segments', () => {
    expect(specs(`import ${'a'.repeat(300)}\nimport ${'a.'.repeat(40)}b\nimport ok\n`)).toEqual([['ok', 3]]);
  });

  it('survives a 100k-segment name in a full scan, and a climb past the repo root is unresolved', () => {
    const scan = scanImports([file('a.py', `import ${'a.'.repeat(100000)}b\n`), file('pkg/__init__.py'), file('pkg/m.py', 'from ... import top\n'), file('top.py')]);
    expect(scan.imports).toEqual([]);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['...']);
  });

  it('knows the remaining stdlib names', () => {
    expect(scanImports([file('a.py', 'import distutils\nimport __main__\nimport sre_parse\nimport _collections_abc\n')]).externals).toEqual([]);
  });
});

describe('python scan cost', () => {
  const inputs: [string, string][] = [
    ['open parens', 'from a import (\n'.repeat(70000)],
    ['wide space', `import${' '.repeat(1e6)}x`],
    ['dots', `from ${'.'.repeat(1e6)} x`],
    ['unclosed docstring', `"""${'import a\n'.repeat(100000)}`],
    ['commas', `import ${'a,'.repeat(300000)}`],
    ['many imports', 'from a.b import c, d\n'.repeat(50000)],
    ['from + 200k spaces', `from${' '.repeat(2e5)}x`],
    ['from x + 200k spaces', `from x${' '.repeat(2e5)}y`],
    ['100k dotted segments', `import ${'a.'.repeat(100000)}b`],
    ['semicolons', 'x;'.repeat(300000)],
    ['colons', 'x:'.repeat(300000)],
    ['backslashes', '\\\n'.repeat(300000)],
  ];
  it.each(inputs)('scans %s (~1 MB) under a second', (_name, source) => {
    const started = performance.now();
    extractPython(source);
    expect(performance.now() - started).toBeLessThan(HOSTILE_INPUT_MS);
  });
});
