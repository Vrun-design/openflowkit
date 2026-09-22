import { expect, test } from '@playwright/test';

test('assistant asks for a provider on first send, then remembers it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true })
    .getByRole('button', { name: 'AI assistant', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI assistant' });
  await expect(panel.getByRole('button', { name: 'Connect an AI provider' })).toBeVisible();

  await panel.getByRole('button', { name: 'Sketch a three-tier architecture' }).click();
  await expect(panel.getByRole('textbox', { name: 'Ask AI assistant' })).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'AI provider' });
  await expect(dialog.getByLabel('API key')).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Connect', exact: true })).toBeDisabled();
  await page.keyboard.type('sk-test');
  await page.keyboard.press('Enter');

  await expect(dialog).toBeHidden();
  await expect(panel.getByRole('button', { name: /^AI provider: claude/ })).toBeVisible();
  await expect(panel.getByRole('textbox', { name: 'Ask AI assistant' })).toBeFocused();
  await expect(panel.getByRole('textbox', { name: 'Ask AI assistant' })).toHaveValue('Sketch a three-tier architecture');
});
