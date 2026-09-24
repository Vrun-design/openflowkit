// Headed: the assistant is a conversation. A greeting gets talk, not a diagram;
// a drawing ask runs the agent (a tool step) into a reviewable proposal; an
// attached image reaches the provider; the thread survives a reload, New chat
// starts fresh and History reopens the old one. Every call goes to the local
// stub (stubProviderServer.mjs).
import { expect, test } from './test';

const STUB = 'http://127.0.0.1:4399/v1';
// A 1×1 PNG.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test('talks, draws on request, and keeps the thread per document', async ({ page }) => {
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

  await composer.fill('hi');
  await composer.press('Enter');
  await expect(panel.getByText('I can explain, review or draw diagrams.', { exact: false })).toBeVisible();
  await expect(panel.locator('strong', { hasText: 'explain' })).toBeVisible();
  await expect(panel.getByText('Review changes')).toHaveCount(0);

  await composer.fill('draw a flow for the stub');
  await composer.press('Enter');
  await expect(panel.getByText('Here is a start.')).toBeVisible();
  await expect(panel.getByText('1 step')).toBeVisible();
  await panel.getByText('1 step').click();
  await expect(panel.getByText('Drafted a new flowchart')).toBeVisible();
  await expect(panel.getByText('Review changes')).toBeVisible();
  await panel.getByRole('button', { name: /^Apply/ }).click();
  await expect(panel.getByText('Applied 1 change.')).toBeVisible();

  // Both turns are real history: the second request carried the first exchange.
  await expect(panel.locator('.ofk-message[data-role="user"]')).toHaveCount(2);

  await page.reload();
  await page.getByRole('toolbar', { name: 'Workspace', exact: true })
    .getByRole('button', { name: 'AI assistant', exact: true }).click();
  await expect(panel.getByText('Here is a start.')).toBeVisible();
  await expect(panel.getByText('Applied to the canvas')).toBeVisible();

  await panel.getByRole('button', { name: 'New chat' }).click();
  await expect(panel.locator('.ofk-message')).toHaveCount(0);
  await expect(composer).toBeFocused();

  // An image rides along with the turn; the stub counts what it received.
  await panel.getByTestId('assistant-attach-input').setInputFiles({ name: 'sketch.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(panel.getByRole('list', { name: 'Attached images' }).getByRole('img')).toHaveCount(1);
  await composer.fill('what is this?');
  await composer.press('Enter');
  await expect(panel.getByText('I can see 1 image.')).toBeVisible();
  await expect(panel.locator('.ofk-v2-turn-images img')).toHaveCount(1);
  await expect(panel.getByRole('list', { name: 'Attached images' })).toHaveCount(0);

  // History lists both chats; the first reopens with its thread.
  await panel.getByRole('button', { name: 'Chat history' }).click();
  const history = panel.getByRole('navigation', { name: 'Chats in this document' });
  await expect(history.getByRole('listitem')).toHaveCount(2);
  await history.getByRole('button', { name: /^hi/ }).click();
  await expect(panel.getByText('Here is a start.')).toBeVisible();
  await expect(panel.getByText('I can see 1 image.')).toHaveCount(0);
});
