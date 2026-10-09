import { describe, expect, it } from 'vitest';
import type { MapModel, MapNode } from '../../../../dsl/map/types';
import { mapPathOf } from './mapPath';

const node = (id: string, parent: string | null, children: string[], kind: MapNode['kind'] = 'part'): MapNode =>
  ({ id, kind, name: id.toUpperCase(), parent, children, files: 1, loc: 0 });
const model = {
  root: '#model',
  nodes: {
    '#model': node('#model', null, ['shop', 'shop#more']),
    shop: node('shop', '#model', ['shop.api']),
    'shop.api': node('shop.api', 'shop', []),
    'shop#more': node('shop#more', '#model', ['shop#more/a'], 'more'),
    'shop#more/a': node('shop#more/a', 'shop#more', ['late'], 'group'),
    late: node('late', 'shop#more/a', []),
  },
} as unknown as MapModel;

describe('mapPathOf', () => {
  it('lists ancestors then the box, root excluded', () => {
    expect(mapPathOf(model, 'shop.api')).toEqual([{ id: 'shop', label: 'SHOP' }, { id: 'shop.api', label: 'SHOP.API' }]);
    expect(mapPathOf(model, 'shop')).toEqual([{ id: 'shop', label: 'SHOP' }]);
  });
  it('is empty for nothing, the root, unknown ids and synthetic boxes', () => {
    expect(mapPathOf(model, null)).toEqual([]);
    expect(mapPathOf(model, '#model')).toEqual([]);
    expect(mapPathOf(model, 'nope')).toEqual([]);
    expect(mapPathOf(model, 'shop#more')).toEqual([]);
    expect(mapPathOf(model, 'shop#more/a')).toEqual([]);
  });
  it('skips the fold boxes between a folded element and its owner', () => {
    expect(mapPathOf(model, 'late')).toEqual([{ id: 'late', label: 'LATE' }]);
  });
});
