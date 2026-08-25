import { expect, test } from '@playwright/test';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../src/opencanvas/testing/builders/documentBuilder';

const CRASH_JOURNAL_KEY = 'openflowkit:crash-journal:v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('recovers a journaled OpenCanvas edit after a forced renderer crash', async ({
  context,
  page,
}) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.locator('#json-import-input').setInputFiles({
    name: 'crash-recovery.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'Crash recovery proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'a',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'Baseline Alpha' },
          },
        ],
        edges: [],
      })
    ),
  });
  await expect(page.locator('.react-flow__node', { hasText: 'Baseline Alpha' })).toHaveCount(1);
  await page.waitForTimeout(500);
  await page.getByRole('link', { name: 'Try OpenCanvas' }).click();
  await expect(page).toHaveURL(/renderer=opencanvas/);
  await expect(page.getByRole('button', { name: 'Select Baseline Alpha' })).toBeAttached();
  await page.evaluate((key) => localStorage.removeItem(key), CRASH_JOURNAL_KEY);

  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  const label = page.getByRole('textbox', { name: 'Label for Baseline Alpha' });
  await label.fill('Recovered after forced crash');
  await label.press('Enter');
  const journal = await page.evaluate((key) => localStorage.getItem(key), CRASH_JOURNAL_KEY);
  expect(journal).toContain('Recovered after forced crash');

  const crashUrl = page.url();
  const crashEvent = page.waitForEvent('crash');
  const session = await context.newCDPSession(page);
  void session.send('Page.crash').catch(() => undefined);
  await crashEvent;

  const recoveredPage = await context.newPage();
  await recoveredPage.goto(crashUrl);
  const recovery = recoveredPage.getByRole('alertdialog', { name: 'Recover unsaved work' });
  await expect(recovery).toBeVisible();
  await recovery.getByRole('button', { name: 'Recover work' }).click();
  await expect(recovery).not.toBeAttached();
  await expect(
    recoveredPage.getByRole('button', {
      name: 'Select Recovered after forced crash',
    })
  ).toBeAttached();
});

test('requires explicit consent before repairing a canonical import', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);

  const document = createTestDocument({
    nodes: [createTestNode('a'), createTestNode('b')],
    connectors: [createTestConnector('a-b', 'a', 'b')],
  });
  const pageModel = document.pages[0];
  const invalid = {
    ...document,
    pages: [
      {
        ...pageModel,
        nodes: pageModel.nodes.map((node, index) =>
          index === 0 ? { ...node, layerId: 'missing-layer' } : node
        ),
        connectors: [
          {
            ...pageModel.connectors[0],
            target: { ...pageModel.connectors[0].target, nodeId: 'missing-node' },
          },
        ],
      },
    ],
  };
  await page.locator('#json-import-input').setInputFiles({
    name: 'repairable-canonical.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  });

  const dialog = page.getByRole('dialog', { name: 'Import needs attention' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('.react-flow__node')).not.toHaveCount(2);
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download original' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('repairable-canonical-before-repair.json');
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream) backup += chunk.toString();
  expect(JSON.parse(backup)).toEqual(invalid);
  await dialog.getByRole('button', { name: 'Repair canonical document' }).click();
  await expect(dialog).not.toBeAttached();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await expect(page.getByText(/Canonical integrity repair for page-1\/a:/)).toBeVisible();
  await expect(page.getByText(/Canonical integrity repair for page-1\/a-b:/)).toBeVisible();
});

test('warns on browser-wide storage pressure and downloads a backup', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 950_000_000, quota: 1_000_000_000 }),
        persisted: async () => false,
        persist: async () => true,
      },
    });
  });
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.locator('#json-import-input').setInputFiles({
    name: 'quota-proof.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'Quota proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'quota-node',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'Quota node' },
          },
        ],
        edges: [],
      })
    ),
  });
  await expect(page.locator('.react-flow__node', { hasText: 'Quota node' })).toHaveCount(1);

  const pressure = page.getByRole('alert', { name: 'Browser storage pressure' });
  await expect(pressure).toContainText('95% used');
  await expect(pressure).toContainText('not granted persistent storage');
  const downloadPromise = page.waitForEvent('download');
  await pressure.getByRole('button', { name: 'Download JSON backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream) backup += chunk.toString();
  expect((JSON.parse(backup) as { nodes: Array<{ id: string }> }).nodes[0]?.id).toBe('quota-node');
  await pressure.getByRole('button', { name: 'Protect local data' }).click();
  await expect(pressure).toContainText('Persistent storage granted');
  await expect(pressure.getByRole('button', { name: 'Protect local data' })).not.toBeAttached();
  await pressure.getByRole('button', { name: 'Dismiss storage warning' }).click();
  await expect(pressure).not.toBeAttached();
});

test('downloads a canonical backup before dashboard deletion', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.waitForTimeout(500);
  await page.goto('/#/home');

  await page.getByLabel('Delete').first().click();
  const dialog = page.getByRole('dialog', { name: 'Delete flow' });
  const destructiveAction = dialog.getByRole('button', {
    name: 'Download backup & delete',
  });
  await expect(destructiveAction).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await destructiveAction.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-pre-delete-backup\.json$/);
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream) backup += chunk.toString();
  const parsed = JSON.parse(backup) as { schemaVersion: number; pages: unknown[] };
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.pages).toHaveLength(1);
  await expect(dialog).not.toBeAttached();
  await expect(page.getByTestId('home-create-new-main')).toBeVisible();
});

test('downloads one canonical workspace bundle before atomic bulk deletion', async ({ page }) => {
  await page.goto('/#/home');
  await page.getByTestId('home-create-new-main').click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.waitForTimeout(500);

  await page.goto('/#/home');
  await page.getByTestId('home-create-new-header').click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.waitForTimeout(500);
  await page.goto('/#/home');

  await page.getByRole('button', { name: 'Select all' }).click();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete selected (2)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete selected flows' });
  const destructiveAction = dialog.getByRole('button', {
    name: 'Download backup & delete 2 flows',
  });
  await expect(destructiveAction).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await destructiveAction.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('openflowkit-workspace-pre-delete-backup.json');
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream) backup += chunk.toString();
  const parsed = JSON.parse(backup) as {
    format: string;
    schemaVersion: number;
    documents: Array<{ id: string; schemaVersion: number }>;
  };
  expect(parsed).toMatchObject({
    format: 'openflowkit-canonical-workspace-bundle',
    schemaVersion: 1,
  });
  expect(parsed.documents).toHaveLength(2);
  expect(new Set(parsed.documents.map((document) => document.id)).size).toBe(2);
  expect(parsed.documents.every((document) => document.schemaVersion === 1)).toBe(true);
  await expect(dialog).not.toBeAttached();
  await expect(page.getByTestId('home-create-new-main')).toBeVisible();

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('openflowkit-persistence', 3);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        const count = await new Promise<number>((resolve, reject) => {
          const transaction = database.transaction('documents', 'readonly');
          const request = transaction.objectStore('documents').count();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        database.close();
        return count;
      })
    )
    .toBe(0);
});

test('scrubs undo history atomically with keyboard-accessible feedback', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await page.locator('#json-import-input').setInputFiles({
    name: 'history-scrub.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'History scrub proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'history-node',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'History survives' },
          },
        ],
        edges: [],
      })
    ),
  });
  await expect(page.locator('.react-flow__node', { hasText: 'History survives' })).toHaveCount(1);

  await page.getByTestId('topnav-menu-toggle').click();
  await page.getByTestId('topnav-history').click();
  const slider = page.getByRole('slider', { name: 'Scrub through recent undo history' });
  await expect(slider).toHaveValue('1');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Step 2 of 2');

  await slider.press('Home');
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  await expect(slider).toHaveValue('0');
  await expect(page.getByText('You are at the earliest captured state.')).toBeVisible();

  await slider.press('End');
  await expect(page.locator('.react-flow__node', { hasText: 'History survives' })).toHaveCount(1);
  await expect(slider).toHaveValue('1');
  await expect(page.getByText('You are at the latest state.')).toBeVisible();
});

test('downloads a canonical backup before deleting a named snapshot', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await page.locator('#json-import-input').setInputFiles({
    name: 'snapshot-delete-proof.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'Snapshot delete proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'protected-snapshot-node',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'Protected snapshot node' },
          },
        ],
        edges: [],
      })
    ),
  });
  await expect(
    page.locator('.react-flow__node', { hasText: 'Protected snapshot node' })
  ).toHaveCount(1);
  await page.getByTestId('topnav-menu-toggle').click();
  await page.getByTestId('topnav-history').click();
  await page.getByTestId('snapshot-name-input').fill('Browser protected snapshot');
  await page.getByRole('button', { name: 'Save Current Version' }).click();

  const card = page
    .getByRole('heading', { name: 'Browser protected snapshot' })
    .locator('..')
    .locator('..');
  const prepareDelete = card.getByRole('button', {
    name: 'Delete version: Browser protected snapshot',
  });
  await prepareDelete.click();
  await expect(page.getByRole('heading', { name: 'Browser protected snapshot' })).toBeVisible();
  const downloadAndDelete = card.getByRole('button', {
    name: 'Download backup and delete: Browser protected snapshot',
  });
  await expect(downloadAndDelete).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await downloadAndDelete.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('browser-protected-snapshot-pre-delete-backup.json');
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream) backup += chunk.toString();
  const parsed = JSON.parse(backup) as {
    schemaVersion: number;
    pages: Array<{ nodes: Array<{ id: string }> }>;
  };
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.pages[0].nodes[0].id).toBe('protected-snapshot-node');
  await expect(
    page.getByRole('heading', { name: 'Browser protected snapshot' })
  ).not.toBeAttached();
});

test('shows bounded per-category local storage accounting in settings', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 10 * 1_048_576, quota: 100 * 1_048_576 }),
        persisted: async () => false,
      },
    });
  });
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await page.locator('#json-import-input').setInputFiles({
    name: 'storage-accounting-proof.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'Storage accounting proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'accounted-node',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'Accounted node' },
          },
        ],
        edges: [],
      })
    ),
  });
  await page.getByTestId('topnav-menu-toggle').click();
  await page.getByTestId('topnav-history').click();
  await page.getByTestId('snapshot-name-input').fill('Accounted snapshot');
  await page.getByRole('button', { name: 'Save Current Version' }).click();
  await expect(page.getByRole('heading', { name: 'Accounted snapshot' })).toBeVisible();
  await page.waitForTimeout(500);

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Local storage' })).toBeVisible();
  await expect(page.getByText('10.0 MB of 100.0 MB used in this browser origin')).toBeVisible();
  const categories = page.getByTestId('storage-accounting-categories');
  await expect(categories.locator(':scope > div')).toHaveCount(6);
  const positiveStorageAmount = /^[1-9][\d.]* (?:B|KB|MB|GB)$/;
  await expect(page.getByTestId('storage-category-documents').locator('dd')).toHaveText(
    positiveStorageAmount
  );
  await expect(page.getByTestId('storage-category-snapshots').locator('dd')).toHaveText(
    positiveStorageAmount
  );
  await expect(page.getByTestId('storage-category-assets')).toContainText('0 B');
  await page.getByRole('button', { name: 'Refresh storage estimate' }).click();
  await expect(page.getByText('Estimate complete.')).toBeVisible();
});

test('discovers hidden editor actions and views through semantic command search', async ({
  page,
}) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);

  await page.getByRole('button', { name: 'Open Command Center' }).click();
  const search = page.getByRole('combobox', { name: 'Search command bar actions' });
  await search.fill('phone mockup');
  await expect(page.getByRole('option', { name: /Add Mobile Wireframe/ })).toBeVisible();
  await expect(search).toHaveAttribute('aria-activedescendant', /-option-0$/);
  await search.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Command bar' })).not.toBeAttached();
  await expect(page.locator('.react-flow__node', { hasText: 'Mobile App' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Open Command Center' }).click();
  const viewSearch = page.getByRole('combobox', { name: 'Search command bar actions' });
  await viewSearch.fill('multi page');
  await expect(page.getByRole('option', { name: /Manage Pages/ })).toBeVisible();
  await viewSearch.press('Enter');
  await expect(page.getByText('Pages', { exact: true })).toBeVisible();
});

test('searches and executes shapes, icons, and templates from one command field', async ({
  page,
}) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);

  await page.getByRole('button', { name: 'Open Command Center' }).click();
  let search = page.getByRole('combobox', { name: 'Search command bar actions' });
  await search.fill('decision branch');
  await expect(page.getByRole('option', { name: /Diamond.*Shape/ })).toBeVisible();
  await search.press('Enter');
  await expect(page.locator('.react-flow__node', { hasText: 'Diamond' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Open Command Center' }).click();
  search = page.getByRole('combobox', { name: 'Search command bar actions' });
  await search.fill('radar infra');
  await expect(page.getByRole('option', { name: /Radar.*Icon/ })).toBeVisible();
  await search.press('Enter');
  await expect(page.locator('.react-flow__node', { hasText: 'Radar' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Open Command Center' }).click();
  search = page.getByRole('combobox', { name: 'Search command bar actions' });
  await search.fill('event driven saas');
  await expect(
    page.getByRole('option', { name: /AWS Event-Driven SaaS Platform.*Template/ })
  ).toBeVisible();
  await search.press('Enter');
  await expect(page.locator('.react-flow__node', { hasText: 'API Gateway' })).toHaveCount(1);
  await expect(page.locator('.react-flow__node')).toHaveCount(11);
});

test('executes context-bound selection commands atomically with undo', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await page.locator('#json-import-input').setInputFiles({
    name: 'context-command-proof.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'Context command proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'context-a',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'Context Alpha' },
          },
          {
            id: 'context-b',
            type: 'process',
            position: { x: 300, y: 160 },
            data: { label: 'Context Beta' },
          },
          {
            id: 'context-c',
            type: 'process',
            position: { x: 600, y: 320 },
            data: { label: 'Context Gamma' },
          },
        ],
        edges: [{ id: 'context-edge', source: 'context-a', target: 'context-b' }],
      })
    ),
  });
  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(3);
  await page.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('Control+a');

  await page.getByRole('button', { name: 'Open Command Center' }).click();
  let search = page.getByRole('combobox', { name: 'Search command bar actions' });
  await search.fill('align left selection');
  await expect(page.getByRole('option', { name: /Align Left.*Selection/ })).toBeVisible();
  await search.press('Enter');
  const alignedBoxes = await Promise.all([
    page.locator('.react-flow__node', { hasText: 'Context Alpha' }).boundingBox(),
    page.locator('.react-flow__node', { hasText: 'Context Beta' }).boundingBox(),
    page.locator('.react-flow__node', { hasText: 'Context Gamma' }).boundingBox(),
  ]);
  expect(alignedBoxes.every((box) => box !== null)).toBe(true);
  expect(
    Math.max(...alignedBoxes.map((box) => box?.x ?? 0)) -
      Math.min(...alignedBoxes.map((box) => box?.x ?? 0))
  ).toBeLessThan(2);

  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => {
      const alpha = await page
        .locator('.react-flow__node', { hasText: 'Context Alpha' })
        .boundingBox();
      const beta = await page
        .locator('.react-flow__node', { hasText: 'Context Beta' })
        .boundingBox();
      return Math.abs((alpha?.x ?? 0) - (beta?.x ?? 0));
    })
    .toBeGreaterThan(50);

  await page.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
  const edgePath = page.locator('.react-flow__edge[data-id="context-edge"] .react-flow__edge-path');
  const originalPath = await edgePath.getAttribute('d');
  await page
    .locator('.react-flow__edge[data-id="context-edge"] .react-flow__edge-interaction')
    .click({ force: true });
  await page.getByRole('button', { name: 'Open Command Center' }).click();
  search = page.getByRole('combobox', { name: 'Search command bar actions' });
  await search.fill('swap source target');
  await expect(page.getByRole('option', { name: /Reverse Direction.*Selection/ })).toBeVisible();
  await search.press('Enter');
  await expect.poll(() => edgePath.getAttribute('d')).not.toBe(originalPath);
  await page.keyboard.press('Control+z');
  await expect.poll(() => edgePath.getAttribute('d')).toBe(originalPath);
});

test('downloads original persisted workspace before explicit reference repair', async ({
  page,
}) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = (await headerCreate.isVisible())
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await page.locator('#json-import-input').setInputFiles({
    name: 'persisted-repair-proof.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '1.1',
        name: 'Persisted repair proof',
        diagramType: 'flowchart',
        nodes: [
          {
            id: 'persisted-node',
            type: 'process',
            position: { x: 0, y: 0 },
            data: { label: 'Persisted node' },
          },
        ],
        edges: [],
      })
    ),
  });
  await expect(page.locator('.react-flow__node', { hasText: 'Persisted node' })).toHaveCount(1);
  await page.waitForTimeout(750);

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('openflowkit-persistence', 3);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('documents', 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const document = request.result[0] as {
          pages: Array<{
            content: {
              nodes: Array<{ data: Record<string, unknown> }>;
              edges: Array<Record<string, unknown>>;
            };
          }>;
        };
        document.pages[0].content.nodes[0].data.layerId = 'missing-layer';
        document.pages[0].content.edges.push({
          id: 'persisted-orphan',
          source: 'persisted-node',
          target: 'missing-target',
        });
        store.put(document);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  const dialog = page.getByRole('alertdialog', { name: 'Repair saved workspace?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('2 invalid references can be repaired');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download backup & repair' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('openflowkit-workspace-before-repair.json');
  const stream = await download.createReadStream();
  let backup = '';
  for await (const chunk of stream) backup += chunk.toString();
  const parsed = JSON.parse(backup) as {
    format: string;
    documents: Array<{ pages: Array<{ content: { edges: Array<{ id: string }> } }> }>;
  };
  expect(parsed.format).toBe('openflowkit-persisted-workspace-backup');
  expect(parsed.documents[0].pages[0].content.edges[0].id).toBe('persisted-orphan');
  await expect(dialog).not.toBeAttached();
  await expect(page.locator('.react-flow__node', { hasText: 'Persisted node' })).toHaveCount(1);
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);

  const persisted = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('openflowkit-persistence', 3);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const result = await new Promise<{
      pages: Array<{
        content: {
          nodes: Array<{ data: { layerId?: string } }>;
          edges: unknown[];
        };
      }>;
    }>((resolve, reject) => {
      const request = database.transaction('documents').objectStore('documents').getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result[0]);
    });
    database.close();
    return result;
  });
  expect(persisted.pages[0].content.nodes[0].data.layerId).toBe('default');
  expect(persisted.pages[0].content.edges).toEqual([]);
});
