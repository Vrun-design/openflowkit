// Headed: the selection toolbar never sits on the label of a connector that
// reaches the selection from above; it moves to the side with room.
import { clickNode, rect, state } from './helpers';
import { expect, test } from './test';

test('the selection toolbar keeps off a connector label above the selection @gate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const code = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' });
  await code.click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart\nApprove -> Ship : approved by finance');
  await source.press('Meta+Enter');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  await code.click();
  const view = page.getByRole('toolbar', { name: 'View' });
  const bar = page.locator('[data-context-bar]');
  for (const zoom of ['50%', '100%', '200%']) {
    await view.getByRole('button', { name: /^Zoom \d+%$/ }).click();
    await page.getByRole('menu', { name: 'Zoom' }).getByRole('menuitemcheckbox', { name: `Zoom to ${zoom}` }).click();
    await clickNode(page, 'ship');
    await expect(bar).toBeVisible();
    // The label sits on the connector between the two boxes: the bar must leave that gap clear.
    const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
    const upper = (await rect(page, 'approve'))!;
    const lower = (await rect(page, 'ship'))!;
    const gap = { x: canvas.x + lower.x, y: canvas.y + upper.y + upper.height, width: lower.width, height: lower.y - upper.y - upper.height };
    await expect.poll(async () => {
      const box = (await bar.boundingBox())!;
      return box.x < gap.x + gap.width && box.x + box.width > gap.x && box.y < gap.y + gap.height && box.y + box.height > gap.y;
    }, { message: `bar covers the label at ${zoom}` }).toBe(false);
  }
});
