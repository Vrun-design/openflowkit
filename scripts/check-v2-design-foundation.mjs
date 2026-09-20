import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome_v1', 'true'));
  await page.goto('http://127.0.0.1:4188/#/home');
  await page.getByTestId('home-create-new-main').click();
  await page.waitForURL(/#\/flow\//);
  await page.goto(page.url() + '?renderer=opencanvas');
  page.setDefaultTimeout(30000);
  const toolbar = page.getByRole('toolbar', { name: 'Canvas view' });
  await toolbar.waitFor({ timeout: 30000 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => localStorage.setItem('openflowkit-theme', theme), theme);
    await page.reload();
    await toolbar.waitFor();
    await page.getByRole('button', { name: 'Fit page', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), '100%');
    await page.getByRole('button', { name: '100%', exact: true }).click();
    assert.equal(
      await page
        .getByRole('button', { name: '100%', exact: true })
        .evaluate((el) => getComputedStyle(el).color),
      theme === 'dark' ? 'rgb(241, 242, 236)' : 'rgb(37, 39, 36)'
    );
    await toolbar.screenshot({ path: `docs/evidence/v2-foundation/controls-${theme}.png` });
    assert.equal(await page.locator('.ofk-system').getAttribute('data-ofk-appearance'), theme);
  }
  // Live resize of this legacy canary can switch to fallback; qualify separately.
  await page.goto(page.url().replace(/\?renderer=opencanvas$/, '') + '?renderer=opencanvas');
  await toolbar.waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page
      .getByRole('button', { name: 'Fit page', exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s'
  );
  console.log(
    'PASS actual /flow/:id?renderer=opencanvas: light/dark, keyboard, reset activation, reduced motion; live narrow resize remains unqualified. Chromium ' +
      browser.version()
  );
} finally {
  await browser.close();
}
