import { describe, it, expect } from 'vitest';
import {
  parseImports,
  detectLanguage,
  shouldIncludeFile,
  buildFileTree,
  parseTsConfigAliases,
  resolveAliasImport,
} from './codebaseParser';

describe('detectLanguage', () => {
  it('detects TypeScript from .ts extension', () => {
    expect(detectLanguage('src/app.ts')).toBe('typescript');
  });

  it('detects TypeScript from .tsx extension', () => {
    expect(detectLanguage('src/App.tsx')).toBe('typescript');
  });

  it('detects Python from .py extension', () => {
    expect(detectLanguage('src/main.py')).toBe('python');
  });

  it('detects Go from .go extension', () => {
    expect(detectLanguage('cmd/main.go')).toBe('go');
  });

  it('returns null for non-source files', () => {
    expect(detectLanguage('README.md')).toBeNull();
    expect(detectLanguage('package.json')).toBeNull();
  });
});

describe('shouldIncludeFile', () => {
  it('includes source files', () => {
    expect(shouldIncludeFile('src/app.ts')).toBe(true);
    expect(shouldIncludeFile('lib/utils.py')).toBe(true);
  });

  it('excludes node_modules', () => {
    expect(shouldIncludeFile('node_modules/react/index.js')).toBe(false);
  });

  it('excludes .git', () => {
    expect(shouldIncludeFile('.git/config')).toBe(false);
  });

  it('excludes binary files', () => {
    expect(shouldIncludeFile('assets/logo.png')).toBe(false);
    expect(shouldIncludeFile('assets/font.woff2')).toBe(false);
  });
});

describe('parseImports', () => {
  it('parses TypeScript named imports', () => {
    const code = `import { foo } from './bar';
import { baz } from '../lib/utils';`;
    const imports = parseImports(code, 'typescript');
    expect(imports).toHaveLength(2);
    expect(imports[0].source).toBe('./bar');
    expect(imports[0].isLocal).toBe(true);
    expect(imports[1].source).toBe('../lib/utils');
  });

  it('parses TypeScript external imports as non-local', () => {
    const code = `import React from 'react';
import { express } from 'express';`;
    const imports = parseImports(code, 'typescript');
    expect(imports).toHaveLength(2);
    expect(imports[0].isLocal).toBe(false);
    expect(imports[1].isLocal).toBe(false);
  });

  it('parses TypeScript require()', () => {
    const code = `const config = require('./config');`;
    const imports = parseImports(code, 'typescript');
    expect(imports).toHaveLength(1);
    expect(imports[0].source).toBe('./config');
  });

  it('parses Python imports', () => {
    const code = `import os
import json
from myapp.models import User
from myapp.views import home`;
    const imports = parseImports(code, 'python');
    expect(imports.some((i) => i.source === 'os')).toBe(true);
    expect(imports.some((i) => i.source === 'myapp')).toBe(true);
  });

  it('parses Go imports', () => {
    const code = `import (
    "fmt"
    "github.com/user/project/pkg/util"
    "./local"
)`;
    const imports = parseImports(code, 'go');
    expect(imports.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty for unknown language', () => {
    expect(parseImports('something', null)).toEqual([]);
  });

  it('deduplicates imports', () => {
    const code = `import { a } from './foo';
import { b } from './foo';`;
    const imports = parseImports(code, 'typescript');
    expect(imports).toHaveLength(1);
  });

  it('parses export re-exports (barrel files)', () => {
    const code = `export * from './utils';
export { foo, bar } from './helpers';
export type { Config } from './types';`;
    const imports = parseImports(code, 'typescript');
    expect(imports).toHaveLength(3);
    expect(imports.map((i) => i.source)).toEqual(['./utils', './helpers', './types']);
  });

  it('parses import * as namespace', () => {
    const code = `import * as utils from './utils';`;
    const imports = parseImports(code, 'typescript');
    expect(imports).toHaveLength(1);
    expect(imports[0].source).toBe('./utils');
  });

  it('resolves aliased imports as local', () => {
    const code = `import { Button } from '@/components/Button';
import React from 'react';`;
    const aliases = [{ prefix: '@/components/', target: 'src/components/' }];
    const imports = parseImports(code, 'typescript', aliases);
    const button = imports.find((i) => i.source.includes('components'));
    expect(button).toBeDefined();
    expect(button!.isLocal).toBe(true);
  });
});

describe('buildFileTree', () => {
  it('builds a nested directory tree', () => {
    const paths = ['src/app.ts', 'src/lib/utils.ts', 'src/lib/helpers.ts', 'README.md'];
    const tree = buildFileTree(paths);
    expect(tree.children.has('src')).toBe(true);
    expect(tree.children.has('README.md')).toBe(false);
    expect(tree.files).toContain('README.md');

    const srcNode = tree.children.get('src')!;
    expect(srcNode.children.has('lib')).toBe(true);
    expect(srcNode.files).toContain('app.ts');
  });
});

describe('parseTsConfigAliases', () => {
  it('parses paths from tsconfig.json', () => {
    const tsconfig = JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@/components/*': ['src/components/*'],
        },
      },
    });
    const aliases = parseTsConfigAliases(tsconfig, null);
    expect(aliases).toHaveLength(2);
    expect(aliases[0].prefix).toBe('@/');
    expect(aliases[0].target).toBe('src/');
  });

  it('parses imports from package.json', () => {
    const pkg = JSON.stringify({
      imports: {
        '#components/*': './src/components/*',
      },
    });
    const aliases = parseTsConfigAliases(null, pkg);
    expect(aliases).toHaveLength(1);
    expect(aliases[0].prefix).toBe('#components/');
    expect(aliases[0].target).toBe('src/components/');
  });

  it('returns empty for null input', () => {
    expect(parseTsConfigAliases(null, null)).toEqual([]);
  });

  it('handles invalid JSON gracefully', () => {
    expect(parseTsConfigAliases('not json', null)).toEqual([]);
    expect(parseTsConfigAliases(null, '{broken')).toEqual([]);
  });
});

describe('resolveAliasImport', () => {
  it('resolves @/ prefix alias', () => {
    const aliases = [{ prefix: '@/components/', target: 'src/components/' }];
    const result = resolveAliasImport('@/components/Button', aliases);
    expect(result).toBe('src/components/Button');
  });

  it('resolves @/ root alias', () => {
    const aliases = [{ prefix: '@/lib/', target: 'src/lib/' }];
    const result = resolveAliasImport('@/lib/utils', aliases);
    expect(result).toBe('src/lib/utils');
  });

  it('returns null when no alias matches', () => {
    const aliases = [{ prefix: '@/components/', target: 'src/components/' }];
    const result = resolveAliasImport('react', aliases);
    expect(result).toBeNull();
  });

  it('handles multiple aliases (first match wins)', () => {
    const aliases = [
      { prefix: '@/components/', target: 'src/components/' },
      { prefix: '@/', target: 'src/' },
    ];
    const result = resolveAliasImport('@/components/Button', aliases);
    expect(result).toBe('src/components/Button');
  });
});
