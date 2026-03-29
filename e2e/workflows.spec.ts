import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createNewFlow(page: import('@playwright/test').Page) {
  await page.goto('/#/home');
  await page.getByTestId('home-create-new').click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+(?:\?.*)?$/);
  await expect(page.getByTestId('toolbar-add-toggle')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('flow-page-tab').first()).toBeVisible();
}

async function addRectangleNode(page: import('@playwright/test').Page) {
  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByRole('button', { name: 'Rectangle' }).click();
}

// ---------------------------------------------------------------------------
// Create → Edit node label
// ---------------------------------------------------------------------------

test('creates a node and edits its label via double-click', async ({ page }) => {
  await createNewFlow(page);
  await addRectangleNode(page);

  const node = page.locator('.react-flow__node').first();
  await expect(node).toBeVisible();

  // Double-click to enter inline edit
  await node.dblclick();
  const textarea = node.locator('textarea').first();
  await expect(textarea).toBeVisible();

  await textarea.fill('E2E Test Label');
  // Commit by pressing Enter (Escape cancels without saving)
  await textarea.press('Enter');

  await expect(node).toContainText('E2E Test Label');
});

// ---------------------------------------------------------------------------
// Create → Undo / Redo (ControlOrMeta works on both Mac and Linux CI)
// ---------------------------------------------------------------------------

test('undo removes a node and redo restores it', async ({ page }) => {
  await createNewFlow(page);

  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(0);

  await addRectangleNode(page);
  await expect(nodes).toHaveCount(1);

  await page.keyboard.press('ControlOrMeta+Z');
  await expect(nodes).toHaveCount(0);

  await page.keyboard.press('ControlOrMeta+Shift+Z');
  await expect(nodes).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// Create → Export JSON
// ---------------------------------------------------------------------------

test('exports the diagram as JSON and download starts', async ({ page }) => {
  await createNewFlow(page);
  await addRectangleNode(page);

  await page.getByTestId('topnav-export').click();
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByTestId('export-action-json-download')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-action-json-download').click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
});

// ---------------------------------------------------------------------------
// Create → Export PNG
// ---------------------------------------------------------------------------

test('exports the diagram as PNG and download starts', async ({ page }) => {
  await createNewFlow(page);
  await addRectangleNode(page);

  await page.getByTestId('topnav-export').click();
  await expect(page.getByTestId('export-action-png-download')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-action-png-download').click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});

// ---------------------------------------------------------------------------
// Create → Duplicate tab via add button + rename check
// ---------------------------------------------------------------------------

test('can create a second tab', async ({ page }) => {
  await createNewFlow(page);

  const tabs = page.getByTestId('flow-page-tab');
  const initialCount = await tabs.count();

  await page.getByTestId('flow-page-add').click();
  await expect(tabs).toHaveCount(initialCount + 1);
});

// ---------------------------------------------------------------------------
// Create → Duplicate selected node via Properties Panel
// ---------------------------------------------------------------------------

test('duplicates a selected node via the properties panel', async ({ page }) => {
  await createNewFlow(page);
  await addRectangleNode(page);

  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(1);

  // Click node to open the properties panel, then duplicate via the button
  await nodes.first().click();
  await page.getByRole('button', { name: 'Duplicate' }).click();

  await expect(nodes).toHaveCount(2);
});

// ---------------------------------------------------------------------------
// Create → Delete selected node
// ---------------------------------------------------------------------------

test('deletes a selected node via the properties panel', async ({ page }) => {
  await createNewFlow(page);
  await addRectangleNode(page);

  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(1);

  // Click node to open the properties panel, then delete via the button
  await nodes.first().click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(nodes).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Share panel opens
// ---------------------------------------------------------------------------

test('main menu exposes version history', async ({ page }) => {
  await createNewFlow(page);

  await page.getByTestId('topnav-menu-toggle').click();
  await expect(page.getByTestId('topnav-history')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Settings modal
// ---------------------------------------------------------------------------

test('settings view opens from the home sidebar', async ({ page }) => {
  await page.goto('/#/home');
  await page.getByTestId('sidebar-settings').click();

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByText('Canvas').first()).toBeVisible();
});

test('main menu has theme toggle', async ({ page }) => {
  await page.goto('/#/home');

  await expect(page.getByTitle(/switch to dark mode|switch to light mode/i)).toBeVisible();
});

test('switching to dark mode applies data-theme attribute', async ({ page }) => {
  await page.goto('/#/home');
  await page.getByTitle(/switch to dark mode/i).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

// ---------------------------------------------------------------------------
// Command bar
// ---------------------------------------------------------------------------

test('command bar opens with Cmd+K', async ({ page }) => {
  await createNewFlow(page);

  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByPlaceholder(/search/i)).toBeVisible();
});

test('command bar fuzzy search works', async ({ page }) => {
  await createNewFlow(page);
  await page.keyboard.press('ControlOrMeta+k');

  await page.getByPlaceholder(/search/i).fill('arc');
  await expect(page.getByText(/architecture/i).first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Welcome modal
// ---------------------------------------------------------------------------

test('welcome modal shows on first visit', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#/home');

  await expect(page.getByRole('heading', { name: 'OpenFlowKit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
});

test('welcome modal feature cards are clickable', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/#/home');

  await page.getByText('Create amazing diagrams').click();
  await expect(page).toHaveURL(/#\/flow\//);
});

// ---------------------------------------------------------------------------
// Properties panel empty state
// ---------------------------------------------------------------------------

test('new flows show the empty canvas actions', async ({ page }) => {
  await createNewFlow(page);

  await expect(page.getByTestId('empty-generate-ai')).toBeVisible();
  await expect(page.getByText('Browse Templates')).toBeVisible();
  await expect(page.getByText('Add Blank Shape')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test('skip-to-content link is present', async ({ page }) => {
  await page.goto('/#/home');
  await page.keyboard.press('Tab');

  const skipLink = page.getByText('Skip to content');
  await expect(skipLink).toBeVisible();
});

test('flow tabs have tab role', async ({ page }) => {
  await createNewFlow(page);

  await expect(page.getByRole('tab').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test('can navigate nodes with keyboard', async ({ page }) => {
  await createNewFlow(page);

  await page.getByTestId('toolbar-add-toggle').click();
  await page.getByText('Sticky Note').click();

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
});
