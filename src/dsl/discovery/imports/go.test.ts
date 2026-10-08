import { describe, expect, it } from 'vitest';
import { extractGo, stripGo } from './go';
import { scanImports } from './scan';

const file = (path: string, content = '') => ({ path, content });
const edges = (files: ReturnType<typeof file>[]) => scanImports(files).imports.map((i) => `${i.from}>${i.to}${i.toKind ? ':dir' : ''}@${i.line}`);

describe('extractGo', () => {
  it('reads single imports, aliases and blocks with _ and . aliases and comments', () => {
    const source = `package x\n\nimport "fmt"\nimport j "encoding/json"\nimport (\n\t"os" // (comment)\n\t_ "a/side"\n\t. "b/dot"\n\t/* "gone" */\n\tal "c/alias"\n)\nvar s = \`import "raw"\`\n`;
    expect(extractGo(source).map((i) => [i.spec, i.line])).toEqual([['fmt', 3], ['encoding/json', 4], ['os', 6], ['a/side', 7], ['b/dot', 8], ['c/alias', 10]]);
  });

  it('is not fooled by a quote rune or a raw string', () => {
    expect(stripGo("c := '\"'\nimport \"a\"\n")).toContain('import "a"');
    expect(extractGo('var q = `\nimport "x"\n`\nimport "y"\n').map((i) => i.spec)).toEqual(['y']);
  });
});

describe('go resolution', () => {
  const mod = (dir: string, path: string, extra = '') => file(`${dir ? `${dir}/` : ''}go.mod`, `module ${path}\n\ngo 1.22\n${extra}`);

  it('maps module-path imports to package folders and reports a missing one', () => {
    const files = [mod('', 'gitea.dev'), file('main.go', 'package main\nimport (\n\t"fmt"\n\t"gitea.dev/modules/log"\n\t"gitea.dev/modules/gone"\n)\n'), file('modules/log/log.go')];
    const scan = scanImports(files);
    expect(scan.imports.map((i) => `${i.to}:${i.toKind}@${i.line}`)).toEqual(['modules/log:dir@4']);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['gitea.dev/modules/gone']);
  });

  it('handles multi-module repos: longest module wins, local replace honoured, nearest go.mod governs', () => {
    const files = [
      mod('', 'ex.com/root'), mod('sub', 'ex.com/root/sub', 'replace ex.com/lib => ../lib\n'), mod('lib', 'ex.com/lib-real'),
      file('sub/a.go', 'package a\nimport "ex.com/root/sub/p"\nimport "ex.com/lib/q"\n'), file('sub/p/p.go'), file('lib/q/q.go'),
      file('b.go', 'package b\nimport "ex.com/lib/q"\n'),
    ];
    expect(edges(files)).toEqual(['sub/a.go>sub/p:dir@2', 'sub/a.go>lib/q:dir@3']);
    expect(scanImports(files).externals.map((e) => e.pkg)).toEqual(['ex.com/lib']);
  });

  it('ignores stdlib and names externals by repo or first path elements', () => {
    const scan = scanImports([file('a.go', 'package a\nimport (\n"net/http"\n"github.com/gin-contrib/sse/x"\n"golang.org/x/net/http2"\n"gopkg.in/yaml.v3"\n"google.golang.org/grpc/codes"\n)\n')]);
    expect(scan.externals.map((e) => e.pkg)).toEqual(['github.com/gin-contrib/sse', 'golang.org/x', 'gopkg.in/yaml.v3', 'google.golang.org/grpc']);
  });

  it('treats a missing path under a required module as a dependency, and under a skipped folder as off the map', () => {
    const scan = scanImports([mod('', 'gitea.dev', 'require (\n\tgitea.dev/actionslib v1.3.0\n)\n'), file('a.go', 'import "gitea.dev/actionslib/pkg/model"\nimport "gitea.dev/testdata/x"\nimport "gitea.dev/nope"\n')]);
    expect(scan.externals.map((e) => e.pkg)).toEqual(['gitea.dev/actionslib']);
    expect(scan.unresolved.map((u) => u.spec)).toEqual(['gitea.dev/nope']);
  });

  it('skips _test.go files and vendor/testdata targets', () => {
    expect(edges([mod('', 'm.io/x'), file('a_test.go', 'import "m.io/x/p"\n'), file('p/p.go'), file('b.go', 'import "m.io/x/vendor/v"\nimport "m.io/x/testdata"\n'), file('vendor/v/v.go'), file('testdata/t.go')])).toEqual([]);
  });
});

describe('go scan cost', () => {
  const inputs: [string, string][] = [
    ['open blocks', 'import (\n'.repeat(120000)],
    ['wide space', `import${' '.repeat(1e6)}"x"`],
    ['unclosed raw string', `\`${'import "a"\n'.repeat(90000)}`],
    ['many imports', 'import "a/b"\n'.repeat(80000)],
    ['300-char path', `import "${'a'.repeat(1e6)}"\n`],
    ['import + spaces + paren', `import${' '.repeat(1e6)}(`],
    ['one huge block', `import (\n${'\t"a/b"\n'.repeat(120000)})\n`],
  ];
  it.each(inputs)('scans %s (~1 MB) in under 200 ms', (_name, source) => {
    const started = performance.now();
    extractGo(source);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
