import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('creates a new flow and adds an extra tab', async ({ page }) => {
  await page.goto('/#/home');

  await expect(page.getByTestId('home-create-new')).toBeVisible();
  await page.getByTestId('home-create-new').click();

  await expect(page).toHaveURL(/#\/canvas$/);
  await expect(page.getByTestId('topnav-play')).toBeVisible();

  const tabs = page.getByTestId('flow-tab');
  const tabCountBefore = await tabs.count();

  await page.getByTestId('flow-tab-add').click();

  await expect(tabs).toHaveCount(tabCountBefore + 1);
  await expect(page.getByTestId('empty-generate-ai')).toBeVisible();
});

test('saves and restores snapshot state', async ({ page }) => {
  await page.goto('/#/canvas');
  await expect(page.getByTestId('topnav-history')).toBeVisible();

  const canvasNodes = page.locator('.react-flow__node');

  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByTestId('toolbar-add-node').click();
  await expect(canvasNodes).toHaveCount(1);

  await page.getByTestId('topnav-history').click();
  await page.getByTestId('snapshot-name-input').fill('E2E Snapshot');
  await page.getByTestId('snapshot-name-input').press('Enter');

  const snapshotInfo = await page.evaluate(() => {
    const rawSnapshots = localStorage.getItem('flowmind_snapshots');
    const snapshots = rawSnapshots ? JSON.parse(rawSnapshots) : [];
    return {
      id: snapshots[0]?.id as string | undefined,
      nodeCount: snapshots[0]?.nodes?.length as number | undefined,
    };
  });

  expect(snapshotInfo.id).toBeTruthy();
  expect(snapshotInfo.nodeCount).toBe(1);

  const restoreButton = page.getByTestId(`snapshot-restore-${snapshotInfo.id}`);
  await expect(restoreButton).toBeVisible();

  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByTestId('toolbar-add-node').click();
  await expect(canvasNodes).toHaveCount(2);

  await restoreButton.dispatchEvent('click');
  await expect(canvasNodes).toHaveCount(1);
});
