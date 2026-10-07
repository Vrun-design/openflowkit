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
    // The label sits midway down the straight connector between the boxes: the bar must keep off its plate
    // (12px text at 0.58em a character, padded 5, as the canvas sizes it), 8px of shadow room included.
    const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
    const upper = (await rect(page, 'approve'))!;
    const lower = (await rect(page, 'ship'))!;
    const scale = Number.parseInt(zoom, 10) / 100;
    const centre = { x: canvas.x + lower.x + lower.width / 2, y: canvas.y + (upper.y + upper.height + lower.y) / 2 };
    const half = { width: (('approved by finance'.length * 12 * 0.58 + 10) / 2) * scale + 8, height: ((12 * 1.25 + 5) / 2) * scale + 8 };
    await expect.poll(async () => {
      const box = (await bar.boundingBox())!;
      return box.x < centre.x + half.width && box.x + box.width > centre.x - half.width
        && box.y < centre.y + half.height && box.y + box.height > centre.y - half.height;
    }, { message: `bar covers the label at ${zoom}` }).toBe(false);
  }
});
