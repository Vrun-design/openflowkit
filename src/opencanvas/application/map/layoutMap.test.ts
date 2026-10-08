import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { buildMap } from '../../../dsl/map/build';
import { FIXTURE } from '../../../dsl/map/fixture';
import { layoutMap, type LayoutPorts } from './layoutMap';

const ports: LayoutPorts = {
  elk: new ELK() as unknown as LayoutPorts['elk'],
  measure: (t) => t.length * 6,
  sizeOf: () => ({ width: 200, height: 60 }),
};
const model = buildMap(FIXTURE);

describe('layoutMap', () => {
  it('lays out through the injected engine, measuring and sizes, with no DOM', async () => {
    const scene = await layoutMap(ports, model, new Set(['web']));
    expect(scene.laid.rects.get('web')?.open).toBe(true);
    expect(scene.laid.rects.get('server')).toMatchObject({ width: 200, height: 60, open: false });
    expect(scene.edges.length).toBe(scene.total - scene.minor);
  });

  it('is the same twice, and showAll draws the minor arrows too', async () => {
    const open = new Set(['web', 'server', 'server/routes']);
    const a = await layoutMap(ports, model, open);
    expect([...(await layoutMap(ports, model, open)).laid.rects]).toEqual([...a.laid.rects]);
    expect((await layoutMap(ports, model, open, [], true)).edges).toHaveLength(0);
    expect((await layoutMap(ports, model, open, undefined, true)).edges.length).toBe(a.total);
  });
});
