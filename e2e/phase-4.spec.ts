import { expect, test } from '@playwright/test';

// Phase 4 UX: code-panel palette, pages, export (real PNG raster), cheatsheet.
// One headed check for the slice — npm run e2e:headed -- e2e/phase-4.spec.ts

const DSL = `%% ofk 1
flowchart

  Client [blue] -> API [emerald] : HTTPS
  API -> Store [cylinder, red]
`;

interface V2Shape { id: string; kind: string; appearance?: { fill?: string } }
interface V2PageShape { id: string; name: string; nodes: V2Shape[] }
interface V2Api {
  getDocument(): { pages: V2PageShape[] } | null;
}

const state = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const api = (window as unknown as { __V2__?: V2Api }).__V2__;
    const document = api?.getDocument?.() ?? null;
    return {
      pages: (document?.pages ?? []).map(({ id, name, nodes }) => ({ id, name, shapes: nodes.filter((node) => node.kind !== 'frame').length })),
      clientFill: document?.pages[0]?.nodes.find(({ id }) => id === 'client')?.appearance?.fill ?? null,
    };
  });

test('palette, pages, export and cheatsheet work end to end', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');

  // --- code panel: palette picker + generate ------------------------------
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(DSL);
  await page.getByRole('radio', { name: 'Paper', exact: true }).check();
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(async () => (await state(page)).pages[0]?.shapes).toBe(3);
  // Paper, not pastel: the blue swatch is the warm tint, not #eff6ff.
  expect((await state(page)).clientFill).not.toBe('#eff6ff');
  await page.getByRole('button', { name: 'Close panel' }).click();

  // --- pages ---------------------------------------------------------------
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.getByRole('button', { name: 'Add page' }).click();
  await expect.poll(async () => (await state(page)).pages.length).toBe(2);
  const firstPageName = (await state(page)).pages[0]!.name;
  const second = (await state(page)).pages[1]!;
  await page.getByLabel(`Actions for ${second.name}`).click();
  await page.getByRole('menuitem', { name: 'Move up' }).click();
  await expect.poll(async () => (await state(page)).pages[0]!.id).toBe(second.id);
  await page.getByLabel(`Actions for ${second.name}`).click();
  await page.getByRole('menuitem', { name: 'Move down' }).click();
  await expect.poll(async () => (await state(page)).pages[1]!.id).toBe(second.id);
  await page.getByLabel(`Actions for ${second.name}`).click();
  await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
  await expect.poll(async () => (await state(page)).pages.length).toBe(3);
  const third = (await state(page)).pages[2]!;
  await page.getByLabel(`Actions for ${third.name}`).click();
  await page.getByRole('menuitem', { name: 'Delete page' }).click();
  await expect.poll(async () => (await state(page)).pages.length).toBe(2);
  // Switch to the empty page (row button, not the bar button), then close.
  await page.locator('.ofk-v2-page-select').filter({ hasText: second.name }).click();
  await page.getByRole('button', { name: 'Close pages' }).click();

  // The empty page cannot be exported: the button says so instead of failing.
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();
  await expect(page.getByText('this page has no shapes')).toBeVisible();
  await page.keyboard.press('Escape');

  // Back to the page with the diagram before exporting.
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.locator('.ofk-v2-page-select').filter({ hasText: firstPageName }).click();
  await page.getByRole('button', { name: 'Close pages' }).click();

  // --- export: a real 2x PNG download --------------------------------------
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const png = await download;
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  await expect(page.getByText(/downloaded/)).toBeVisible();

  // --- cheatsheet (focus the canvas so the shortcut reaches the editor) ----
  await page.keyboard.press('Escape');
  await page.locator('[data-testid="v2-canvas"]').click({ position: { x: 480, y: 480 } });
  await page.keyboard.press('Shift+Slash');
  await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expect(page.getByText('Align left/right/top/bottom')).toBeVisible();
});
