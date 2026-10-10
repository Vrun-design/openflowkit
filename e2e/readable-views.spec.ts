import { expect, test, type Page } from './test';
import { doc, rect } from './helpers';

const READABLE_ZOOM = 0.65;
type Probe = { __V2__: { getRenderDiagnostics(): { detailLevel: string } } };
const detail = (page: Page) => page.evaluate(() => (window as unknown as Probe).__V2__.getRenderDiagnostics().detailLevel);
// The on-screen scale of a node: its screen width over its world width.
const zoomOf = async (page: Page, id: string) => {
  const world = (await doc(page))!.pages.flatMap((entry) => entry.nodes).find((entry) => entry.id === id) as unknown as { size: { width: number } };
  const box = await rect(page, id);
  return box ? box.width / world.size.width : 0;
};
const WIDE = ['customer', 'shop.web', 'shop.api', 'shop.database', 'payments'];

test('a view opened from Pages lands readable, and Zoom to fit still fits everything @gate', async ({ page }) => {
  // Narrow enough that fitting the 2158-unit-wide view would land far below the floor.
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect.poll(() => zoomOf(page, 'shop')).toBeGreaterThan(0);
  // The new model already lands readable: zoom out first, so only a landing on the switch brings it back up.
  await page.keyboard.press('ControlOrMeta+Minus');
  await expect.poll(() => zoomOf(page, 'shop')).toBeLessThan(READABLE_ZOOM - 0.01);
  const before = await zoomOf(page, 'shop');
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.getByRole('dialog', { name: 'Pages', exact: true }).getByRole('button', { name: /^Services: Shop/ }).click();
  await page.keyboard.press('Escape');
  await expect.poll(() => zoomOf(page, 'shop.web')).toBeGreaterThanOrEqual(READABLE_ZOOM - 0.001);
  await expect.poll(() => detail(page)).toBe('full');
  expect(Math.abs((await zoomOf(page, 'shop.web')) - before)).toBeGreaterThan(0.001); // the switch moved the camera
  // The explicit command is not a landing: it fits every box, below the floor.
  await page.getByRole('button', { name: 'Zoom to fit' }).click();
  await expect.poll(() => zoomOf(page, 'shop.web')).toBeLessThan(READABLE_ZOOM);
  const view = page.viewportSize()!;
  for (const id of WIDE) {
    const box = (await rect(page, id))!;
    expect(box.x, id).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, id).toBeLessThanOrEqual(view.width);
  }
});

test('a document whose first page is a wide view opens readable @gate', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  await page.getByRole('textbox', { name: 'Diagram source' }).fill(
    'architecture\nmodel {\n  person Customer\n  system Shop {\n    container Web\n    container API\n    store DB\n    Web -> API\n    API -> DB\n  }\n  external Stripe\n  Customer -> Shop.Web\n  Shop.API -> Stripe\n}\nviews { view container of Shop }\n');
  await page.getByRole('button', { name: 'Generate diagram' }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(1);
  await expect.poll(async () => (await doc(page))?.pages[0]?.nodes.length).toBeGreaterThan(3);
  await expect.poll(async () => doc(page).then((d) => d?.pages[0]?.nodes.some((n) => n.id === 'shop.web'))).toBe(true);
  // Autosave, then a fresh open: the first page is the wide view.
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect.poll(() => zoomOf(page, 'shop.web')).toBeGreaterThanOrEqual(READABLE_ZOOM - 0.001);
  await expect.poll(() => detail(page)).toBe('full');
});
