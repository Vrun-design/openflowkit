import { expect, test, type Page } from './test';
import { centreOf, doc, state } from './helpers';

// Find in Map reveals a match inside a shut box, keeping what is open; the Model panel's overview shows only with nothing selected.
const mapState = (page: Page): Promise<{ open: string[]; nodes: string[] }> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { open: string[]; nodes: string[] } } }).__V2__.getMapState())
    .catch(() => ({ open: [], nodes: [] }));
// Settled reads false; still moving reads the whole motion state, so a stall says which part is waiting.
const settled = (page: Page) => expect.poll(() => page.evaluate(() => {
  const motion = (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion();
  return motion.running ? JSON.stringify(motion) : false;
})).toBe(false);
const selected = async (page: Page) => (await state(page)).selectedNodes;

async function openMap(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  await rail.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
  await settled(page);
}

test('Find in Map opens the boxes around a match, keeps what was open, selects and shows it; Escape restores @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openMap(page);
  expect((await mapState(page)).nodes).not.toContain('shop.api.orders');
  const before = (await mapState(page)).open;
  const customer = await centreOf(page, 'customer');
  await page.mouse.click(customer.x, customer.y);
  await expect.poll(() => selected(page)).toEqual(['customer']);

  await page.keyboard.press('Meta+f');
  const box = page.getByRole('searchbox', { name: 'Find in map' });
  await expect(box).toBeVisible();
  await box.fill('orders');
  await expect(page.locator('.ofk-v2-find-count')).toContainText('found');
  // Matches step in tree order: Enter until the one inside the shut box is reached.
  // Each Enter waits for its own jump (the selection moves) before the next: a second Enter must not land mid-reveal.
  for (let i = 0; i < 3 && !(await selected(page)).includes('shop.api.orders'); i++) {
    const was = (await selected(page)).join();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await selected(page)).join()).not.toBe(was);
    await settled(page);
  }
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  await settled(page);
  expect((await mapState(page)).open).toEqual(expect.arrayContaining([...before, 'shop.api']));
  await expect.poll(() => selected(page)).toEqual(['shop.api.orders']);
  const at = await centreOf(page, 'shop.api.orders');
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  expect(at.x).toBeGreaterThan(canvas.x);
  expect(at.x).toBeLessThan(canvas.x + canvas.width);
  expect(at.y).toBeGreaterThan(canvas.y);
  expect(at.y).toBeLessThan(canvas.y + canvas.height);

  await page.keyboard.press('Escape');
  await expect(box).toHaveCount(0);
  await expect.poll(() => selected(page)).toEqual(['customer']);
  // The boxes it opened stay open.
  expect((await mapState(page)).nodes).toContain('shop.api.orders');
});

test('the Model panel overview shows with nothing selected and hides once a box is selected @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openMap(page);
  // The panel is not forced open by entering Map: open it as a reader would.
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  if (await page.getByText('Search architecture').count() === 0) await rail.click();
  const overview = page.getByLabel('Map overview');
  await expect(overview).toBeVisible();
  await expect(overview).toContainText(/\d+ boxes? · \d+ connections?/);
  const at = await centreOf(page, 'customer');
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => selected(page)).toEqual(['customer']);
  await expect(overview).toHaveCount(0);
});

test('Escape right after a reveal leaves the restored selection alone once the layout lands @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openMap(page);
  const customer = await centreOf(page, 'customer');
  await page.mouse.click(customer.x, customer.y);
  await expect.poll(() => selected(page)).toEqual(['customer']);
  await page.keyboard.press('Meta+f');
  const box = page.getByRole('searchbox', { name: 'Find in map' });
  await box.fill('validates');
  await expect(page.locator('.ofk-v2-find-count')).toHaveText('1 found');
  // Enter opens shop.api (its layout is on the way); Escape closes find before the box is drawn.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  await settled(page);
  await page.waitForTimeout(400);
  expect(await selected(page)).toEqual(['customer']);
});

test('stepping fast through matches ends on the last one asked for @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await openMap(page);
  await page.keyboard.press('Meta+f');
  const box = page.getByRole('searchbox', { name: 'Find in map' });
  await box.fill('orders');
  await expect(page.locator('.ofk-v2-find-count')).toContainText('found');
  // customer, then orders (inside the shut shop.api), then database, with no wait between the keys.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  await settled(page);
  await expect.poll(() => selected(page)).toEqual(['shop.database']);
  await expect(page.locator('.ofk-v2-find-count')).toHaveText('3 of 3');
});
