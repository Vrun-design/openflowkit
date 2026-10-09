import { expect, test, type Page } from './test';
import { centreOf, clickNode, doc, rect as rectOf, state } from './helpers';

// The selection survives the Canvas | Map switch: Canvas -> Map reveals the selected element (its ancestors open, itself not);
// Map -> Canvas selects the node that places the box on this page, and nothing when this page does not place it.
interface MapState { mode: 'canvas' | 'map'; open: string[]; nodes: string[] }
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState());
const mapButton = (page: Page) => page.getByRole('button', { name: 'Map', exact: true });
const canvasButton = (page: Page) => page.getByRole('button', { name: 'Canvas', exact: true });

async function openC4(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
}

async function openServicesShop(page: Page, inCanvas = true): Promise<void> {
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.getByRole('dialog', { name: 'Pages', exact: true }).getByRole('button', { name: /^Services: Shop/ }).click();
  if (inCanvas) await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('Services: Shop');
  await page.waitForTimeout(800); // the landing glide
}

/** The Canvas node that places `elementId` on the open page (the one drawn on the host). */
const placed = (page: Page, elementId: string): Promise<string> =>
  page.evaluate((id) => {
    const api = (window as unknown as { __V2__: { getDocument(): { pages: { nodes: { id: string; metadata?: { model?: { elementId?: string } } }[] }[] } | null; getNodeRect(id: string): unknown } }).__V2__;
    const hit = api.getDocument()?.pages.flatMap((p) => p.nodes).find((n) => n.metadata?.model?.elementId === id && api.getNodeRect(n.id));
    return hit?.id ?? '';
  }, elementId);

const zoom = async (page: Page) => (await page.getByRole('button', { name: /^Zoom \d+%/ }).getAttribute('aria-label'))!;

async function clickBox(page: Page, id: string): Promise<void> {
  const at = await centreOf(page, id);
  await page.mouse.click(at.x, at.y);
}

for (const how of ['the Map button', 'the M key']) {
  test(`${how} with an element selected reveals it in Map without opening it @gate`, async ({ page }) => {
    test.setTimeout(90_000);
    await openC4(page);
    // What Map opens by itself, with nothing selected.
    await mapButton(page).click();
    await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
    const preset = (await mapState(page)).open;
    await canvasButton(page).click();
    await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');

    await openServicesShop(page);
    const api = await placed(page, 'shop.api');
    await clickNode(page, api);
    await expect.poll(async () => (await state(page)).selectedNodes).toEqual([api]);
    const zoomBefore = await zoom(page);
    if (how === 'the Map button') await mapButton(page).click(); else await page.keyboard.press('m');
    await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.api']);
    const map = await mapState(page);
    expect(map.mode).toBe('map');
    expect(map.open).toEqual(preset);
    expect(map.nodes).not.toContain('shop.api.orders');
    // Back again: the same camera, and the node that places it is selected.
    await page.keyboard.press('m');
    await expect.poll(async () => (await state(page)).selectedNodes).toEqual([api]);
    await expect.poll(() => zoom(page)).toBe(zoomBefore);
    await expect(page.getByRole('complementary', { name: 'Architecture model' }).getByLabel('Name', { exact: true })).toHaveValue('API');
  });
}

test('Canvas shows the selected box again, and nothing when this page does not place it @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openC4(page);
  // Landscape does not place the API: nothing stays selected.
  await mapButton(page).click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api');
  await clickBox(page, 'shop.api');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.api']);
  await canvasButton(page).click();
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([]);

  // Services: Shop places it: the same box is selected on Canvas.
  await openServicesShop(page);
  const api = await placed(page, 'shop.api');
  await mapButton(page).click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api');
  await clickBox(page, 'shop.api');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.api']);
  await canvasButton(page).click();
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([api]);
});

test('a closed ancestor opens, the element itself does not; Cmd+A then M is the plain overview @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openC4(page);
  await openServicesShop(page);
  await mapButton(page).click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.web');
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const r = (await rectOf(page, 'shop'))!;
  await page.mouse.click(box.x + r.x + 12, box.y + r.y + 8);
  await expect.poll(async () => (await mapState(page)).open).not.toContain('shop');
  const closed = (await mapState(page)).open;
  await canvasButton(page).click();
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  const api = await placed(page, 'shop.api');
  await clickNode(page, api);
  await page.keyboard.press('m');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.api']);
  const open = (await mapState(page)).open;
  expect(open).toContain('shop');
  expect(open).not.toContain('shop.api');
  expect(open.filter((id) => !closed.includes(id))).toEqual(['shop']);

  // Several selected: nothing to reveal, the map opens as it was.
  await page.keyboard.press('m');
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  await page.keyboard.press('Control+a');
  await expect.poll(async () => (await state(page)).selectedNodes.length).toBeGreaterThan(1);
  await page.keyboard.press('m');
  await expect.poll(async () => (await mapState(page)).mode).toBe('map');
  expect((await mapState(page)).open).toEqual(open);
});

test('M twice in a row keeps the selection @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openC4(page);
  const shop = await placed(page, 'shop');
  await clickNode(page, shop);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([shop]);
  await page.keyboard.press('m');
  await page.keyboard.press('m');
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([shop]);
});

test('a document remembered in Map carries the selection to Canvas, also after a page change in Map @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openC4(page);
  await mapButton(page).click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
  await page.reload();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await openServicesShop(page, false);
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api');
  await clickBox(page, 'shop.api');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.api']);
  await page.keyboard.press('m');
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  const api = await placed(page, 'shop.api');
  expect(api).not.toBe('');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([api]);
});
