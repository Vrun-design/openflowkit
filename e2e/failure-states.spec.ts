import { createServer } from 'node:net';
import { expect, test } from './test';

// Workstream A: every failure state, provoked by the real condition, says what happened
// and has a way out that works.
// npm run e2e:headed -- e2e/failure-states.spec.ts

test('WebGL off: honest state, canvas tools gone, code and the list still reachable @gate', async ({ playwright }) => {
  // A browser without WebGL is a launch flag, so this test owns its browser.
  const browser = await playwright.chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:4173' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/');
    const state = page.getByTestId('v2-webgl-off');
    await expect(state.getByRole('alert')).toContainText('This browser can’t draw the canvas.');
    await expect(state).toContainText('hardware acceleration');
    await expect(page.getByRole('toolbar', { name: 'View' })).toHaveCount(0);
    await expect(page.getByRole('toolbar', { name: 'Create' })).toHaveCount(0);

    await state.getByRole('button', { name: 'Diagram as code' }).click();
    await expect(page.getByRole('textbox', { name: 'Diagram source' })).toBeVisible();
    await page.getByRole('button', { name: 'Close panel' }).click();
    await state.getByRole('button', { name: 'Back to home' }).click();
    await expect(page).toHaveURL(/#\/home$/);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test.describe('storage blocked', () => {
  // Private windows and blocked site data leave the app without IndexedDB.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
  });

  test('a diagram says why it did not open and leads back to the list @gate', async ({ page }) => {
    await page.goto('/#/d/doc-anything');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Diagrams can’t be opened here.');
    await expect(alert).toContainText('blocking site storage');
    await expect(alert).not.toContainText('IndexedDB');
    await alert.getByRole('button', { name: 'Back to home' }).click();
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.getByRole('alert')).toContainText('blocking site storage');
    await expect(page.getByRole('button', { name: 'New diagram' })).toBeDisabled();
  });
});

test('a damaged diagram offers the diagnostic and a way back @gate', async ({ page }) => {
  await page.goto('/#/home');
  // Home creates the database from its own chunk; a version-less open before that would create an empty one.
  await expect.poll(() => page.evaluate(async () =>
    (await indexedDB.databases()).some(({ name }) => name === 'openflowkit-persistence'))).toBe(true);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('openflowkit-persistence');
    open.onsuccess = () => {
      const tx = open.result.transaction('v2Documents', 'readwrite');
      tx.objectStore('v2Documents').put({ id: 'doc-broken', revision: 1, schemaVersion: 1, savedAt: new Date().toISOString(), document: { garbage: true } });
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    open.onerror = () => reject(open.error);
  }));
  await page.goto('/#/d/doc-broken');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('This diagram is damaged.');
  await expect(alert.getByRole('button', { name: 'Download diagnostic report' })).toBeVisible();
  await alert.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/#\/home$/);
});

/** A port that was free a moment ago: nothing listens there. */
async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('agent bridge with nothing listening names the port and opens the settings @gate', async ({ page }) => {
  const port = await closedPort();
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Connect agent', exact: true }).click();
  await page.locator('summary', { hasText: 'Connection settings' }).click();
  await page.locator('#ofk-bridge-port').fill(String(port));
  await page.locator('#ofk-bridge-port').blur();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(`Nothing is listening on 127.0.0.1:${port}.`, { timeout: 15_000 });
  await expect(page.locator('details.ofk-connection-details').first()).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('opening a broken file says what opens instead @gate', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Open file…' }).click();
  await (await chooser).setFiles({ name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
  await expect(page.getByText('That file couldn’t be opened.')).toBeVisible();
  await expect(page.getByText(/opens the \.json files it exports/)).toBeVisible();
});

test('an unreadable old viewer link explains itself and leads home @gate', async ({ page }) => {
  await page.goto('/#/view?flow=~not-a-real-payload');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('This link couldn’t be read.');
  await alert.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/#\/home$/);
});
