import { expect, test, type Page } from './test';
import { doc, state } from './helpers';

// Canvas or Map is remembered per document in this browser: a reload keeps the reader's last switch.
const mapButton = (page: Page) => page.getByRole('button', { name: 'Map', exact: true });
const canvasButton = (page: Page) => page.getByRole('button', { name: 'Canvas', exact: true });
const mode = (page: Page) => page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { mode: string } } }).__V2__.getMapState().mode);

async function reload(page: Page): Promise<void> {
  await expect.poll(async () => ['saved', 'clean'].includes((await state(page)).save)).toBe(true);
  await page.reload();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
}

test('a reload keeps the last choice between Canvas and Map @gate', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);

  await mapButton(page).click();
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await canvasButton(page).click();
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  await reload(page);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  expect(await mode(page)).toBe('canvas');

  await mapButton(page).click();
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await reload(page);
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => mode(page)).toBe('map');

  // The M key is a user switch too.
  await page.locator('[data-testid="v2-canvas"]').focus();
  await page.keyboard.press('m');
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  await reload(page);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
});
