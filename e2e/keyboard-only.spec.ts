import { expect, test } from './test';
import { openCanvas, state } from './helpers';

// Keyboard-only (persona P09, 2026-10-10): place, connect, leave the code editor, the ? sheet, a template's start.
const focused = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName);

test('R then Enter places a rectangle; two selected and A connects them, one undo step @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('r');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('o');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(2);
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('a');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  // First-selected to second: the rectangle points at the ellipse.
  const [source, rectangle] = await page.evaluate(() => {
    const api = (window as unknown as { __V2__: { getDocument(): { pages: { nodes: { id: string }[]; connectors: { source: { nodeId: string } }[] }[] } } }).__V2__;
    const first = api.getDocument().pages[0]!;
    return [first.connectors[0]!.source.nodeId, first.nodes[0]!.id];
  });
  expect(source).toBe(rectangle);
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(0);
  expect((await state(page)).nodes.length).toBe(2);
});

test('the code editor is no trap: Esc leaves it, Esc again closes the panel and focus returns @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('Alt+c');
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Close panel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(source).toHaveCount(0);
  expect(await focused(page)).not.toBe('BODY');
});

test('the ? sheet is a dialog that keeps Tab inside and hands focus back on Escape @gate', async ({ page }) => {
  await openCanvas(page);
  await page.keyboard.press('Shift+Slash');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByTestId('v2-canvas')).toBeFocused();
});

test('a template is where the document starts: focus on the canvas, nothing to undo @gate', async ({ page }) => {
  await page.goto('/#/home');
  await page.getByRole('button', { name: 'Event pipeline' }).click();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThan(3);
  await expect(page.getByTestId('v2-canvas')).toBeFocused();
  const drawn = (await state(page)).nodes.length;
  await page.keyboard.press('ControlOrMeta+z');
  await page.waitForTimeout(200);
  expect((await state(page)).nodes.length).toBe(drawn);
});
