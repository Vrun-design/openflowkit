import { describe, expect, it } from 'vitest';
import {
  archModelFromJson, archModelOfPage, archViewIdOfPage, childViewOf, createArchIndex,
  deriveImpliedRelations, elementAncestors, elementDescendantIds, elementPathRef, flattenFlowSteps,
  hasChildren, nearestShown, placedElementId, resolveElementRef, viewsOf,
} from './model';
import { modelTags } from './predicates';
import type { ArchModel } from './types';
import type { SceneNode, ScenePage } from '../../opencanvas/domain/document/types';

const ELEMENT = { tags: [] as string[], links: [] as string[] };

const SHOP: ArchModel = {
  elements: [
    { id: 'customer', kind: 'person', name: 'Customer', parent: null, ...ELEMENT },
    { id: 'shop', kind: 'system', name: 'Shop', parent: null, tags: ['core'], links: [] },
    { id: 'shop.web', kind: 'container', name: 'Web', parent: 'shop', tech: 'React', ...ELEMENT },
    { id: 'shop.api', kind: 'container', name: 'API', parent: 'shop', tech: 'Go', ...ELEMENT },
    { id: 'shop.api.orders', kind: 'component', name: 'Orders', parent: 'shop.api', ...ELEMENT },
    { id: 'stripe', kind: 'external', name: 'Stripe', parent: null, tags: ['payments'], links: [] },
  ],
  relations: [
    { id: 'rel:customer->shop.web', from: 'customer', to: 'shop.web', label: 'uses', tags: [] },
    { id: 'rel:shop.api->stripe', from: 'shop.api', to: 'stripe', tags: [] },
  ],
  views: [
    { id: 'view:context:shop', kind: 'context', name: 'context of Shop', of: 'shop', rules: [] },
    { id: 'view:container:shop', kind: 'container', name: 'container of Shop', of: 'shop', rules: [] },
  ],
  flows: [],
};

describe('arch index', () => {
  it('walks children, descendants and ancestors', () => {
    const index = createArchIndex(SHOP);
    expect(index.byId.get('shop.web')?.tech).toBe('React');
    expect([...elementDescendantIds(index, 'shop')].sort()).toEqual(['shop.api', 'shop.api.orders', 'shop.web']);
    expect(elementAncestors(index, 'shop.api.orders')).toEqual(['shop.api', 'shop']);
    expect(hasChildren(index, index.byId.get('shop')!)).toBe(true);
    expect(hasChildren(index, index.byId.get('shop.web')!)).toBe(false);
  });

  it('resolves ids, relative refs, paths and unique names; ambiguous names stay unresolved', () => {
    const index = createArchIndex(SHOP);
    expect(resolveElementRef(index, 'shop.api')?.id).toBe('shop.api');
    expect(resolveElementRef(index, 'API', 'shop')?.id).toBe('shop.api');
    expect(resolveElementRef(index, 'Web', 'shop.api')?.id).toBe('shop.web');
    expect(resolveElementRef(index, 'Shop.Web')?.id).toBe('shop.web');
    expect(resolveElementRef(index, 'Stripe')?.id).toBe('stripe');
    expect(resolveElementRef(index, 'Nope')).toBeNull();
    const ambiguous = createArchIndex({
      ...SHOP,
      elements: [
        ...SHOP.elements,
        { id: 'shop2', kind: 'system', name: 'Shop 2', parent: null, ...ELEMENT },
        { id: 'shop2.web', kind: 'container', name: 'Web', parent: 'shop2', ...ELEMENT },
      ],
    });
    expect(resolveElementRef(ambiguous, 'Web')).toBeNull();
    expect(resolveElementRef(ambiguous, 'Web', 'shop2')?.id).toBe('shop2.web');
    expect(resolveElementRef(ambiguous, 'Shop.Web')?.id).toBe('shop.web');
  });

  it('derives implied relations between ancestors unless an explicit one exists', () => {
    // A container in one system calling a container in another implies the system pair.
    const twoSystems = createArchIndex({
      ...SHOP,
      relations: [
        ...SHOP.relations,
        { id: 'rel:shop.api->shop2.web', from: 'shop.api', to: 'shop2.web', label: 'calls', tags: [] },
      ],
      elements: [...SHOP.elements, { id: 'shop2', kind: 'system', name: 'Shop 2', parent: null, ...ELEMENT },
        { id: 'shop2.web', kind: 'container', name: 'Shop 2 web', parent: 'shop2', ...ELEMENT }],
    });
    const implied = deriveImpliedRelations(twoSystems);
    expect(implied.map((relation) => `${relation.from}->${relation.to}`)).toContain('shop->shop2');
    expect(implied.every((relation) => relation.implied)).toBe(true);
    // Derived relations are never stored on the model itself.
    expect(twoSystems.model.relations.some((relation) => relation.implied)).toBe(false);
    // An explicit system-to-system relation blocks the implied one.
    const explicit = createArchIndex({
      ...twoSystems.model,
      relations: [...twoSystems.model.relations, { id: 'rel:shop->shop2', from: 'shop', to: 'shop2', tags: [] }],
    });
    expect(deriveImpliedRelations(explicit).some((relation) => relation.from === 'shop' && relation.to === 'shop2')).toBe(false);
    // A relation with no parent on either side implies nothing.
    expect(deriveImpliedRelations(createArchIndex(SHOP)).some((relation) => relation.from === 'shop' && relation.to === 'stripe')).toBe(false);
  });

  it('projects a relation onto the nearest shown ancestor', () => {
    const index = createArchIndex(SHOP);
    const shown = new Set(['customer', 'shop']);
    expect(nearestShown(index, 'shop.web', shown)).toBe('shop');
    expect(nearestShown(index, 'customer', shown)).toBe('customer');
    expect(nearestShown(index, 'stripe', shown)).toBeNull();
  });

  it('finds views for an element and its canonical child view', () => {
    const index = createArchIndex(SHOP);
    expect(viewsOf(index, 'shop').map((view) => view.id)).toEqual(['view:context:shop', 'view:container:shop']);
    expect(childViewOf(index, 'shop')?.id).toBe('view:container:shop');
    expect(childViewOf(index, 'shop.web')).toBeUndefined();
    expect(elementPathRef(index, 'shop.api')).toBe('Shop.API');
  });

  it('collects tags for the perspective filter', () => {
    expect(modelTags(SHOP)).toEqual(['core', 'payments']);
  });
});

describe('placed element ids', () => {
  it('reads the element id off a placed node and ignores everything else', () => {
    const node = (metadata: unknown) => ({ metadata }) as unknown as SceneNode;
    expect(placedElementId(node({ model: { elementId: 'shop.web' } }))).toBe('shop.web');
    expect(placedElementId(node({ model: { relationId: 'r' } }))).toBeNull();
    expect(placedElementId(node({ model: 'nope' }))).toBeNull();
    expect(placedElementId(node({}))).toBeNull();
  });
});

describe('model json', () => {
  it('round-trips a model and drops malformed entries', () => {
    const json = JSON.parse(JSON.stringify(SHOP)) as unknown;
    expect(archModelFromJson(json)).toEqual(SHOP);
    expect(archModelFromJson({ elements: [SHOP.elements[0], { id: 'x' }], relations: [], views: [] })?.elements).toHaveLength(1);
    expect(archModelFromJson('nope')).toBeNull();
    expect(archModelFromJson({ elements: [], relations: [] })).toBeNull();
  });

  it('reads the model and view id off a view page', () => {
    const page = {
      id: 'page-1', name: 'Container', diagramKind: 'architecture', layers: [], connectors: [], metadata: {}, extensions: {},
      nodes: [{
        id: 'dsl-abc', kind: 'frame', parentId: null, layerId: 'default', zIndex: 0,
        transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        size: { width: 10, height: 10 }, content: {}, appearance: {}, ports: [], extensions: {},
        metadata: { dsl: { family: 'architecture', arch: { model: SHOP, view: 'view:container:shop' } } },
      }],
    } as unknown as ScenePage;
    expect(archModelOfPage(page)?.elements).toHaveLength(SHOP.elements.length);
    expect(archViewIdOfPage(page)).toBe('view:container:shop');
  });

  it('flattens flow steps depth-first for playback', () => {
    const flow = {
      id: 'flow:checkout', name: 'Checkout',
      steps: [
        { id: 's1', kind: 'intro' as const, label: 'Start', tags: [] },
        {
          id: 's2', kind: 'alternate' as const, tags: [], label: 'paid',
          branches: [
            { label: 'paid', steps: [{ id: 's3', kind: 'message' as const, from: 'a', to: 'b', tags: [] }] },
            { label: 'failed', steps: [{ id: 's4', kind: 'info' as const, tags: [] }] },
          ],
        },
      ],
    };
    const flat = flattenFlowSteps(flow);
    expect(flat.map((entry) => entry.step.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(flat[2]?.depth).toBe(1);
    expect(flat[3]?.branch).toBe('failed');
  });
});
