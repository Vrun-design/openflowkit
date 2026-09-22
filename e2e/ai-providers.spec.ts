// One headed spec for the BYOK settings surface. Every request goes to the
// local stub server (e2e/stubProviderServer.mjs); no real provider or key is
// touched. The stub echoes the key in its 401 body, so "the key never reaches
// the user" is asserted against a server that is actively trying to leak it.
import { expect, test, type Page } from '@playwright/test';

const STUB = 'http://127.0.0.1:4399';

async function openProviderDialog(page: Page) {
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true })
    .getByRole('button', { name: 'AI assistant', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI assistant' });
  await panel.getByRole('button', { name: 'Connect an AI provider' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI provider' });
  await expect(dialog.getByLabel('API key')).toBeFocused();
  return dialog;
}

test('diagnoses a bad key, never echoes it, and clears every stored key', async ({ page }) => {
  const dialog = await openProviderDialog(page);
  await dialog.getByRole('button', { name: 'Use Custom' }).click();
  await dialog.getByLabel('API key').fill('sk-bad');
  await dialog.locator('summary').click();
  await dialog.getByLabel('Base URL').fill(`${STUB}/v1`);
  await dialog.getByLabel('Model').fill('stub-model');
  await dialog.getByRole('button', { name: 'Test key' }).click();

  const status = dialog.getByRole('status');
  await expect(status).toContainText('rejected the key (401)');
  await expect(status).toHaveAttribute('data-cause', 'bad-key');
  await expect(status).not.toContainText('sk-bad');

  await dialog.getByRole('button', { name: 'Clear all keys' }).click();
  await expect(dialog.getByLabel('API key')).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('complementary', { name: 'AI assistant' })
    .getByRole('button', { name: 'Connect an AI provider' })).toBeVisible();
});

test('tests a key through the Google wire and shows the provider risk honestly', async ({ page }) => {
  const dialog = await openProviderDialog(page);
  await dialog.getByRole('button', { name: 'Use Gemini' }).click();
  await expect(dialog.getByRole('button', { name: 'Use Gemini' })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByText('Browser-ready', { exact: true })).toBeVisible();
  await dialog.getByLabel('API key').fill('sk-ok');
  await dialog.locator('summary').click();
  await dialog.getByLabel('Base URL').fill(STUB);
  await dialog.getByLabel('Model').fill('stub-gemini');
  await dialog.getByRole('button', { name: 'Test key' }).click();
  await expect(dialog.getByRole('status')).toContainText('Connected');
  await expect(dialog.getByRole('status')).toContainText('stub-gemini answered');

  await dialog.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'AI assistant' })
    .getByRole('button', { name: /^AI provider: stub-gemini/ })).toBeVisible();
});

test('sends the Anthropic wire and warns where the browser may refuse', async ({ page }) => {
  const dialog = await openProviderDialog(page);
  await dialog.getByRole('button', { name: 'Use Claude' }).click();
  await expect(dialog.getByText('Depends on endpoint')).toBeVisible();
  await dialog.getByRole('button', { name: 'Use Groq' }).click();
  await expect(dialog.getByText('Proxy likely')).toBeVisible();
  await dialog.getByRole('button', { name: 'Use Claude' }).click();

  await dialog.getByLabel('API key').fill('sk-ok');
  await dialog.locator('summary').click();
  await dialog.getByLabel('Base URL').fill(STUB);
  await dialog.getByLabel('Model').fill('stub-claude');
  await dialog.getByRole('button', { name: 'Test key' }).click();
  await expect(dialog.getByRole('status')).toContainText('stub-claude answered');
});
