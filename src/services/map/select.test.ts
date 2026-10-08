import { describe, expect, it } from 'vitest';
import { breadthOrder, mapPriority, selectMapFile } from './select';

describe('selectMapFile', () => {
  it('takes TS/JS/Py/Go sources and the configs, not tests, vendored code or docs', () => {
    expect(['src/a.ts', 'src/a.test.ts', 'node_modules/x/index.js', 'README.md', 'pkg/main.py', 'tsconfig.json'].filter(selectMapFile)).toEqual(['src/a.ts', 'pkg/main.py', 'tsconfig.json']);
    expect(selectMapFile('go.mod')).toBe(true);
  });
});

describe('mapPriority', () => {
  it('reads configs, then sources, then other architecture files', () => {
    expect(['docker-compose.yml', 'src/a.ts', 'tsconfig.json', 'go.mod'].sort((a, b) => mapPriority(a) - mapPriority(b))).toEqual(['tsconfig.json', 'go.mod', 'src/a.ts', 'docker-compose.yml']);
  });
});

describe('breadthOrder', () => {
  it('spreads any prefix across folders instead of draining the first one', () => {
    const paths = ['a/1.ts', 'a/2.ts', 'a/3.ts', 'b/1.ts', 'c/d/1.ts', 'c/d/2.ts'];
    expect(breadthOrder(paths).slice(0, 3)).toEqual(['a/1.ts', 'b/1.ts', 'c/d/1.ts']);
    expect(breadthOrder(paths)).toHaveLength(6);
  });

  it('is deterministic whatever order the tree lists files in', () => {
    const paths = Array.from({ length: 200 }, (_, i) => `dir${i % 17}/f${i}.ts`);
    expect(breadthOrder([...paths].reverse())).toEqual(breadthOrder(paths));
  });

  it('puts every folder in the first N when N covers the folders', () => {
    const paths = Array.from({ length: 5000 }, (_, i) => `d${i % 100}/f${i}.ts`).concat(Array.from({ length: 100 }, (_, i) => `solo${i}/x.ts`));
    const dirs = new Set(breadthOrder(paths).slice(0, 200).map((p) => p.split('/')[0]));
    expect(dirs.size).toBe(200);
  });
});
