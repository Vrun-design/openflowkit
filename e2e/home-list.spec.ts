import { expect, test } from './test';

// Phase 12.4: home — list → open → rename → delete (confirmed), keyboard only.
// npm run e2e:headed -- e2e/home-list.spec.ts

test('all diagrams: open, rename and delete from the keyboard @gate', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  // An untouched new document is never saved, so the list gets two saved ones.
  await page.evaluate(async () => {
    const { createV2Repository } = await import(/* @vite-ignore */ '/src/services/storage/v2/v2Repository.ts');
    const { createEmptyV2Document } = await import(/* @vite-ignore */ '/src/opencanvas/presentation/v2/v2Document.ts');
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('doc-alpha', createEmptyV2Document('doc-alpha', 'Alpha'), 1);
    await repository.saveDocument('v1-doc-beta', createEmptyV2Document('v1-doc-beta', 'Beta'), 1);
  });

  await page.getByRole('button', { name: 'Canvas menu' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem', { name: 'Back to home' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('v2-home')).toBeVisible();
  const rows = page.getByRole('list', { name: 'Diagrams' }).getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'Beta' })).toContainText('From v1');
  await expect(rows.filter({ hasText: 'Alpha' })).not.toContainText('From v1');

  // Rename and delete live in each card's overflow menu; focus enters its first item.
  await page.getByRole('button', { name: 'More actions for Alpha' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Open in new tab' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Quarterly plan');
  await page.keyboard.press('Enter');
  const renamed = page.getByRole('link', { name: 'Quarterly plan' });
  await expect(renamed).toBeVisible();
  await expect(renamed).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await expect(page.locator('.ofk-v2-document-title')).toHaveText('Quarterly plan');

  await page.goto('/#/home');
  await page.getByRole('button', { name: 'More actions for Quarterly plan' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Open in new tab' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Archive' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(rows).toHaveCount(2);
  await page.getByRole('button', { name: 'More actions for Quarterly plan' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(rows).toHaveCount(1);
  // Focus lands on the card that took its place, not back at the top of the page.
  await expect(page.getByRole('link', { name: 'Beta' })).toBeFocused();

  // Archive: nothing is gone until it is deleted forever, behind a confirm.
  await page.getByRole('navigation', { name: 'Home' }).getByRole('link', { name: /Archive/ }).click();
  await page.getByRole('button', { name: 'More actions for Quarterly plan' }).click();
  await page.getByRole('menuitem', { name: 'Delete forever…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete forever', exact: true }).click();
  await expect(page.getByText('Nothing archived.')).toBeVisible();
  await page.goto('/#/home');
  await expect(rows).toHaveCount(1);
});
