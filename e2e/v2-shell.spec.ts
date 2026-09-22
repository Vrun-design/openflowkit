import { expect, test } from '@playwright/test';

test('v2 workspace shell supports panels, view controls, and canvas creation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('v2-welcome')).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'View', exact: true }).locator('.ofk-v2-divider')).toHaveCount(4);
  await expect(page.getByText('Canvas, layers & view', { exact: true })).toBeVisible();
  const workspace = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  await workspace.getByRole('button', { name: 'AI assistant', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'AI assistant' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'AI assistant' })).toHaveCSS('top', '0px');
  await expect(page.getByRole('complementary', { name: 'AI assistant' })).toHaveCSS('right', '0px');
  await page.getByRole('button', { name: 'Map a user onboarding flow' }).click();
  await expect(page.getByRole('textbox', { name: 'Ask AI assistant' })).toHaveValue(
    'Map a user onboarding flow'
  );
  await page.keyboard.press('Escape');
  await workspace.getByRole('button', { name: 'Slides', exact: true }).click();
  await page.getByRole('button', { name: 'Add slide', exact: true }).click();
  await expect(page.getByText('The big idea', { exact: true })).toBeVisible();
  await workspace.getByRole('button', { name: 'Diagram as code', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toContainText(
    'Client -> API'
  );
  await workspace.getByRole('button', { name: 'Slides', exact: true }).click();
  await expect(page.getByText('The big idea', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Layers' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Layers' })).toHaveCSS('left', '0px');
  await page.screenshot({ animations: 'disabled', path: '/tmp/v2-shell-layers.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Zoom 100%', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Zoom in', exact: false }).click();
  await expect(page.getByRole('button', { name: 'Zoom 120%', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await page.mouse.move(450, 270);
  await page.mouse.down();
  await page.mouse.move(630, 390);
  await page.mouse.up();
  await expect(page.getByTestId('v2-welcome')).not.toBeVisible();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const layers = page.getByRole('complementary', { name: 'Layers' });
  await expect(layers.locator('.ofk-v2-panel-badge')).toHaveText('Page 1');
  await layers.getByRole('button', { name: /^Hide / }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    __V2__?: { getDocument(): { pages: { nodes: { content: { sectionHidden?: boolean } }[] }[] } | null }
  }).__V2__?.getDocument()?.pages[0]?.nodes[0]?.content.sectionHidden)).toBe(true);
  await layers.getByRole('button', { name: /^Lock / }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {
    __V2__?: { getDocument(): { pages: { nodes: { content: { sectionLocked?: boolean } }[] }[] } | null }
  }).__V2__?.getDocument()?.pages[0]?.nodes[0]?.content.sectionLocked)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTestId('v2-welcome')).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '/tmp/v2-shell-light.png' });
  await page.getByRole('button', { name: 'Canvas menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.screenshot({ animations: 'disabled', path: '/tmp/v2-shell-dark.png' });
  await workspace.getByRole('button', { name: 'AI assistant', exact: true }).click();
  await expect(page.getByRole('log')).toHaveJSProperty('scrollTop', 0);
  await page.screenshot({ animations: 'disabled', path: '/tmp/v2-shell-panel.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ animations: 'disabled', path: '/tmp/v2-shell-mobile.png' });
  await expect(page.getByRole('complementary', { name: 'AI assistant' })).toBeVisible();
});
