import { expect, test } from './test';

// Cancelling a running encode must give the panel back. Terminating the worker
// leaves nothing to settle the export promise, so the abort rejects it too.
// Run headed: npm run e2e:headed -- e2e/motion-cancel.spec.ts

const DSL = `%% ofk 1
flowchart down

  Client [blue] -> API [green] : HTTPS
  API -> Cache [cylinder, orange]
  API -> Store [cylinder, red]
  Store -> Worker [rounded, violet]
`;

test('cancelling an encode leaves the panel usable', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(DSL);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(async () => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getState(): { nodes: string[] } } }).__V2__;
    return api?.getState().nodes.length ?? 0;
  })).toBeGreaterThan(4);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await page.getByRole('button', { name: /Animate this page/ }).click();
  await page.locator('.ofk-motion-transport input[type="range"]').fill('0');

  // A long, big export so there is time to cancel mid-flight.
  const duration = page.getByRole('spinbutton', { name: 'Duration' });
  await duration.fill('20');
  await duration.blur();
  await page.getByRole('radio', { name: 'MP4', exact: true }).check();
  await page.getByRole('radio', { name: '1440p' }).check();
  await page.getByRole('radio', { name: '30 fps' }).check();

  const exportButton = page.getByRole('button', { name: /Export MP4/ });
  await exportButton.click();
  const cancel = page.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeVisible({ timeout: 20_000 });
  await cancel.click();

  // The claim under test: after cancelling, the panel is usable again.
  await expect(page.locator('.ofk-motion-progress')).toBeHidden({ timeout: 10_000 });
  await expect(exportButton).toBeEnabled({ timeout: 10_000 });
});
