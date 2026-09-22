import { expect, test } from '@playwright/test';

// `/` reopens the document you had open last instead of minting a new one.
// npm run e2e:headed -- e2e/home.spec.ts

test('/ reopens the last document', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  const first = page.url();
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  expect(page.url()).toBe(first);
});
