import { rect, state } from './helpers';
import { expect, test } from './test';

type V2Api = { getState(): { nodes: string[] } };
const count = (page: import('@playwright/test').Page) => page.evaluate(() =>
  (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0);

test('diagram source generates and regenerates as one undo step', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  await source.fill('%% ofk 1\nflowchart\nStart -> Build -> Ship');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => count(page)).toBe(4);
  await source.fill('%% ofk 1\nflowchart\nStart -> Test -> Build -> Ship');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => count(page)).toBe(5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => count(page)).toBe(4);
  await expect(page.locator('#v2-code-diagnostics')).toBeHidden();
});

test('code panel reports bad lines and offers attribute completion', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart\nCache [');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(source).not.toHaveValue('flowchart\nCache [');
  await source.fill('flowchart\nBroken [oops');
  await expect(page.getByText('W101', { exact: true })).toBeVisible();
});

test('a generated diagram fits the canvas the open panel leaves free @gate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nA -> B -> C -> D -> E -> F -> G -> H -> I -> J');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => count(page)).toBeGreaterThan(5);
  const panelLeft = (await page.getByRole('textbox', { name: 'Diagram source' }).boundingBox())!.x;
  await expect.poll(async () => {
    const [frame] = (await state(page)).selectedNodes;
    const frameRect = frame ? await rect(page, frame) : null;
    return frameRect ? Math.round(frameRect.x + frameRect.width) : Infinity;
  }).toBeLessThanOrEqual(panelLeft);
});

test('a long edge label wraps instead of running over the nodes it joins @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nA -> B : email the customer a receipt once the order has shipped');
  await source.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => count(page)).toBeGreaterThan(2);
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __V2__: { getConnectorDebugSnapshot(): { labels: number; widestLabel: number } };
  }).__V2__.getConnectorDebugSnapshot())).toMatchObject({ labels: 1, widestLabel: expect.any(Number) });
  const widest = await page.evaluate(() => (window as unknown as {
    __V2__: { getConnectorDebugSnapshot(): { widestLabel: number } };
  }).__V2__.getConnectorDebugSnapshot().widestLabel);
  expect(widest).toBeGreaterThan(0);
  expect(widest).toBeLessThanOrEqual(150);
});
