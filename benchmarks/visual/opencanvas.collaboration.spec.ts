import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, configurable: true });
    Object.defineProperty(window, 'WebSocket', { value: undefined, configurable: true });
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('commits a production node command through canonical collaboration', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = await headerCreate.isVisible()
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.locator('#json-import-input').setInputFiles({
    name: 'canonical-collaboration.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: '1.1', name: 'Canonical collaboration', diagramType: 'flowchart',
      nodes: [
        { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Alpha' } },
        { id: 'b', type: 'process', position: { x: 260, y: 0 }, data: { label: 'Beta' } },
      ],
      edges: [{ id: 'a-b', source: 'a', target: 'b' }],
    })),
  });
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.getByRole('link', { name: 'Try OpenCanvas' }).click();
  await expect(page).toHaveURL(/renderer=opencanvas/);
  await expect(page.getByText(/canonical collaboration/)).toBeVisible({ timeout: 30_000 });

  const label = page.getByRole('textbox', { name: 'Label for Alpha' });
  await label.fill('Collaborative Alpha');
  await label.press('Enter');
  await expect(page.getByRole('button', { name: 'Select Collaborative Alpha' })).toBeAttached();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(page.getByRole('button', { name: 'Select Alpha' })).toBeAttached();
  const redo = page.getByRole('button', { name: 'Redo' });
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(page.getByRole('button', { name: 'Select Collaborative Alpha' })).toBeAttached();

  await page.getByRole('link', { name: 'Use React Flow' }).click();
  await expect(page.locator('.react-flow__node', { hasText: 'Collaborative Alpha' })).toHaveCount(1);
});
