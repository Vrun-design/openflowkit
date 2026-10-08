import { describe, expect, it } from 'vitest';
import { isSkippedSource, scanImports } from './scan';


const file = (path: string, content = '') => ({ path, content });
const edges = (files: ReturnType<typeof file>[]) => scanImports(files).imports.map((i) => `${i.from}>${i.to}${i.toKind ? ':dir' : ''}@${i.line}`);

describe('isSkippedSource', () => {
  it('skips tests, fixtures, generated, vendored, built output, dot-folders and .d.ts', () => {
    for (const path of ['a.test.ts', 'a.spec.tsx', 'x/__tests__/a.ts', 'e2e/a.ts', 'src/fixtures/a.ts', 'src/generated/a.ts', 'a.integration.mjs', 'vendor/a.js', 'node_modules/p/a.js', 'dist/a.js', '.storybook/a.ts', 'a.d.ts', 'x/testing/a.ts']) {
      expect(isSkippedSource(path), path).toBe(true);
    }
    for (const path of ['src/a.ts', 'src/testbed/a.ts', 'src/latest.ts', 'worker/index.ts']) expect(isSkippedSource(path), path).toBe(false);
  });
});

describe('relative resolution', () => {
  it('adds extensions, /index, and maps .js to .ts', () => {
    const files = [
      file('src/a.ts', "import './b';\nimport './dir';\nimport './c.js';\nimport './d';\nimport './e.mjs';\nexport * from '.';\n"),
      file('src/b.ts'), file('src/dir/index.tsx'), file('src/c.ts'), file('src/d.jsx'), file('src/e.mts'), file('src/index.ts'),
    ];
    expect(edges(files)).toEqual(['src/a.ts>src/b.ts@1', 'src/a.ts>src/dir/index.tsx@2', 'src/a.ts>src/c.ts@3', 'src/a.ts>src/d.jsx@4', 'src/a.ts>src/e.mts@5', 'src/a.ts>src/index.ts@6']);
  });

  it('resolves ../ and reports a missing relative file as unresolved, never as external', () => {
    const scan = scanImports([file('a/b/c.ts', "import '../x';\nimport './nope';\nimport '../../../out';"), file('a/x.ts')]);
    expect(scan.imports.map((i) => i.to)).toEqual(['a/x.ts']);
    expect(scan.unresolved.map((u) => [u.spec, u.line])).toEqual([['./nope', 2], ['../../../out', 3]]);
    expect(scan.externals).toEqual([]);
  });

  it('ignores assets, strips ?query, and does not count a self-import', () => {
    const scan = scanImports([file('a.ts', "import './s.css';\nimport x from './b?raw';\nimport './a';\nimport './missing.svg';"), file('b.ts')]);
    expect(scan.imports.map((i) => i.to)).toEqual(['b.ts']);
    expect(scan.unresolved).toEqual([]);
  });

  it('drops edges into skipped files without calling them unresolved', () => {
    const scan = scanImports([file('src/a.ts', "import './gen/x.generated';\nimport './helper.test';"), file('src/gen/x.generated.ts'), file('src/helper.test.ts')]);
    expect(scan.imports).toEqual([]);
    expect(scan.unresolved).toEqual([]);
  });
});

describe('tsconfig paths and baseUrl', () => {
  const tsconfig = '// comment\n{ "compilerOptions": { "baseUrl": "src", "paths": { "@/*": ["./*"], "@lib": ["lib/main"], }, }, }';

  it('resolves wildcard and exact paths relative to baseUrl, from JSONC', () => {
    const files = [file('tsconfig.json', tsconfig), file('src/app.ts', "import '@/ui/button';\nimport '@lib';\nimport 'ui/button';\nimport '@/missing';"), file('src/ui/button.ts'), file('src/lib/main.ts')];
    const scan = scanImports(files);
    expect(scan.imports.map((i) => i.to)).toEqual(['src/ui/button.ts', 'src/lib/main.ts', 'src/ui/button.ts']);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['@/missing']);
  });

  it('without baseUrl, paths are relative to the tsconfig folder', () => {
    const files = [file('tsconfig.json', '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}'), file('src/a.ts', "import '@/b';"), file('src/b.ts')];
    expect(edges(files)).toEqual(['src/a.ts>src/b.ts@1']);
  });

  it('follows a relative extends, and the nearest tsconfig governs', () => {
    const files = [
      file('tsconfig.base.json', '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}'),
      file('tsconfig.json', '{"extends":"./tsconfig.base"}'),
      file('pkg/tsconfig.json', '{"extends":"../tsconfig.base.json","compilerOptions":{"paths":{"@/*":["./lib/*"]}}}'),
      file('src/a.ts', "import '@/b';"), file('src/b.ts'),
      file('pkg/src/a.ts', "import '@/b';"), file('pkg/lib/b.ts'),
    ];
    expect(edges(files)).toEqual(['pkg/src/a.ts>pkg/lib/b.ts@1', 'src/a.ts>src/b.ts@1']);
  });

  it('treats an alias with no config as unresolved, not as an npm package', () => {
    const scan = scanImports([file('a.ts', "import '@/x';\nimport '~/y';")]);
    expect(scan.unresolved).toHaveLength(2);
    expect(scan.externals).toEqual([]);
  });
});

describe('workspace packages', () => {
  const pkg = (name: string, extra: object = {}) => file(`packages/${name}/package.json`, JSON.stringify({ name: `@acme/${name}`, ...extra }));

  it('maps a package name to its entry via exports, main, then src/index', () => {
    const files = [
      pkg('a', { exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' }, './util': './src/util.ts' } }), file('packages/a/src/index.ts'), file('packages/a/src/util.ts'),
      pkg('b', { main: './lib/main.js' }), file('packages/b/src/main.ts'),
      pkg('c'), file('packages/c/src/index.ts'),
      file('app/x.ts', "import '@acme/a';\nimport '@acme/a/util';\nimport '@acme/b';\nimport '@acme/c';\nimport '@acme/c/index';"),
    ];
    expect(edges(files)).toEqual(['app/x.ts>packages/a/src/index.ts@1', 'app/x.ts>packages/a/src/util.ts@2', 'app/x.ts>packages/b/src/main.ts@3', 'app/x.ts>packages/c/src/index.ts@4', 'app/x.ts>packages/c/src/index.ts@5']);
  });

  it('falls back to the package folder as a dir edge when no entry file is in the scan', () => {
    expect(edges([pkg('d'), file('app/x.ts', "import '@acme/d';")])).toEqual(['app/x.ts>packages/d:dir@1']);
  });
});

describe('externals', () => {
  it('keeps scoped names, drops subpaths, and ignores node: builtins, bare builtins and URLs', () => {
    const scan = scanImports([file('a.ts', "import 'react';\nimport x from '@aws-sdk/client-s3/commands';\nimport 'lodash/fp';\nimport fs from 'node:fs';\nimport 'path';\nimport 'fs/promises';\nimport 'https://cdn.x/y.js';")]);
    expect(scan.externals.map((e) => [e.pkg, e.line])).toEqual([['react', 1], ['@aws-sdk/client-s3', 2], ['lodash', 3]]);
  });
});

describe('output', () => {
  it('is sorted by path then line, counts lines, and skips test files entirely', () => {
    const scan = scanImports([file('z.ts', "import './a';\n"), file('a.ts', "import './z';\nimport './z';\n"), file('a.test.ts', "import './z';")]);
    expect(scan.imports.map((i) => `${i.from}@${i.line}`)).toEqual(['a.ts@1', 'a.ts@2', 'z.ts@1']);
    expect(scan.loc).toEqual({ 'a.ts': 2, 'z.ts': 1 });
  });
});

describe('config edge cases', () => {
  it('survives self-extends and extends cycles quickly', () => {
    const files = [
      file('tsconfig.json', JSON.stringify({ extends: Array(10).fill('./tsconfig.json') })),
      file('a/tsconfig.json', '{"extends":"../b/tsconfig.json"}'), file('b/tsconfig.json', '{"extends":"../a/tsconfig.json"}'),
      file('a/x.ts', "import '@/y';"), file('b/x.ts', "import '@/y';"),
    ];
    const started = performance.now();
    const scan = scanImports(files);
    expect(performance.now() - started).toBeLessThan(200);
    expect(scan.unresolved).toHaveLength(2);
  });

  it('a bare "*" path does not turn every package into an unresolved alias', () => {
    const files = [file('tsconfig.json', '{"compilerOptions":{"paths":{"*":["./types/*"]}}}'), file('a.ts', "import 'react';\nimport './types/x';"), file('types/x.ts')];
    const scan = scanImports(files);
    expect(scan.externals.map((e) => e.pkg)).toEqual(['react']);
    expect(scan.unresolved).toEqual([]);
  });

  it('reads paths through a solution-style tsconfig (files: [] + references)', () => {
    const files = [
      file('tsconfig.json', '{"files":[],"references":[{"path":"./tsconfig.node.json"},{"path":"./tsconfig.app.json"}]}'),
      file('tsconfig.node.json', '{"include":["vite.config.ts"]}'),
      file('tsconfig.app.json', '\uFEFF{"compilerOptions":{"paths":{"@/*":["./src/*"]}},"include":["src"]}'),
      file('src/a.ts', "import '@/b';"), file('src/b.ts'),
    ];
    expect(edges(files)).toEqual(['src/a.ts>src/b.ts@1']);
  });

  it('gives the same answer whatever order files arrive in; shallowest package name wins', () => {
    const files = [
      file('a/package.json', '{"name":"dup"}'), file('a/src/index.ts'),
      file('z/deep/package.json', '{"name":"dup"}'), file('z/deep/src/index.ts'),
      file('app.ts', "import 'dup';"),
    ];
    expect(edges(files)).toEqual(['app.ts>a/src/index.ts@1']);
    expect(edges([...files].reverse())).toEqual(edges(files));
  });

  it('ignores package.json under skipped folders and never picks a dist or test entry', () => {
    const files = [
      file('fixtures/package.json', '{"name":"pk"}'), file('packages/pk/package.json', '{"name":"pk","main":"./dist/index.js"}'),
      file('packages/pk/dist/index.js'), file('packages/pk/src/index.ts'), file('app.ts', "import 'pk';"),
    ];
    expect(edges(files)).toEqual(['app.ts>packages/pk/src/index.ts@1']);
  });

  it('prefers a.ts over a.js for ./a.js, and ignores more builtins', () => {
    const scan = scanImports([file('x.ts', "import './a.js';\nimport 'inspector';\nimport 'wasi';"), file('a.js'), file('a.ts')]);
    expect(scan.imports.map((i) => i.to)).toEqual(['a.ts']);
    expect(scan.externals).toEqual([]);
  });

  it('counts lines of a file over 1 MB but does not scan it', () => {
    const big = `import './b';\n${'// pad\n'.repeat(150000)}`;
    const scan = scanImports([file('a.ts', big), file('b.ts')]);
    expect(scan.imports).toEqual([]);
    expect(scan.loc['a.ts']).toBe(150001);
  });
});

describe('limits and aliases', () => {
  it('skips docs/ and examples/ only at the repo top', () => {
    expect(isSkippedSource('docs/a.ts')).toBe(true);
    expect(isSkippedSource('examples/a.ts')).toBe(true);
    expect(isSkippedSource('apps/docs/a.ts')).toBe(false);
    expect(isSkippedSource('cmd/example/main.go')).toBe(false);
  });

  it('ignores config files over 200 KB instead of parsing them', () => {
    const big = `{"compilerOptions":{"paths":{"@/*":["./src/*"]}},"pad":"${'x'.repeat(250000)}"}`;
    expect(scanImports([file('tsconfig.json', big), file('a.ts', "import '@/b';"), file('src/b.ts')]).unresolved).toHaveLength(1);
  });

  it('treats a matched-but-missing paths alias as external only when some package.json lists it', () => {
    const tsconfig = file('tsconfig.json', '{"compilerOptions":{"paths":{"@vue/*":["./packages/*/src"]}}}');
    const files = [tsconfig, file('a.ts', "import '@vue/repl';\nimport '@vue/gone';"), file('package.json', '{"devDependencies":{"@vue/repl":"^4"}}')];
    const scan = scanImports(files);
    expect(scan.externals.map((e) => e.pkg)).toEqual(['@vue/repl']);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['@vue/gone']);
  });
});
