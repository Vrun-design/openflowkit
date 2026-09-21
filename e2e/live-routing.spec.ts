// Slice 1.5 headed check: dragging a bound node around an obstacle reroutes
// live without crossing it and without side flicker.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; connectors: string[]; revision: number };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getDocument(): {
    pages: [{
      nodes: { id: string; transform: { translation: { x: number; y: number } } }[];
      connectors: { id: string; source: { nodeId: string | null; portId: string | null }; target: { nodeId: string | null; portId: string | null } }[];
    }];
  };
  getLiveConnectorSamples(id: string): { x: number; y: number }[] | null;
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const nodeRect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
const samples = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((connectorId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getLiveConnectorSamples(connectorId), id);

function crossesBox(pts: { x: number; y: number }[], box: { x: number; y: number; width: number; height: number }, pad: number): boolean {
  const x0 = box.x - pad;
  const y0 = box.y - pad;
  const x1 = box.x + box.width + pad;
  const y1 = box.y + box.height + pad;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a.y === b.y) {
      if (a.y > y0 && a.y < y1 && Math.max(a.x, b.x) > x0 && Math.min(a.x, b.x) < x1) return true;
    } else if (a.x === b.x) {
      if (a.x > x0 && a.x < x1 && Math.max(a.y, b.y) > y0 && Math.min(a.y, b.y) < y1) return true;
    } else {
      return true;
    }
  }
  return false;
}

test('dragging a bound node around an obstacle reroutes without crossing', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByTestId('v2-canvas');
  await canvas.focus();
  const emptyPoint = (x: number, y: number) => page.evaluate(({ px, py }) => {
    const at = (ax: number, ay: number) => {
      const el = document.elementFromPoint(ax, ay);
      return el instanceof HTMLCanvasElement && el.closest('[data-testid="v2-canvas"]')
        ? { x: ax, y: ay } : null;
    };
    return at(px, py) ?? at(px + 60, py) ?? at(px, py + 60) ?? (() => { throw new Error('no empty point'); })();
  }, { px: x, py: y });

  const ids: string[] = [];
  for (const [x, y] of [[300, 350], [550, 350], [800, 350]]) {
    await page.keyboard.press('r');
    const p = await emptyPoint(x, y);
    await page.mouse.click(p.x, p.y);
    await expect.poll(async () => (await state(page)).nodes.length).toBe(ids.length + 1);
    await page.keyboard.press('Escape');
    ids.push((await state(page)).nodes.at(-1)!);
  }
  const [a, b, c] = ids;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;

  // Bind A→C from A's right handle, dropping on C's left half.
  const rectA = (await nodeRect(page, a))!;
  const rectC = (await nodeRect(page, c))!;
  await page.mouse.move(box.x + rectA.x + rectA.width + 22, box.y + rectA.y + rectA.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + rectC.x + 20, box.y + rectC.y + rectC.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  const edgeId = (await state(page)).connectors[0];
  const edge = (await doc(page)).pages[0].connectors[0];
  expect(edge.source).toMatchObject({ nodeId: a, portId: null });
  expect(edge.target).toMatchObject({ nodeId: c, portId: null });

  // Camera never moves here: screen = world + constant offset.
  const worldA = (await doc(page)).pages[0].nodes.find((n) => n.id === a)!.transform.translation;
  const offset = { x: rectA.x - worldA.x, y: rectA.y - worldA.y };
  const toScreen = (pts: { x: number; y: number }[]) =>
    pts.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }));
  const exitSide = (s0: { x: number; y: number }, r: { x: number; y: number; width: number; height: number }) => {
    if (Math.abs(s0.x - r.x) < 2) return 'left';
    if (Math.abs(s0.x - (r.x + r.width)) < 2) return 'right';
    if (Math.abs(s0.y - r.y) < 2) return 'top';
    if (Math.abs(s0.y - (r.y + r.height)) < 2) return 'bottom';
    return 'free';
  };

  // Circle A around B in 12 steps, sampling the live route each stop.
  const rectB = (await nodeRect(page, b))!;
  const center = { x: box.x + rectB.x + rectB.width / 2, y: box.y + rectB.y + rectB.height / 2 };
  const start = (await nodeRect(page, a))!;
  await page.mouse.move(box.x + start.x + start.width / 2, box.y + start.y + start.height / 2);
  await page.mouse.down();
  const sides: string[] = [];
  const steps = 12;
  for (let i = 1; i <= steps; i += 1) {
    const angle = Math.PI + (i / steps) * Math.PI * 2;
    await page.mouse.move(center.x + 190 * Math.cos(angle), center.y + 190 * Math.sin(angle), { steps: 3 });
    await page.waitForTimeout(150);
    const live = (await samples(page, edgeId))!;
    expect(live.length).toBeGreaterThan(1);
    const screen = toScreen(live);
    const obstacle = await nodeRect(page, b)!;
    expect(crossesBox(screen, obstacle, 12)).toBe(false);
    const mover = await nodeRect(page, a)!;
    sides.push(exitSide(screen[0], mover));
  }
  await page.mouse.up();

  let switches = 0;
  for (let i = 1; i < sides.length; i += 1) if (sides[i] !== sides[i - 1]) switches += 1;
  expect(switches).toBeLessThanOrEqual(4);
  const settled = (await doc(page)).pages[0].connectors[0];
  expect(settled.source).toMatchObject({ nodeId: a, portId: null });
  expect(settled.target).toMatchObject({ nodeId: c, portId: null });
}, { timeout: 120_000 });
