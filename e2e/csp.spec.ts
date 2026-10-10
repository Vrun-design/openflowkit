import { expect, test } from './test';
import { openCanvas } from './helpers';

// The dev server sends the deployed public/_headers and ./test fails on any CSP violation, so every spec
// runs under the production policy. This one walks what loads things: icons from each kind of source
// (Pixi fetches the bundled ones as data: URLs, which the first applied policy blocked) and the exports.
test('icons, PNG and GIF export load under the production CSP @gate', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  // One icon from each kind of source: bundled data: URLs (developer, tabler) and asset files (aws).
  await page.getByRole('textbox', { name: 'Diagram source' }).fill('architecture\nWeb [tech/react] -> API [aws/lambda] -> Pay [tabler/brand-stripe]');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect.poll(async () => page.evaluate(() => (window as unknown as { __V2__: { getState(): { nodes: string[] } } }).__V2__.getState().nodes.length)).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  const png = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: 'Download', exact: true }).click();
  expect((await png).suggestedFilename()).toMatch(/\.png$/);
  await page.getByRole('button', { name: /Animate this page/ }).click();
  await page.getByRole('radio', { name: 'GIF', exact: true }).check();
  const gif = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: /Export GIF/ }).click();
  expect((await gif).suggestedFilename()).toMatch(/\.gif$/);
});
