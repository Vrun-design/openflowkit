import { expect, test, type Page } from './test';
import { drawShape, openCanvas, state } from './helpers';

// Feature tips: one hint when it pays off, at most one a session, never the same one twice.
// npm run e2e:headed -- e2e/feature-tips.spec.ts

const tip = (page: Page) => page.locator('.ofk-v2-tip');

async function drawThree(page: Page) {
  await drawShape(page, 'r', 360, 300);
  await drawShape(page, 'r', 560, 300);
  await drawShape(page, 'o', 760, 300);
}

test('three hand-drawn shapes point at Diagram as code once, and never again @gate', async ({ page }) => {
  await openCanvas(page);
  await drawThree(page);
  await expect(tip(page)).toContainText('Draw it from text');
  // Beside the control it is about, and it never took focus from the canvas.
  await expect(page.getByTestId('v2-canvas')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tip(page)).toHaveCount(0);

  // Same session: a second trigger (two shapes selected, no connectors) stays silent.
  await page.keyboard.press('Meta+a');
  await page.waitForTimeout(400);
  await expect(tip(page)).toHaveCount(0);

  // A new tab is a new session; the seen tip still never returns.
  const next = await page.context().newPage();
  await openCanvas(next);
  await drawThree(next);
  await next.waitForTimeout(600);
  await expect(tip(next)).toHaveCount(0);
});

test('the tip’s action opens what it names @gate', async ({ page }) => {
  await openCanvas(page);
  await drawThree(page);
  await expect(tip(page)).toBeVisible();
  await tip(page).getByRole('button', { name: 'Open Diagram as code' }).click();
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

test('Mermaid pasted on the canvas is drawn in place, its source open beside it, one undo step @gate', async ({ page }) => {
  await openCanvas(page);
  await page.getByTestId('v2-canvas').evaluate((canvas) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'flowchart LR\n  A[Cart] --> B[Paid]');
    canvas.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toContainText('Cart');
  await expect.poll(async () => (await state(page)).nodes.length).toBeGreaterThan(0);
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(0);
});
