import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

async function openHomeDashboard(page: import('@playwright/test').Page) {
  await page.goto('/#/home');
  await expect(page.getByTestId('home-create-new-main')).toBeVisible({ timeout: 15000 });
}

async function createNewFlow(page: import('@playwright/test').Page) {
  await openHomeDashboard(page);
  await page.getByTestId('home-create-new-main').click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+(?:\?.*)?$/);
  await expect(page.getByTestId('flow-page-tab').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('topnav-menu-toggle')).toBeVisible({ timeout: 15000 });
}

test('creates a new flow and adds an extra tab', async ({ page }) => {
  await createNewFlow(page);
  await expect(page.getByTestId('toolbar-add-toggle')).toBeVisible({ timeout: 15000 });

  const tabs = page.getByTestId('flow-page-tab');
  await expect(tabs.first()).toBeVisible();
  const tabCountBefore = await tabs.count();

  await page.getByTestId('flow-page-add').click();

  await expect(tabs).toHaveCount(tabCountBefore + 1);
  await expect(page.getByTestId('empty-generate-ai')).toBeVisible();
});

test('saves and restores snapshot state', async ({ page }) => {
  await createNewFlow(page);
  await expect(page.getByTestId('toolbar-add-toggle')).toBeVisible({ timeout: 15000 });

  const canvasNodes = page.locator('.react-flow__node');

  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await expect(canvasNodes).toHaveCount(1);

  await page.getByTestId('topnav-menu-toggle').click();
  await expect(page.getByTestId('topnav-history')).toBeVisible();
  await page.getByTestId('topnav-history').click();
  await page.getByTestId('snapshot-name-input').fill('E2E Snapshot');
  await page.getByTestId('snapshot-name-input').press('Enter');

  const restoreButton = page.locator('[data-testid^="snapshot-restore-"]').first();
  await expect(restoreButton).toBeVisible();

  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await expect(canvasNodes).toHaveCount(2);

  await restoreButton.dispatchEvent('click');
  await expect(canvasNodes).toHaveCount(1);
});
