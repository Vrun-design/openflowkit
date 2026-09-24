// Headed @gate: regressions a user reported — the fit button, the zoom menu, tooltip warm-up.
import { expect, test } from './test';
import { drawShape, emptyPoint, openCanvas } from './helpers';

test('zoom menu toggles and dismisses, fit button fits, tooltips sweep @gate', async ({ page }) => {
  await openCanvas(page);
  await drawShape(page, 'r', 300, 300);
  const bar = page.getByRole('toolbar', { name: 'View' });
  const zoom = bar.getByRole('button', { name: /^Zoom \d+%$/ });
  const menu = page.getByRole('menu', { name: 'Zoom' });

  await zoom.click();
  await expect(menu).toBeVisible();
  await zoom.click();
  await expect(menu).toBeHidden();
  await zoom.click();
  const away = await emptyPoint(page, 700, 400);
  await page.mouse.click(away.x, away.y);
  await expect(menu).toBeHidden();

  await zoom.click();
  await menu.getByRole('menuitemcheckbox', { name: 'Zoom to 200%' }).click();
  await expect(zoom).toHaveAccessibleName('Zoom 200%');
  await bar.getByRole('button', { name: 'Zoom to fit' }).click();
  await expect(zoom).not.toHaveAccessibleName('Zoom 200%');

  const tip = page.getByRole('tooltip');
  await bar.getByRole('button', { name: 'Layers' }).hover();
  await expect(tip).toContainText('Layers');
  // Once one tooltip is up, its neighbours open without the delay.
  for (const label of ['Zoom to fit', 'Undo']) {
    await bar.getByRole('button', { name: label }).hover();
    await expect(tip).toContainText(label, { timeout: 250 });
  }
});

test('a no-cors probe tells a closed port from a listening server @gate', async ({ page }) => {
  await page.goto('/');
  const probe = (url: string) => page.evaluate(async (target) => {
    try { await fetch(target, { mode: 'no-cors' }); return true; } catch { return false; }
  }, url);
  expect(await probe('http://localhost:1')).toBe(false);
  expect(await probe('http://127.0.0.1:4399')).toBe(true);
});
