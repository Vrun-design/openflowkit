// Headed: a big diagram from the assistant lands readable (>= 65%, on its start)
// with a hint naming the Fit shortcut, instead of a fit too small to read.
import { expect, test } from './test';

const STUB = 'http://127.0.0.1:4399/v1';

test('a large AI diagram lands at a readable zoom with the Fit hint @gate', async ({ page }) => {
  await page.addInitScript((baseUrl) => {
    localStorage.setItem('openflowkit-v2-ai', JSON.stringify({
      provider: 'custom', connections: { custom: { apiKey: 'sk-ok', baseUrl, model: 'stub-model' } },
    }));
  }, STUB);
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true })
    .getByRole('button', { name: 'AI assistant', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI assistant' });
  const composer = panel.getByRole('textbox', { name: 'Ask AI assistant' });
  await composer.fill('draw a big flow');
  await composer.press('Enter');
  await panel.getByRole('button', { name: /^Apply/ }).click();
  await expect(page.getByText(/Zoomed in to read\. Press .+ to see it all\./)).toBeVisible();
  await expect.poll(async () => {
    const label = await page.getByRole('button', { name: /^Zoom \d+%$/ }).getAttribute('aria-label');
    return Number(/\d+/.exec(label ?? '')?.[0]);
  }).toBe(65);
});
