import { expect, test } from './test';

test('assistant asks for a provider on first send, then remembers it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true })
    .getByRole('button', { name: 'AI assistant', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI assistant' });
  await expect(panel.getByRole('button', { name: 'Connect an AI provider' })).toBeVisible();

  await panel.getByRole('button', { name: 'Sketch a three-tier web architecture' }).click();
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
  await expect(panel.getByRole('textbox', { name: 'Ask AI assistant' })).toHaveValue('Sketch a three-tier web architecture');
});

test('the send button is a square on the chips’ row, empty or not @gate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true })
    .getByRole('button', { name: 'AI assistant', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI assistant' });
  const send = panel.getByRole('button', { name: 'Send prompt' });
  const chip = panel.getByRole('button', { name: 'Think' });
  for (const text of ['', 'Sketch a login flow']) {
    await panel.getByRole('textbox', { name: 'Ask AI assistant' }).fill(text);
    const [button, row] = [(await send.boundingBox())!, (await chip.boundingBox())!];
    expect(button.width).toBe(button.height);
    expect(Math.abs(button.y + button.height / 2 - (row.y + row.height / 2))).toBeLessThanOrEqual(1);
  }
});
