import { describe, expect, it } from 'vitest';
import { buildMap } from '../../../../dsl/map/build';
import { FIXTURE } from '../../../../dsl/map/fixture';
import { planMotion } from './planMotion';

const r = (x: number) => ({ x, y: 0, width: 10, height: 10, open: false });

describe('planMotion', () => {
  const m = buildMap(FIXTURE);
  it('grows new boxes from their nearest drawn ancestor and folds vanished ones into theirs', () => {
    const grow = planMotion(m, ['web', 'web/App.tsx'], new Map([['web', r(0)], ['web/App.tsx', r(5)]]), undefined, new Map([['web', r(0)]]));
    expect(grow.items.find((i) => i.id === 'web/App.tsx')).toMatchObject({ from: r(0), fade: 'in' });
    const fold = planMotion(m, ['web'], new Map([['web', r(0)]]), new Map([['web/App.tsx', r(5)]]), new Map([['web', r(0)], ['web/App.tsx', r(5)]]));
    expect(fold.items.find((i) => i.id === 'web/App.tsx')).toMatchObject({ to: r(0), fade: 'out' });
    expect(fold.leaving).toHaveLength(1);
  });
  it('forgets boxes with nowhere to go', () => {
    expect(planMotion(m, [], new Map(), undefined, new Map([['not/a/node', r(1)]])).gone).toEqual(['not/a/node']);
  });
});
