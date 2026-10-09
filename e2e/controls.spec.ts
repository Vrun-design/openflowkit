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

/** Map mode's toolbar only exists on a page with a C4 model, in Map: build one and switch to it. */
async function enterMap(page: Page): Promise<void> {
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true });
  await rail.click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Architecture model' })).toBeVisible();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('toolbar', { name: 'Map depth', exact: true })).toBeVisible();
}

/** Presses every enabled button of `only` (all toolbars when omitted), backing out of whatever it opens. */
async function pressEvery(page: Page, floor: number, only?: string, mayDisable = false): Promise<void> {
  const all = (await controls(page)).filter(({ disabled, toolbar }) => !disabled && (only === undefined || toolbar === only));
  // The create rail is 7 buttons since 2026-10-06 (was 12); the floor only catches broken discovery.
  expect(all.length, 'discovery found the toolbars').toBeGreaterThanOrEqual(floor);
  const layers = page.locator('.ofk-popover:not([data-passive]), [role="dialog"][aria-modal="true"]');
  for (const control of all) {
    const { name } = control;
    const target = button(page, control);
    // Map only: a press earlier in the sweep can turn a control off for good reason (Expand once everything is open).
    // Elsewhere a control that disables itself is a failure, so the click below fails.
    if (mayDisable && await target.isDisabled()) continue;
    const pressed = await target.getAttribute('aria-pressed');
    await target.click();
    for (let i = 0; i < 3 && (await layers.count()); i++) await page.keyboard.press('Escape');
    await expect(layers, `${name}: Escape leaves no layer open`).toHaveCount(0);
    // Map is a mode switch, not a toggle: on a plain document it is the start screen, and Canvas is the way back.
    if (name === 'Map') {
      await expect(page.getByTestId('v2-map-start'), 'Map: start screen').toBeVisible();
      await button(page, { ...control, name: 'Canvas' }).click();
      await expect(page.getByTestId('v2-map-start')).toHaveCount(0);
    }
    // Toggles (panels, modes) go back to how they were, so the next button is reachable.
    if (pressed !== null && (await target.getAttribute('aria-pressed')) !== pressed) await target.click();
    await page.keyboard.press('v');
  }
}

test('every toolbar button presses without an error and Escape backs out of it @gate', async ({ page }) => {
  await pressEvery(page, 18);
});

test('every Map toolbar button presses without an error and Escape backs out of it @gate', async ({ page }) => {
  await enterMap(page);
  // Three depths; Edit as drawing stays disabled until the first layout lands, so it may not count.
  await pressEvery(page, 3, 'Map depth', true);
});

async function tooltipEvery(page: Page, floor: number, only?: string): Promise<void> {
  const iconOnly = (await controls(page)).filter(({ text, toolbar }) => !text && (only === undefined || toolbar === only));
  expect(iconOnly.length, 'discovery found icon buttons').toBeGreaterThanOrEqual(floor);
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
}

test('every icon-only toolbar button names itself in a tooltip @gate', async ({ page }) => {
  await tooltipEvery(page, 15);
});

test('every icon-only Map toolbar button names itself in a tooltip @gate', async ({ page }) => {
  await enterMap(page);
  // All words since 2026-10-09; the sweep stays for the next icon.
  await tooltipEvery(page, 0, 'Map depth');
});
