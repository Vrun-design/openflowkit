// Headed @gate: contracts every toolbar control keeps. Controls are discovered
// at run time, so a new button is covered the day it ships, with no new test.
import { expect, test, type Page } from './test';
import { emptyPoint, openCanvas } from './helpers';

interface Control {
  readonly toolbar: string;
  readonly name: string;
  readonly popup: string | null;
  readonly text: string;
  readonly disabled: boolean;
}

/** Visible toolbar buttons in DOM order, by accessible name. */
const controls = (page: Page): Promise<Control[]> => page.evaluate(() =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="toolbar"] button')]
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => ({
      toolbar: el.closest('[role="toolbar"]')?.getAttribute('aria-label') ?? '',
      name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
      popup: el.getAttribute('aria-haspopup'),
      text: el.textContent?.trim() ?? '',
      disabled: el.disabled,
    })));

/** The same action can sit in two toolbars, so a control is its toolbar plus its name. */
const button = (page: Page, { toolbar, name }: Control) =>
  page.getByRole('toolbar', { name: toolbar, exact: true }).getByRole('button', { name, exact: true });

test.beforeEach(async ({ page }) => {
  // The image button opens the OS file picker; a listener keeps it in-page.
  page.on('filechooser', () => undefined);
  await openCanvas(page);
});

test('every popover trigger opens, and closes on a second click, Escape and an outside click @gate', async ({ page }) => {
  const triggers = (await controls(page)).filter(({ popup }) => popup);
  expect(triggers.length, 'discovery found the triggers').toBeGreaterThanOrEqual(8);
  for (const control of triggers) {
    const { name } = control;
    const trigger = button(page, control);
    await trigger.click();
    await expect(trigger, `${name}: click opens`).toHaveAttribute('aria-expanded', 'true');
    await trigger.click();
    await expect(trigger, `${name}: second click closes`).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(trigger, `${name}: Escape closes`).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger, `${name}: Escape returns focus`).toBeFocused();

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const away = await emptyPoint(page, 640, 360);
    await page.mouse.click(away.x, away.y);
    await expect(trigger, `${name}: outside click closes`).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('v');
  }
});

test('every toolbar button presses without an error and Escape backs out of it @gate', async ({ page }) => {
  const all = (await controls(page)).filter(({ disabled }) => !disabled);
  expect(all.length, 'discovery found the toolbars').toBeGreaterThanOrEqual(20);
  const layers = page.locator('.ofk-popover:not([data-passive]), [role="dialog"][aria-modal="true"]');
  for (const control of all) {
    const { name } = control;
    const target = button(page, control);
    const pressed = await target.getAttribute('aria-pressed');
    await target.click();
    for (let i = 0; i < 3 && (await layers.count()); i++) await page.keyboard.press('Escape');
    await expect(layers, `${name}: Escape leaves no layer open`).toHaveCount(0);
    // Toggles (panels, modes) go back to how they were, so the next button is reachable.
    if (pressed !== null && (await target.getAttribute('aria-pressed')) !== pressed) await target.click();
    await page.keyboard.press('v');
  }
});

test('every icon-only toolbar button names itself in a tooltip @gate', async ({ page }) => {
  const iconOnly = (await controls(page)).filter(({ text }) => !text);
  expect(iconOnly.length, 'discovery found icon buttons').toBeGreaterThanOrEqual(15);
  await expect(page.locator('.ofk-tooltip-anchor [title]'), 'custom tooltips own every visible hint').toHaveCount(0);
  const tip = page.getByRole('tooltip');
  for (const control of iconOnly) {
    const { name } = control;
    await button(page, control).hover();
    await expect(tip, `${name}: tooltip`).toBeVisible();
    await expect(tip, `${name}: tooltip text`).not.toHaveText('');
    // A native title would pop a second, late tooltip over ours.
    await expect(button(page, control), `${name}: no native title`).not.toHaveAttribute('title');
  }
});
