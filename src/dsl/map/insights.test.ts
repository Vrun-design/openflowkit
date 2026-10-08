import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { FIXTURE } from './fixture';
import { insights } from './insights';

const model = buildMap(FIXTURE);

describe('insights', () => {
  it('finds parts that import each other at least three times each way', () => {
    expect(insights(model).twoWay).toEqual([{ a: 'server', b: 'web', ab: 3, ba: 3 }]);
    expect(insights(model, { minPair: 4 }).twoWay).toEqual([]);
  });

  it('counts a pair relative to a and b, not busier first', () => {
    const m = buildMap({
      files: [{ path: 'a/x.ts', loc: 1 }, { path: 'b/y.ts', loc: 1 }],
      imports: [1, 2, 3, 4, 5].map((line) => ({ from: 'a/x.ts', to: 'b/y.ts', line, text: 'i' }))
        .concat([1, 2, 3].map((line) => ({ from: 'b/y.ts', to: 'a/x.ts', line, text: 'i' }))),
    });
    expect(insights(m).twoWay).toEqual([{ a: 'a', b: 'b', ab: 5, ba: 3 }]);
    const lines = (from: string, to: string, n: number) => Array.from({ length: n }, (_, i) => ({ from, to, line: i + 1, text: 'i' }));
    const flipped = buildMap({ files: [{ path: 'a/x.ts', loc: 1 }, { path: 'b/y.ts', loc: 1 }], imports: [...lines('a/x.ts', 'b/y.ts', 3), ...lines('b/y.ts', 'a/x.ts', 5)] });
    expect(insights(flipped).twoWay).toEqual([{ a: 'a', b: 'b', ab: 3, ba: 5 }]);
  });

  it('lists the largest files, biggest first', () => {
    expect(insights(model, { top: 2 }).largest).toEqual(['web/App.tsx', 'web/ui/Card.tsx']);
  });

  it('flags files nothing imports, but not entry points, tests or scripts', () => {
    const m = buildMap({
      files: [
        { path: 'src/index.ts', loc: 1 }, { path: 'src/used.ts', loc: 1 }, { path: 'src/orphan.ts', loc: 1 },
        { path: 'src/orphan.test.ts', loc: 1 }, { path: 'scripts/build.ts', loc: 1 }, { path: 'src/dir/in.ts', loc: 1 },
        { path: 'src/dir/also.ts', loc: 1 }, { path: 'src/x.d.ts', loc: 1 },
      ],
      imports: [
        { from: 'src/index.ts', to: 'src/used.ts', line: 1, text: 'a' },
        { from: 'src/index.ts', to: 'src/dir', line: 2, text: 'b', toKind: 'dir' },
      ],
    });
    expect(insights(m).unreferenced).toEqual(['src/orphan.ts']);
  });
});
