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
