import { expect, test, type Page } from './test';
import { centreOf, doc, rect, state } from './helpers';

// Map mode: when the right panel opens on a selected box that it would cover, the camera pans the least it takes (zoom kept).
const settled = (page: Page) => expect.poll(() => page.evaluate(() =>
  (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion().running)).toBe(false);
const zoom = async (page: Page) => (await page.getByRole('button', { name: /^Zoom \d+%/ }).getAttribute('aria-label'))!;

test('the selected box is panned clear of the panel that opens, keeping the zoom @gate', async ({ page }) => {
  test.setTimeout(90_000);
  // Narrow enough that the panel (and the rail) cover where the fitted map's right-hand boxes sit.
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  await rail.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  // Close the Model panel if creating the workspace left it open: it is the thing under test.
  const panel = page.getByRole('complementary', { name: 'Architecture model' });
  if (await panel.isVisible()) await rail.click();
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { nodes: string[] } } }).__V2__.getMapState())).nodes.length).toBeGreaterThan(0);
  await settled(page);
  const at = await centreOf(page, 'shop.database');
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.database']);
  await settled(page);
  const before = await zoom(page);
  const start = (await rect(page, 'shop.database'))!;

  await rail.click();
  await expect(panel).toBeVisible();
  const canvas = (await page.locator('[data-testid="v2-canvas"]').boundingBox())!;
  const panelLeft = (await panel.boundingBox())!.x - canvas.x;
  // The test is not vacuous: where the box sat before, the panel would cover it.
  expect(start.x + start.width).toBeGreaterThan(panelLeft);
  await expect.poll(async () => {
    const r = await rect(page, 'shop.database');
    return r ? r.x + r.width <= panelLeft : false;
  }, { timeout: 10_000 }).toBe(true);
  await settled(page);
  const r = (await rect(page, 'shop.database'))!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(panelLeft);
  expect(await zoom(page)).toBe(before);
});

test('Canvas: opening panels pans the content clear of Layers and the tool rail, keeping the zoom; closing one moves nothing @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  await rail.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  const model = page.getByRole('complementary', { name: 'Architecture model' });
  if (await model.isVisible()) await rail.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await expect(model).toBeHidden();
  await expect.poll(async () => (await state(page)).nodes.length).toBeGreaterThan(2);
  const ids = (await state(page)).nodes;
  const before = await zoom(page);

  // The code panel leaves room for the diagram; Layers then opens on the left and the diagram no longer fits:
  // its start is aligned clear of Layers and of the tool rail, and the zoom stays.
  await rail.getByRole('button', { name: 'Diagram as code' }).click();
  await expect(page.getByRole('complementary', { name: /code/i })).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const layers = page.getByRole('complementary', { name: 'Layers' });
  await expect(layers).toBeVisible();
  const canvas = (await page.locator('[data-testid="v2-canvas"]').boundingBox())!;
  const right = async (target: typeof layers) => { const box = (await target.boundingBox())!; return box.x + box.width - canvas.x; };
  const clearOf = Math.max(await right(layers), await right(page.getByRole('toolbar', { name: 'Create', exact: true })));
  const leftmost = async () => Math.min(...(await Promise.all(ids.map((id) => rect(page, id)))).map((r) => r!.x));
  await expect.poll(leftmost, { timeout: 10_000 }).toBeGreaterThanOrEqual(clearOf);
  expect(await zoom(page)).toBe(before);

  // Closing a panel never pans.
  await page.waitForTimeout(800); // the glide lands
  const open = await Promise.all(ids.map((id) => rect(page, id)));
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(layers).toBeHidden();
  await page.waitForTimeout(500);
  expect(await Promise.all(ids.map((id) => rect(page, id)))).toEqual(open);
  expect(await zoom(page)).toBe(before);
});
