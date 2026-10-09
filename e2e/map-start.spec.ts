import { expect, test, type Page } from './test';
import { doc, drawShape, openCanvas, state } from './helpers';

// Map on a document with no architecture model: a start screen, never a change to the drawing behind it.
// npx playwright test e2e/map-start.spec.ts

const switchOf = (page: Page) => page.getByRole('group', { name: 'View mode' });
const mapButton = (page: Page) => switchOf(page).getByRole('button', { name: 'Map', exact: true });
const canvasButton = (page: Page) => switchOf(page).getByRole('button', { name: 'Canvas', exact: true });
const start = (page: Page) => page.getByTestId('v2-map-start');
const mode = (page: Page) => page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { mode: string } } }).__V2__.getMapState().mode);

async function withShapes(page: Page): Promise<string[]> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCanvas(page);
  const ids = [await drawShape(page, 'r', 500, 400), await drawShape(page, 'o', 800, 400)];
  await page.getByTestId('v2-canvas').focus();
  return ids;
}
const nodeIds = async (page: Page) => (await doc(page))!.pages[0]!.nodes.map((node) => node.id).sort();

test('Map on a plain document shows the start screen and leaves the drawing as it was @gate', async ({ page }) => {
  const ids = await withShapes(page);
  await page.keyboard.press('m');
  await expect(start(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'See how your system fits together' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start an architecture model' })).toBeFocused();
  await expect(page.getByRole('toolbar', { name: 'Map depth', exact: true })).toHaveCount(0);
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  // Find and the keys Map has no use for do nothing here.
  await page.keyboard.press('Meta+f');
  await expect(page.getByRole('search')).toHaveCount(0);
  await page.keyboard.press('Delete');
  await page.keyboard.press('Escape');
  await expect(start(page)).toHaveCount(0);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  expect(await nodeIds(page)).toEqual([...ids].sort());
  // The switch works the same way with the pointer.
  await mapButton(page).click();
  await expect(start(page)).toBeVisible();
  await canvasButton(page).click();
  await expect(start(page)).toHaveCount(0);
});

test('Start an architecture model keeps the drawing, shows the model in Map, and one undo takes it away @gate', async ({ page }) => {
  const ids = await withShapes(page);
  const pagesBefore = (await doc(page))!.pages.length;
  await mapButton(page).click();
  await page.getByRole('button', { name: 'Start an architecture model' }).click();
  await expect(start(page)).toHaveCount(0);
  await expect.poll(async () => (await doc(page))!.pages.length).toBeGreaterThan(pagesBefore);
  await expect(page.getByRole('toolbar', { name: 'Map depth', exact: true })).toBeVisible();
  expect(await mode(page)).toBe('map');
  expect((await doc(page))!.pages[0]!.nodes.map((node) => node.id).sort()).toEqual([...ids].sort());
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await doc(page))!.pages.length).toBe(pagesBefore);
  await expect(start(page)).toBeVisible();
  expect(await nodeIds(page)).toEqual([...ids].sort());
});

test('the agent action opens Connect agent @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('m');
  await start(page).getByRole('button', { name: 'Connect agent' }).click();
  await expect(page.getByRole('complementary', { name: 'Connect agent' })).toBeVisible();
  await expect(start(page)).toBeVisible();
});

test('Map a GitHub repo opens a popover that checks the address, then opens the repo map @gate', async ({ page }) => {
  const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-ratelimit-remaining, x-ratelimit-reset' };
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => route.fulfill({ status: 404, json: { message: 'Not Found' }, headers: CORS }));
  await openCanvas(page);
  await page.keyboard.press('m');
  await start(page).getByRole('button', { name: 'Map a GitHub repo' }).click();
  const popover = page.getByRole('dialog', { name: 'Map a GitHub repo' });
  const field = popover.getByLabel('owner/repo or GitHub URL');
  await expect(field).toBeFocused();
  await field.fill('not a repo');
  await popover.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(popover.getByText('Enter owner/repo or a github.com address.')).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await field.fill('https://github.com/acme/shop');
  await expect(popover.getByText('Enter owner/repo or a github.com address.')).toHaveCount(0);
  await field.press('Enter');
  await expect(page).toHaveURL(/#\/d\/map-acme_shop$/);
});

test('a plain document reopens on Canvas even when it was left in Map @gate', async ({ page }) => {
  await withShapes(page);
  await mapButton(page).click();
  await expect(start(page)).toBeVisible();
  await expect.poll(async () => ['saved', 'clean'].includes((await state(page)).save)).toBe(true);
  await page.reload();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(start(page)).toHaveCount(0);
});

test('Escape closes the repo popover and keeps Map; a second Escape leaves it @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('m');
  await start(page).getByRole('button', { name: 'Map a GitHub repo' }).click();
  const popover = page.getByRole('dialog', { name: 'Map a GitHub repo' });
  await popover.getByLabel('owner/repo or GitHub URL').fill('acme');
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(start(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(start(page)).toHaveCount(0);
});

test('another document opens on Canvas, whatever mode the last one was in @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('m');
  await expect(start(page)).toBeVisible();
  // In-app navigation, no reload: the editor stays mounted.
  await page.evaluate(() => { window.location.hash = '#/d/lane-e-other-document'; });
  await expect(page).toHaveURL(/lane-e-other-document/);
  await expect(page.getByTestId('v2-welcome')).toBeVisible();
  await expect(start(page)).toHaveCount(0);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
});

test('the welcome and the Map start screen put the logo, title and buttons in the same place @gate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCanvas(page);
  const measure = () => page.evaluate(() => {
    const top = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON();
    return { logo: top('.ofk-v2-welcome-center > img'), title: top('.ofk-v2-welcome h1'), actions: top('.ofk-v2-welcome-actions') };
  });
  await expect(page.getByTestId('v2-welcome')).toBeVisible();
  const canvas = await measure();
  await page.keyboard.press('m');
  await expect(start(page)).toBeVisible();
  const map = await measure();
  for (const key of ['logo', 'title', 'actions'] as const) {
    expect(Math.abs(map[key].top - canvas[key].top), `${key} top`).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(map.logo.left - canvas.logo.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(map.logo.width - canvas.logo.width)).toBeLessThanOrEqual(1);
  // The arrows have something to point at in both: the Create tools stay, and choosing one returns to Canvas with it armed.
  await expect(page.locator('.ofk-v2-guide')).toHaveCount(4);
  await page.getByRole('toolbar', { name: 'Create', exact: true }).getByRole('button', { name: 'Text', exact: true }).click();
  await expect(start(page)).toHaveCount(0);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  expect((await state(page)).tool).toBe('text');
});
