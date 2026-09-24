// Slice 6.3 headed check: the connector kinds bind, route, and re-route live.
import { expect, test } from './test';

type V2Api = {
  getState(): { nodes: string[]; connectors: string[]; selectedConnector: string | null; selectedConnectors: string[] };
  getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null;
  getLiveConnectorSamples(id: string): readonly { x: number; y: number }[];
  getDocument(): {
    pages: [{
      nodes: { id: string }[];
      connectors: { id: string; route: { kind: string }; appearance: Record<string, unknown> }[];
    }];
  };
};
const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());
const doc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());
const nodeRect = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId), id);
const samples = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((connectorId: string) =>
    (window as unknown as { __V2__: V2Api }).__V2__.getLiveConnectorSamples(connectorId), id);

test('each connector kind binds to shapes and re-routes when a shape moves', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;

  for (const [x, y] of [[380, 300], [980, 300]] as const) {
    await page.keyboard.press('Escape');
    await page.keyboard.press('r');
    await page.mouse.click(x, y);
  }
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  const [first, second] = (await state(page)).nodes;
  const a = (await nodeRect(page, first!))!;
  const b = (await nodeRect(page, second!))!;
  const centre = (rect: { x: number; y: number; width: number; height: number }) =>
    ({ x: box.x + rect.x + rect.width / 2, y: box.y + rect.y + rect.height / 2 });
  const from = centre(a);
  const to = centre(b);

  const pick = async (name: string) => {
    await page.getByRole('button', { name: 'Connector' }).click();
    await page.getByRole('option', { name }).click();
  };

  // Elbow, line and curve: drag one onto the other.
  for (const name of ['Elbow', 'Line', 'Curve']) {
    await pick(name);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await expect.poll(async () => (await state(page)).connectors.length).toBe(
      ['Elbow', 'Line', 'Curve'].indexOf(name) + 1
    );
  }

  // Path: click the first shape, click a bend, click the second shape.
  await pick('Path');
  await page.mouse.click(from.x, from.y);
  await page.mouse.click((from.x + to.x) / 2, from.y - 120);
  await page.mouse.click(to.x, to.y);
  await expect.poll(async () => (await state(page)).connectors.length).toBe(4);

  const connectors = (await doc(page)).pages[0].connectors;
  expect(connectors.map((connector) => connector.route.kind)).toEqual([
    'orthogonal', 'direct', 'bezier', 'polyline',
  ]);
  expect(connectors[1]!.appearance.markerEnd).toBe('none');
  expect(connectors[0]!.appearance.markerEnd).toBe('arrow');

  // Every route has real samples, and the straight one is just two points.
  const before = await Promise.all(connectors.map((connector) => samples(page, connector.id)));
  for (const points of before) expect(points.length).toBeGreaterThanOrEqual(2);
  // Parallel edges fan apart, so "straight" means a 3-point path whose middle
  // sits near the midpoint (within the parallel-edge offset).
  const line = before[1]!;
  expect(line).toHaveLength(3);
  expect(Math.hypot(
    line[1]!.x - (line[0]!.x + line[2]!.x) / 2,
    line[1]!.y - (line[0]!.y + line[2]!.y) / 2
  )).toBeLessThan(12);

  // Drag the second shape: every route re-routes, none keeps a stale segment.
  await page.keyboard.press('Escape');
  await page.mouse.move(to.x, to.y);
  await page.mouse.down();
  await page.mouse.move(to.x + 60, to.y + 220, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await samples(page, connectors[0]!.id)).at(-1)!.y)
    .toBeGreaterThan(to.y + 100);
  const after = await Promise.all(connectors.map((connector) => samples(page, connector.id)));
  after.forEach((points, index) => {
    const last = points.at(-1)!;
    const previous = before[index]!.at(-1)!;
    expect(Math.hypot(last.x - previous.x, last.y - previous.y)).toBeGreaterThan(50);
  });
  // The straight route stays a straight line after the move.
  expect(after[1]).toHaveLength(3);
});

test('a marquee selects connectors with their shapes, and Delete removes them all', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('v2-canvas').focus();
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  for (const [x, y] of [[380, 300], [980, 300]] as const) {
    await page.keyboard.press('Escape');
    await page.keyboard.press('r');
    await page.mouse.click(x, y);
  }
  await page.keyboard.press('Escape');
  const [first, second] = (await state(page)).nodes;
  const a = (await nodeRect(page, first!))!;
  const b = (await nodeRect(page, second!))!;
  await page.keyboard.press('a');
  await page.mouse.move(box.x + a.x + a.width / 2, box.y + a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + b.x + b.width / 2, box.y + b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  // The default arrow goes straight where it was dragged, head at the target.
  const [arrow] = (await doc(page)).pages[0].connectors;
  expect(arrow!.route.kind).toBe('direct');
  expect(arrow!.appearance.markerEnd).toBe('arrow');

  // Marquee over everything: shapes and the connector are selected together.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.mouse.move(200, 150);
  await page.mouse.down();
  await page.mouse.move(1200, 500, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).selectedConnectors.length).toBe(1);
  expect((await state(page)).nodes).toHaveLength(2);

  // Marquee over the connector's middle only (no shape): it is selectable alone.
  await page.keyboard.press('Escape');
  await page.mouse.move(640, 250);
  await page.mouse.down();
  await page.mouse.move(720, 350, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).selectedConnector).not.toBeNull();
  expect((await state(page)).selectedConnectors).toHaveLength(1);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(0);
  expect((await state(page)).nodes).toHaveLength(2);
});
