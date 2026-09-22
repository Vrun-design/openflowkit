import { describe, expect, it } from 'vitest';
import { createArchIndex } from './model';
import { selectViewElements } from './predicates';
import type { ArchModel, ArchView } from './types';

const model: ArchModel = {
  elements: [
    { id: 'shop', kind: 'system', name: 'Shop', parent: null, tags: [], links: [] },
    { id: 'shop.api', kind: 'container', name: 'API', parent: 'shop', tags: [], links: [] },
    { id: 'shop.db', kind: 'store', name: 'DB', parent: 'shop', tags: ['legacy'], links: [] },
    { id: 'shop.api.router', kind: 'component', name: 'Router', parent: 'shop.api', tags: [], links: [] },
    { id: 'crm', kind: 'external', name: 'CRM', parent: null, tags: [], links: [] },
  ],
  relations: [{ id: 'rel:shop.api->crm', from: 'shop.api', to: 'crm', tags: [] }],
  views: [],
  flows: [],
};
const index = createArchIndex(model);
const view = (partial: Partial<ArchView>): ArchView => ({ id: 'v', kind: 'custom', name: 'v', rules: [], ...partial });

describe('selectViewElements', () => {
  it('a custom view shows exactly the included leaves, parent or not', () => {
    const shown = selectViewElements(index, view({ rules: [
      { op: 'include', subject: 'Shop.API' }, { op: 'include', subject: 'Shop.DB' },
    ] })).shown;
    expect([...shown].sort()).toEqual(['shop.api', 'shop.db']);
  });

  it('excluding a boundary takes its children with it', () => {
    const shown = selectViewElements(index, view({ kind: 'container', of: 'shop', rules: [{ op: 'exclude', subject: 'Shop' }] })).shown;
    expect([...shown]).toEqual(['crm']);
  });

  it('a later include wins over an earlier exclude', () => {
    const shown = selectViewElements(index, view({ rules: [
      { op: 'include', subject: 'Shop.**' }, { op: 'exclude', subject: 'Shop.API' }, { op: 'include', subject: 'Shop.API' },
    ] })).shown;
    expect([...shown].sort()).toEqual(['shop', 'shop.api', 'shop.api.router', 'shop.db']);
  });

  it('where filters apply to wildcards and unknown subjects select nothing', () => {
    expect([...selectViewElements(index, view({ rules: [{ op: 'include', subject: 'Shop.*', where: { tag: 'legacy' } }] })).shown]).toEqual(['shop.db']);
    expect([...selectViewElements(index, view({ rules: [{ op: 'include', subject: 'Nope' }] })).shown]).toEqual([]);
  });
});
