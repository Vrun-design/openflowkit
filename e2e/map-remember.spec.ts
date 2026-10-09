import { expect, test, type Page } from './test';
import { centreOf, doc, state } from './helpers';

// Map mode remembers the open boxes per document and page in this browser (localStorage), never in the document.
// A page still navigating (the reload) has no context to evaluate in yet: that reads as "no map", and the poll retries.
const mapState = (page: Page): Promise<{ open: string[]; nodes: string[] }> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { open: string[]; nodes: string[] } } }).__V2__.getMapState())
    .catch(() => ({ open: [], nodes: [] }));
const mapButton = (page: Page) => page.getByRole('button', { name: 'Map', exact: true });
const canvasButton = (page: Page) => page.getByRole('button', { name: 'Canvas', exact: true });

// A reload comes back in the mode the reader last chose (map-mode-remember.spec), so press Map only when it is off.
async function enterMap(page: Page): Promise<void> {
  if ((await mapButton(page).getAttribute('aria-pressed')) !== 'true') await mapButton(page).click();
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
}

test('the boxes left open come back after leaving Map and after a reload @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  await rail.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await enterMap(page);
  const preset = (await mapState(page)).open;
  // Open one more box than the overview does.
  const at = await centreOf(page, 'shop.api');
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  const opened = (await mapState(page)).open;
  expect(opened).not.toEqual(preset);

  await canvasButton(page).click();
  await enterMap(page);
  await expect.poll(async () => (await mapState(page)).open).toEqual(opened);

  // The document is untouched by it; a reload empties every in-memory state.
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.reload();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await enterMap(page);
  await expect.poll(async () => (await mapState(page)).open).toEqual(opened);
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
});

test('an oversize remembered set is ignored and the overview opens instead @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  await rail.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  const document = (await doc(page))!;
  const key = `ofk.map-open:${document.id}:${document.pages[0]!.id}`;
  await page.evaluate(([k]) => localStorage.setItem(k!, JSON.stringify(Array.from({ length: 2001 }, (_, i) => i === 0 ? 'shop.api' : `x${i}`))), [key]);
  await enterMap(page);
  // `shop.api` was in the oversize list: had it been honoured, the API box would be open.
  await expect.poll(async () => (await mapState(page)).open).toEqual(['shop']);
});
