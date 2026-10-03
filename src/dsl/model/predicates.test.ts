import { describe, expect, it } from 'vitest';
import { createArchIndex } from './model';
import { projectRelations, selectViewElements } from './predicates';
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

describe('projectRelations on a deployment view', () => {
  it('draws a model relation between every instance of its endpoints, components through their container', () => {
    const element = (id: string, kind: ArchModel['elements'][number]['kind'], parent: string | null, extra = {}) =>
      ({ id, kind, name: id, parent, tags: [], links: [], ...extra });
    const model: ArchModel = {
      elements: [
        element('shop', 'system', null), element('shop.api', 'container', 'shop'), element('shop.api.auth', 'component', 'shop.api'),
        element('shop.db', 'store', 'shop'),
        element('aws', 'node', null, { env: 'Prod' }),
        element('aws.api', 'instance', 'aws', { env: 'Prod', instanceOf: 'shop.api' }),
        element('aws.db', 'instance', 'aws', { env: 'Prod', instanceOf: 'shop.db' }),
        element('aws.replica', 'instance', 'aws', { env: 'Prod', instanceOf: 'shop.db' }),
      ],
      relations: [
        { id: 'rel:shop.api.auth->shop.db', from: 'shop.api.auth', to: 'shop.db', tags: [] },
        { id: 'rel:shop.db->shop.db', from: 'shop.db', to: 'shop.db', tags: [] },
      ],
      views: [], flows: [],
    } as unknown as ArchModel;
    const index = createArchIndex(model);
    const pairs = projectRelations(index, new Set(['aws', 'aws.api', 'aws.db', 'aws.replica'])).map(({ from, to }) => `${from}->${to}`);
    expect(pairs).toEqual(['aws.api->aws.db', 'aws.api->aws.replica']);
  });
});
