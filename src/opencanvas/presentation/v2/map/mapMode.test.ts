import { describe, expect, it } from 'vitest';
import { compile } from '../../../../dsl/compile';
import { fromArch } from '../../../../dsl/map/fromArch';
import { archModelFromJson } from '../../../../dsl/model/model';
import type { ScenePage } from '../../../domain/document/types';
import type { MapModel, MapNode } from '../../../../dsl/map/types';
import { READABLE } from '../../../application/map/geometry';
import { MAP_BOX_BUDGET as BOX_BUDGET } from '../../../application/map/mapNavigation';
import { clearOfPanel, nudgeInto, panToUncover, fitsBudget, freeArea, inView, nearestDrawn, isDoubleClick, isEditKey, landOn, mapCamera, mapKeyAllowed, parentToClose, prune, sceneExtent, sceneFor, startOpen, toggleBox } from './mapMode';

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

  it('starts from the remembered set only while it fits the budget, else the preset', () => {
    const preset = new Set<string>();
    const fits = new Set(['big', 'gone']);
    expect([...startOpen(wide(10), fits, preset)]).toEqual(['big']);
    expect(startOpen(wide(BOX_BUDGET), fits, preset)).toBe(preset);
    expect(startOpen(wide(10), null, preset)).toBe(preset);
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
    // An edit makes a new model on the same page: the old scene stays up until the new one is laid out.
    expect(sceneFor({ model: modelA, page: built, lineage: 'p1' }, modelB, empty, 'p1')).toBe(built);
    expect(sceneFor({ model: modelA, page: built, lineage: 'p1' }, modelB, empty, 'p2')).toBe(empty);
    expect(sceneFor({ model: modelA, page: built }, modelB, empty, 'p1')).toBe(empty);
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
      { key: 'Dead', code: 'KeyA', altKey: true }]) {
      expect(key(k), JSON.stringify(k)).toBe(false);
    }
    // Remove from model is a model edit, which Map allows (the panel offers it too).
    expect(key({ key: 'Delete', metaKey: true, shiftKey: true })).toBe(true);
    expect(key({ key: 'Backspace', ctrlKey: true, shiftKey: true })).toBe(true);
  });
  it('tells an edit attempt (delete, typing, a tool, cut, paste) from a key Map just has no use for', () => {
    const edit = (init: Partial<Parameters<typeof isEditKey>[0]>) =>
      isEditKey({ key: '', code: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...init });
    for (const k of [{ key: 'Delete' }, { key: 'Backspace' }, { key: 'r' }, { key: 'A', shiftKey: true }, { key: 'v', metaKey: true },
      { key: 'x', ctrlKey: true }, { key: 'd', metaKey: true }, { key: 'g', metaKey: true }]) expect(edit(k), JSON.stringify(k)).toBe(true);
    for (const k of [{ key: 'ArrowLeft' }, { key: ' ' }, { key: 'Tab' }, { key: 'a', metaKey: true }, { key: 'Dead', code: 'KeyA', altKey: true },
      { key: 'Shift', shiftKey: true }, { key: 'F5' }]) expect(edit(k), JSON.stringify(k)).toBe(false);
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

  it('fits a small map readably and starts a big one at the top-left at the readable floor', () => {
    const free = { left: 0, top: 56, width: 1200, height: 672 };
    expect(mapCamera({ x: 0, y: 0, width: 800, height: 400 }, free).zoom).toBeGreaterThanOrEqual(READABLE);
    const big = mapCamera({ x: 100, y: 50, width: 6000, height: 4000 }, free);
    expect(big.zoom).toBe(READABLE);
    expect(big.x).toBeCloseTo(48 - 100 * READABLE);
  });

  it('lands on the whole map when it is readable, else on the box that changed at 0.6 or more, wherever the map starts', () => {
    const free = { left: 100, top: 56, width: 1200, height: 672 };
    const small = landOn({ x: 20, y: 30, width: 800, height: 400 }, { x: 20, y: 30, width: 100, height: 50 }, free);
    expect(small.zoom).toBeGreaterThanOrEqual(READABLE);
    // Everything fits: the map's centre is the free canvas's centre, even though the map does not start at the origin.
    expect(small.x + (20 + 400) * small.zoom).toBeCloseTo(free.left + free.width / 2);
    const extent = { x: 500, y: 300, width: 6000, height: 4000 };
    const focus = { x: 3000, y: 2000, width: 400, height: 200 };
    const big = landOn(extent, focus, free);
    expect(big.zoom).toBeGreaterThanOrEqual(READABLE);
    // The focus box is centred in the free canvas.
    expect(big.x + (focus.x + focus.width / 2) * big.zoom).toBeCloseTo(free.left + free.width / 2);
  });

  it('shows the header and first row of a box too big to fit, at the floor, never smaller', () => {
    const free = { left: 100, top: 56, width: 1200, height: 672 };
    const extent = { x: 500, y: 300, width: 6000, height: 4000 };
    const huge = { x: 3000, y: 2000, width: 3000, height: 1800 };
    const cam = landOn(extent, huge, free);
    expect(cam.zoom).toBe(READABLE);
    // Its top-left corner sits at the top-left of the free canvas (below the top bar), so the title is on screen.
    expect(cam.x + huge.x * cam.zoom).toBeCloseTo(free.left + 48);
    expect(cam.y + huge.y * cam.zoom).toBeCloseTo(free.top + 48);
  });

  it('keeps the zoom and pans minimally when the opened box fits; zooms out (not below the floor) when it does not', () => {
    const free = { left: 100, top: 56, width: 1200, height: 672 };
    const extent = { x: 0, y: 0, width: 6000, height: 4000 };
    const cam = { zoom: 1, x: 0, y: 0 };
    // Fully visible in the free area (screen x 100..1300, y 56..728): no move at all, and the zoom is never raised.
    const seen = { x: 400, y: 200, width: 200, height: 100 };
    expect(landOn(extent, seen, free, cam)).toEqual(cam);
    // Cut off at the bottom: only y changes, by what brings the box inside with its margin.
    const low = { x: 400, y: 650, width: 200, height: 150 };
    const panned = landOn(extent, low, free, cam);
    expect(panned.zoom).toBe(1);
    expect(panned.x).toBe(0);
    expect(panned.y + (650 + 150)).toBeCloseTo(56 + 672 - 24);
    // Too wide for the free area at this zoom: zoomed out to fit, within the floor.
    const wide = { x: 0, y: 100, width: 1300, height: 200 };
    const out = landOn(extent, wide, free, cam);
    expect(out.zoom).toBeLessThan(1);
    expect(out.zoom).toBeGreaterThanOrEqual(READABLE);
    expect(out.x + wide.x * out.zoom).toBeGreaterThanOrEqual(free.left);
    expect(out.x + (wide.x + wide.width) * out.zoom).toBeLessThanOrEqual(free.left + free.width);
  });

  it('lands inside the free area, never under the chrome that measured it', () => {
    const size = { width: 1440, height: 1000 };
    // Bar ends at 66, rail starts at 1373, controls start at 920, the Model panel leaves x 0..1100.
    const free = freeArea(size, { left: 0, right: 1100 }, { top: 66, rail: 1373, bottom: 920 });
    expect(free).toEqual({ left: 0, top: 74, width: 1100, height: 838 });
    const noPanel = freeArea(size, { left: 0, right: 1440 }, { top: 66, rail: 1373, bottom: 920 });
    expect(noPanel.left + noPanel.width).toBe(1373 - 8);
    expect(freeArea(size, { left: 0, right: 1440 }, {})).toEqual({ left: 0, top: 0, width: 1440, height: 1000 });
    // A phone: the chrome would leave a sliver, so it is ignored.
    expect(freeArea({ width: 390, height: 844 }, { left: 0, right: 390 }, { top: 66, rail: 40, bottom: 800 }).width).toBe(390);
    // A landing with no box in view starts at the free area's top-left, below the bar.
    const cam = mapCamera({ x: 0, y: 0, width: 6000, height: 4000 }, noPanel);
    expect(cam.y).toBe(noPanel.top + 48);
  });
});

describe('inView', () => {
  const free = { left: 0, top: 50, width: 1000, height: 600 };
  const cam = { zoom: 1, x: 0, y: 0 };
  it('is true while the whole box is inside the free area, false once any edge is out', () => {
    expect(inView({ x: 10, y: 60, width: 100, height: 100 }, cam, free)).toBe(true);
    expect(inView({ x: 950, y: 60, width: 100, height: 100 }, cam, free)).toBe(false);
    expect(inView({ x: 10, y: 20, width: 100, height: 100 }, cam, free)).toBe(false);
  });
  it('follows the camera, and a box bigger than the free area counts once its top-left is in', () => {
    expect(inView({ x: 10, y: 60, width: 100, height: 100 }, { zoom: 2, x: 900, y: 0 }, free)).toBe(false);
    expect(inView({ x: 10, y: 60, width: 3000, height: 3000 }, cam, free)).toBe(true);
  });
});

describe('nearestDrawn', () => {
  it('picks the closest drawn box around a vanished one, never the root, null when none', async () => {
    const model = fromArch(await arch());
    expect(nearestDrawn(model, 'shop.api.router', new Set(['shop', 'shop.api']))).toBe('shop.api');
    expect(nearestDrawn(model, 'shop.api.router', new Set(['shop']))).toBe('shop');
    expect(nearestDrawn(model, 'shop.api.router', new Set())).toBeNull();
    expect(nearestDrawn(model, 'shop', new Set())).toBeNull();
  });
});

describe('nudgeInto', () => {
  const free = { left: 0, top: 50, width: 700, height: 600 };
  const cam = { zoom: 1, x: 0, y: 0 };
  it('is null while the box is inside the free area with its margin', () => {
    expect(nudgeInto({ x: 100, y: 100, width: 100, height: 100 }, cam, free)).toBeNull();
  });
  it('pans the least it takes and keeps the zoom', () => {
    const out = nudgeInto({ x: 650, y: 100, width: 100, height: 100 }, { zoom: 2, x: -500, y: 0 }, free)!;
    expect(out.zoom).toBe(2);
    expect(out.y).toBe(0);
    // 650*2-500 = 800 start, 1000 end: moved left until the end is 16px inside the 700 edge.
    expect(out.x).toBe(-500 - (1000 - (700 - 16)));
  });
  it('aligns the top-left of a box larger than the free area', () => {
    const out = nudgeInto({ x: 300, y: 400, width: 2000, height: 2000 }, cam, free)!;
    expect(out).toEqual({ zoom: 1, x: 16 - 300, y: 66 - 400 });
  });
});

describe('panToUncover', () => {
  const free = { left: 80, top: 50, width: 700, height: 600 };
  const cam = { zoom: 1, x: 0, y: 0 };
  it('keeps the camera for a box in full view, even inside the margin by the chrome (CI flake 10-09)', () => {
    expect(panToUncover({ x: 84, y: 100, width: 100, height: 100 }, cam, free)).toBeNull();
  });
  it('pans a box the chrome covers clear of it, margin included', () => {
    expect(panToUncover({ x: 60, y: 100, width: 100, height: 100 }, cam, free)).toEqual({ zoom: 1, x: 80 + 16 - 60, y: 0 });
  });
});

describe('clearOfPanel', () => {
  const cam = { zoom: 1, x: 0, y: 0 };
  const before = { left: 0, top: 50, width: 1400, height: 800 };
  const left = { ...before, left: 300, width: 1100 };
  const both = { ...before, left: 300, width: 800 };
  const box = { x: 100, y: 200, width: 200, height: 100 };
  it('pans the content that was fully visible clear of a panel that now covers it, keeping the zoom', () => {
    const out = clearOfPanel({ content: box, cam, before, seen: before, after: left })!;
    expect(out).toEqual({ zoom: 1, x: 300 + 16 - 100, y: 0 });
  });
  it('keeps the selection clear, not the content', () => {
    const picked = { x: 1050, y: 200, width: 100, height: 100 };
    const out = clearOfPanel({ selection: picked, content: box, cam, before, seen: before, after: both })!;
    expect(out).toEqual({ zoom: 1, x: 1084 - 1150, y: 0 });
  });
  it('does nothing when the content was already partly hidden or the panel closed', () => {
    expect(clearOfPanel({ content: { ...box, x: -50 }, cam, before, seen: before, after: left })).toBeNull();
    expect(clearOfPanel({ content: box, cam, before: left, seen: left, after: before })).toBeNull();
    expect(clearOfPanel({ selection: { ...box, x: 0 }, cam, before: left, seen: left, after: before })).toBeNull();
  });
  it('aligns content that no longer fits to the free area start, and judges "seen" without the tool rail', () => {
    const wide = { x: 40, y: 200, width: 1200, height: 100 };
    const rail = { ...before, left: 100, width: 1300 };
    expect(clearOfPanel({ content: wide, cam, before: rail, seen: before, after: { ...rail, left: 300, width: 800 } })).toEqual({ zoom: 1, x: 300 + 16 - 40, y: 0 });
    expect(clearOfPanel({ content: wide, cam, before: rail, seen: rail, after: { ...rail, left: 300, width: 800 } })).toBeNull();
  });
  it('does nothing without content or selection', () => {
    expect(clearOfPanel({ cam, before, seen: before, after: left })).toBeNull();
  });
});
