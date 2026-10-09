import { expect, test, type Page } from './test';
import { centreOf, doc, state } from './helpers';

// Map mode's bottom toolbar (depth) and arrow-key walking. Entering Map and the C4 fixture as in map-mode.spec.
const mapState = (page: Page): Promise<{ open: string[]; nodes: string[] }> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { open: string[]; nodes: string[] } } }).__V2__.getMapState());
const settled = (page: Page) => expect.poll(() => page.evaluate(() =>
  (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion().running)).toBe(false);

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Map depth', exact: true });
const pill = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true });
const selected = async (page: Page) => (await state(page)).selectedNodes;

async function openMap(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  await rail.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await expect(page.getByRole('complementary', { name: 'Architecture model' })).toBeVisible();
  await expect(toolbar(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
  await settled(page);
}

test('the Map toolbar shows only in Map; the depth pill follows the open set @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  await expect(toolbar(page)).toBeVisible();
  // A map of three top boxes or fewer opens with its top level open: that is One level in, not Top level.
  await expect(pill(page, 'One level in')).toHaveAttribute('aria-pressed', 'true');
  await expect(pill(page, 'Top level')).toHaveAttribute('aria-pressed', 'false');
  await pill(page, 'All levels').click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  await expect(pill(page, 'All levels')).toHaveAttribute('aria-pressed', 'true');
  await expect(pill(page, 'Top level')).toHaveAttribute('aria-pressed', 'false');
  await settled(page);
  await pill(page, 'Top level').click();
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('shop.api.orders');
  await expect(pill(page, 'Top level')).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  // A custom state is no preset. This small model reaches every other set by a preset, so the test hook sets one directly.
  await page.evaluate(() => (window as unknown as { __V2__: { openMapBoxes(ids: string[]): void } }).__V2__.openMapBoxes(['shop.api']));
  await expect.poll(async () => (await mapState(page)).open).toEqual(['shop.api']);
  for (const name of ['Top level', 'One level in', 'All levels']) await expect(pill(page, name)).toHaveAttribute('aria-pressed', 'false');
  // Leaving Map takes the toolbar away.
  await page.getByRole('button', { name: 'Canvas', exact: true }).click();
  await expect(toolbar(page)).toHaveCount(0);
});

test('a selected box that a depth change hides hands its selection to the box around it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  await pill(page, 'All levels').click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.web');
  await settled(page);
  const leaf = await centreOf(page, 'shop.web');
  await page.mouse.click(leaf.x, leaf.y);
  await expect.poll(() => selected(page)).toEqual(['shop.web']);
  await pill(page, 'Top level').click();
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('shop.web');
  await settled(page);
  await expect.poll(() => selected(page)).toEqual(['shop']);
});

test('arrow keys walk between boxes and Down enters an open box @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  // Focus the canvas without selecting a box: a click in its left margin (an open map leaves it empty).
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(canvas.x + 10, canvas.y + 100);
  await expect.poll(() => selected(page)).toEqual([]);
  // Nothing selected: an arrow picks the first (top-left) box. C4 lays the top level out in a column: customer, shop, payments.
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => selected(page)).toEqual(['customer']);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => selected(page)).toEqual(['customer']);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => selected(page)).toEqual(['shop']);
  // With focus in the Model panel, arrows belong to the panel: the map selection stays.
  // The selected box is open as a card there: its name field and back link both keep the arrows.
  await page.getByLabel('Name', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => selected(page)).toEqual(['shop']);
  await page.getByRole('button', { name: 'All elements', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => selected(page)).toEqual(['shop']);
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(box.x + 10, box.y + 100);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => selected(page)).toEqual(['customer']);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => selected(page)).toEqual(['shop']);
  // Down from an open box goes to its first child; Up from there goes back out.
  expect((await mapState(page)).open).toContain('shop');
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await selected(page))[0]?.startsWith('shop.')).toBe(true);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => selected(page)).toEqual(['shop']);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => selected(page)).toEqual(['customer']);
});

test('a C4 map has one kind of connection, so the Connections control is hidden @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  await expect(toolbar(page)).toBeVisible();
  await expect(toolbar(page).getByRole('button', { name: 'Connections', exact: true })).toHaveCount(0);
});
