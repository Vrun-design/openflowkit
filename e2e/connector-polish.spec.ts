// Slice 1.6 headed checks: parallel edges, connector label, delete, style.
import { expect, test } from '@playwright/test';

type V2Api = {
  getState(): { nodes: string[]; connectors: string[]; revision: number };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getDocument(): {
    pages: [{
      nodes: { id: string; transform: { translation: { x: number; y: number } } }[];
      connectors: {
        id: string;
        source: { nodeId: string | null; portId: string | null };
        target: { nodeId: string | null; portId: string | null };
        labels: { text: string }[];
        appearance: Record<string, string | number>;
      }[];
    }];
  };
  getLiveConnectorSamples(id: string): { x: number; y: number }[] | null;
  getConnectorDebugSnapshot(): { labels: number };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const nodeRect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
const samples = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((connectorId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getLiveConnectorSamples(connectorId), id);
// Half-length point: index halving lands on endpoints for two-point lanes.
function laneMiddle(lane: { x: number; y: number }[]): { x: number; y: number } {
  let total = 0;
  for (let i = 1; i < lane.length; i += 1) {
    total += Math.hypot(lane[i].x - lane[i - 1].x, lane[i].y - lane[i - 1].y);
  }
  let walked = 0;
  for (let i = 1; i < lane.length; i += 1) {
    const seg = Math.hypot(lane[i].x - lane[i - 1].x, lane[i].y - lane[i - 1].y);
    if (walked + seg >= total / 2) {
      const ratio = seg === 0 ? 0 : (total / 2 - walked) / seg;
      return { x: lane[i - 1].x + (lane[i].x - lane[i - 1].x) * ratio, y: lane[i - 1].y + (lane[i].y - lane[i - 1].y) * ratio };
    }
    walked += seg;
  }
  return lane[lane.length - 1];
}

async function freshDoc(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.goto(`/#/d/${name}-${Date.now()}`);
  await page.waitForFunction(() => window.__V2__?.getState());
  await page.getByTestId('v2-canvas').focus();
}

async function emptyPoint(page: import('@playwright/test').Page, x: number, y: number) {
  return page.evaluate(({ px, py }) => {
    const at = (ax: number, ay: number) => {
      const el = document.elementFromPoint(ax, ay);
      return el instanceof HTMLCanvasElement && el.closest('[data-testid="v2-canvas"]')
        ? { x: ax, y: ay } : null;
    };
    return at(px, py) ?? at(px + 60, py) ?? at(px, py + 60) ?? (() => { throw new Error('no empty point'); })();
  }, { px: x, py: y });
}

async function makeNode(page: import('@playwright/test').Page, x: number, y: number, before: number): Promise<string> {
  await page.keyboard.press('r');
  const p = await emptyPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(before + 1);
  await page.keyboard.press('Escape');
  return (await state(page)).nodes.at(-1)!;
}

async function dragHandleToNode(
  page: import('@playwright/test').Page, fromId: string, toId: string, before: number
): Promise<string> {
  const r1 = (await nodeRect(page, fromId))!;
  const r2 = (await nodeRect(page, toId))!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.move(box.x + r1.x + r1.width + 22, box.y + r1.y + r1.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + r2.x + 20, box.y + r2.y + r2.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).connectors.length).toBe(before + 1);
  return (await state(page)).connectors.at(-1)!;
}

test('three parallel edges fan out with no overlap', async ({ page }) => {
  await freshDoc(page, 'cpolish-parallel');
  const a = await makeNode(page, 250, 350, 0);
  const b = await makeNode(page, 750, 350, 1);
  await dragHandleToNode(page, a, b, 0);
  await dragHandleToNode(page, a, b, 1);
  await dragHandleToNode(page, a, b, 2);
  const connectors = (await state(page)).connectors;
  expect(connectors).toHaveLength(3);
  const lanes = [];
  for (const id of connectors) lanes.push((await samples(page, id))!);
  // Lanes share endpoint ports by design; the fan separates their middles.
  const middles = lanes.map(laneMiddle);
  let minGap = Infinity;
  for (let i = 0; i < middles.length; i += 1) {
    for (let j = i + 1; j < middles.length; j += 1) {
      minGap = Math.min(minGap, Math.hypot(middles[i].x - middles[j].x, middles[i].y - middles[j].y));
    }
  }
  expect(minGap).toBeGreaterThanOrEqual(10);
});

test('double-click edits the connector label, Delete removes it, undo restores', async ({ page }) => {
  await freshDoc(page, 'cpolish-label');
  const a = await makeNode(page, 250, 350, 0);
  const b = await makeNode(page, 750, 350, 1);
  const edge = await dragHandleToNode(page, a, b, 0);
  // Dismiss the style bar: it anchors over the edge midpoint.
  await page.keyboard.press('Escape');
  const mid = laneMiddle((await samples(page, edge))!);
  const r = (await nodeRect(page, a))!;
  const world = (await doc(page)).pages[0].nodes.find((n) => n.id === a)!.transform.translation;
  const offset = { x: r.x - world.x, y: r.y - world.y };
  await page.mouse.dblclick(mid.x + offset.x, mid.y + offset.y);
  const editor = page.getByRole('textbox', { name: 'Edit connector label' });
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await page.keyboard.type('API');
  await page.keyboard.press('Enter');
  await expect.poll(async () =>
    (await doc(page)).pages[0].connectors[0].labels[0]?.text
  ).toBe('API');
  // The plate is the label: double-click it (14px above the line, off the stroke) to re-edit.
  await page.mouse.dblclick(mid.x + offset.x + 8, mid.y + offset.y - 14);
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue('API');
  const box = (await editor.boundingBox())!;
  expect(box.width).toBeLessThan(60);
  expect(Math.abs(box.x + box.width / 2 - (mid.x + offset.x))).toBeLessThan(3);
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  // The Pixi label comes back as soon as the editor closes, without a camera move.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getConnectorDebugSnapshot().labels)).toBe(1);
  const revision = (await state(page)).revision;
  await page.mouse.click(mid.x + offset.x, mid.y + offset.y);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  expect((await state(page)).revision).toBeGreaterThan(revision);
});

test('style bar sets dot markers and dashed line', async ({ page }) => {
  await freshDoc(page, 'cpolish-style');
  const a = await makeNode(page, 250, 350, 0);
  const b = await makeNode(page, 750, 350, 1);
  await dragHandleToNode(page, a, b, 0);
  const mid = laneMiddle((await samples(page, (await state(page)).connectors[0]))!);
  const r = (await nodeRect(page, a))!;
  const world = (await doc(page)).pages[0].nodes.find((n) => n.id === a)!.transform.translation;
  const offset = { x: r.x - world.x, y: r.y - world.y };
  await page.mouse.click(mid.x + offset.x, mid.y + offset.y);
  await expect(page.getByRole('toolbar', { name: 'Connector actions' })).toBeVisible();
  await page.getByRole('button', { name: /^Line:/ }).click();
  await expect(page.getByRole('dialog', { name: 'Line' })).toBeVisible();
  await page.getByRole('radiogroup', { name: 'End marker' }).getByRole('radio', { name: 'Dot' }).check();
  await page.getByRole('radiogroup', { name: 'Line style' }).getByRole('radio', { name: 'Dashed' }).check();
  await expect.poll(async () => {
    const c = (await doc(page)).pages[0].connectors[0];
    return c.appearance.markerEnd === 'dot' && c.appearance.dashPattern === 'dashed';
  }).toBe(true);
});
