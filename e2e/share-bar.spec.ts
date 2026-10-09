import { expect, test } from './test';
import { openCanvas } from './helpers';

// The top-right bar mirrors the document bar: same top line, the workspace rail hangs below it
// with the same gap the creation rail keeps under the document bar.

const box = async (locator: import('@playwright/test').Locator) => (await locator.boundingBox())!;
const bar = (page: import('@playwright/test').Page) => page.getByRole('toolbar', { name: 'Share and export', exact: true });

test.beforeEach(async ({ page }) => { await openCanvas(page); });

test('the bar sits on the document bar line and the rail hangs below it with the left gap @gate', async ({ page }) => {
  const [doc, right, rail, tools] = await Promise.all([
    box(page.getByRole('toolbar', { name: 'Document', exact: true })),
    box(bar(page)),
    box(page.getByRole('toolbar', { name: 'Workspace', exact: true })),
    box(page.getByRole('toolbar', { name: 'Create', exact: true })),
  ]);
  expect(Math.abs(right.y - doc.y), 'same top').toBeLessThanOrEqual(1);
  expect(Math.abs(right.height - doc.height), 'same height').toBeLessThanOrEqual(1);
  expect(Math.abs((rail.y - (right.y + right.height)) - (tools.y - (doc.y + doc.height))), 'same gap below').toBeLessThanOrEqual(1);
  expect(Math.abs((page.viewportSize()!.width - (right.x + right.width)) - doc.x), 'same edge inset').toBeLessThanOrEqual(1);
});

test('Export opens the Export panel and Share opens the link panel @gate', async ({ page }) => {
  const exportButton = bar(page).getByRole('button', { name: 'Export', exact: true });
  await exportButton.click();
  await expect(page.getByRole('dialog', { name: 'Export' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy share link' })).toBeVisible();
  await page.keyboard.press('Escape');
  await bar(page).getByRole('button', { name: 'Share', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Share' });
  await expect(share.getByRole('button', { name: 'Copy share link' })).toBeVisible();
  await expect(share.getByRole('button', { name: 'Download' })).toHaveCount(0);
});

test('a right panel keeps the bar and the rail to its left @gate', async ({ page }) => {
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const panel = await box(page.getByRole('complementary').first());
  for (const target of [bar(page), page.getByRole('toolbar', { name: 'Workspace', exact: true })]) {
    const at = await box(target);
    expect(at.x + at.width, 'left of the panel').toBeLessThanOrEqual(panel.x);
  }
});

test('on a narrow window the bar hides and the menu keeps Share… and Export… @gate', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await expect(bar(page)).toBeHidden();
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Share…' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Export…' })).toBeVisible();
});

test('with a panel open at 900px the bars never overlap @gate', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const shareBar = bar(page);
  if (await shareBar.isVisible()) {
    const [doc, right] = [await box(page.getByRole('toolbar', { name: 'Document', exact: true })), await box(shareBar)];
    expect(doc.x + doc.width).toBeLessThanOrEqual(right.x);
  }
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Share…' })).toBeVisible();
});
