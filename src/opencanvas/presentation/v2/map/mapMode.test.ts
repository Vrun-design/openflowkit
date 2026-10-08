import { describe, expect, it } from 'vitest';
import { compile } from '../../../../dsl/compile';
import { fromArch } from '../../../../dsl/map/fromArch';
import { archModelFromJson } from '../../../../dsl/model/model';
import type { ScenePage } from '../../../domain/document/types';
import type { MapModel, MapNode } from '../../../../dsl/map/types';
import { BOX_BUDGET, fitsBudget, isDoubleClick, mapCamera, mapKeyAllowed, parentToClose, prune, sceneExtent, sceneFor, toggleBox } from './mapMode';

const TEXT = `architecture
model {
  system Shop {
    container Web
    container API { component Router }
  }
  external Stripe
}
views { view container of Shop }
`;
const arch = async () => archModelFromJson(((await compile(TEXT)).frame.metadata.dsl as { arch: { model: unknown } }).arch.model)!;
const key = (init: Partial<Parameters<typeof mapKeyAllowed>[0]>) =>
  mapKeyAllowed({ key: '', code: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init });

describe('map open and close', () => {
  it('opens a box with children, ignores a leaf, closes with everything inside', async () => {
    const model = fromArch(await arch());
    const shop = toggleBox(model, new Set(), 'shop');
    expect([...shop]).toEqual(['shop']);
    expect([...toggleBox(model, shop, 'shop.web')]).toEqual(['shop']);
    const deep = toggleBox(model, shop, 'shop.api');
    expect([...deep].sort()).toEqual(['shop', 'shop.api']);
    expect([...toggleBox(model, deep, 'shop')]).toEqual([]);
  });

  it('a click that changes nothing returns the very same set, so the caller can skip the relayout', async () => {
    const model = fromArch(await arch());
    const shop = new Set(['shop']);
    expect(toggleBox(model, shop, 'shop.web')).toBe(shop);
    const none = new Set<string>();
    expect(toggleBox(model, none, 'shop.web')).toBe(none);
    expect(toggleBox(model, none, 'nothing')).toBe(none);
    expect(toggleBox(model, none, 'shop')).not.toBe(none);
  });

  it('Escape closes the open parent of a box, never the root', async () => {
    const model = fromArch(await arch());
    const open = new Set(['shop', 'shop.api']);
    expect(parentToClose(model, open, 'shop.api.router')).toBe('shop.api');
    expect(parentToClose(model, open, 'shop')).toBeNull();
    expect(parentToClose(model, new Set(), 'shop.web')).toBeNull();
  });

  it('forgets open boxes an edit removed', async () => {
    const model = fromArch(await arch());
    expect([...prune(model, new Set(['shop', 'gone', 'shop.web']))]).toEqual(['shop']);
  });
});

describe('map budget, double-click guard and scene tag', () => {
  const wide = (children: number): MapModel => {
    const node = (id: string, kids: string[], parent: string | null): MapNode =>
      ({ id, kind: 'part', name: id, parent, children: kids, files: 0, loc: 0 });
    const ids = Array.from({ length: children }, (_, i) => `c${i}`);
    return {
      root: 'root', links: [], source: {}, stats: {},
      nodes: { root: node('root', ['big'], null), big: node('big', ids, 'root'), ...Object.fromEntries(ids.map((id) => [id, node(id, [], 'big')])) },
    } as unknown as MapModel;
  };

  it('refuses an open that would draw more boxes than the budget, and allows one at it', () => {
    expect(fitsBudget(wide(BOX_BUDGET - 1), new Set(['big']))).toBe(true);
    expect(fitsBudget(wide(BOX_BUDGET), new Set(['big']))).toBe(false);
    expect(fitsBudget(wide(BOX_BUDGET), new Set())).toBe(true);
  });

  it('a second click inside the window is a double-click, any box, and only a time check', () => {
    expect(isDoubleClick(1000, 1200)).toBe(true);
    expect(isDoubleClick(1000, 1400)).toBe(false);
    expect(isDoubleClick(Number.NEGATIVE_INFINITY, 0)).toBe(false);
  });

  it('shows a scene only while it matches the current model', () => {
    const empty = { id: 'map' } as ScenePage;
    const built = { id: 'built' } as ScenePage;
    const modelA = {};
    const modelB = {};
    expect(sceneFor({ model: modelA, page: built }, modelA, empty)).toBe(built);
    expect(sceneFor({ model: modelA, page: built }, modelB, empty)).toBe(empty);
    expect(sceneFor({ model: modelA, page: built }, null, empty)).toBe(empty);
    expect(sceneFor(null, modelA, empty)).toBe(empty);
  });
});

describe('map keys', () => {
  it('lets look, zoom, panel and undo keys through and swallows the editing ones', () => {
    for (const k of [{ key: 'm' }, { key: 'v' }, { key: ' ' }, { key: 'z', metaKey: true }, { key: '0', metaKey: true },
      { key: 'f', ctrlKey: true }, { key: '!', code: 'Digit1', shiftKey: true }, { key: 'Dead', code: 'KeyM', altKey: true }]) {
      expect(key(k), JSON.stringify(k)).toBe(true);
    }
    for (const k of [{ key: 'Delete' }, { key: 'Backspace' }, { key: 'r' }, { key: 'ArrowLeft' }, { key: 'q' },
      { key: 'a', metaKey: true }, { key: 'v', metaKey: true }, { key: 'x', metaKey: true }, { key: 'd', metaKey: true },
      { key: 'Dead', code: 'KeyA', altKey: true }, { key: 'Delete', metaKey: true, shiftKey: true }]) {
      expect(key(k), JSON.stringify(k)).toBe(false);
    }
  });
});

describe('map camera', () => {
  const node = (x: number, y: number, w: number, h: number, parentId: string | null) =>
    ({ parentId, transform: { translation: { x, y } }, size: { width: w, height: h } });
  const page = (nodes: unknown[]) => ({ nodes }) as unknown as ScenePage;

  it('is the union of the top-level boxes only', () => {
    expect(sceneExtent(page([node(10, 20, 100, 50, null), node(200, 0, 50, 50, null), node(5, 5, 10, 10, 'a')])))
      .toEqual({ x: 10, y: 0, width: 240, height: 70 });
    expect(sceneExtent(page([]))).toBeNull();
  });

  it('fits a small map readably and starts a big one at the top-left at 0.6', () => {
    const free = { left: 0, width: 1200, height: 800 };
    expect(mapCamera({ x: 0, y: 0, width: 800, height: 400 }, free).zoom).toBeGreaterThanOrEqual(0.6);
    const big = mapCamera({ x: 100, y: 50, width: 6000, height: 4000 }, free);
    expect(big.zoom).toBe(0.6);
    expect(big.x).toBeCloseTo(48 - 100 * 0.6);
  });
});
