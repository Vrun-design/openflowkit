import { doc } from './helpers';
import { expect, test } from './test';

// R4: C4 is the engine, not a word on the surface. Pages, crumbs, cards and the
// home gallery say Landscape / Overview / Services / Inside; only the model
// panel (and the docs) name C4 levels, for people who know them.
const JARGON = /\bC4\b|\bContainers?\b|\bContext\b/i;

test('a generated system map shows no C4 jargon outside the model panel @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const workspace = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  await workspace.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Search architecture')).toBeHidden();

  const document = (await doc(page))!;
  expect(document.pages.map((entry) => entry.name)).toEqual(['Landscape', 'Overview: Shop', 'Services: Shop']);
  const text = document.pages.flatMap((entry) => entry.nodes.flatMap((node) => {
    const content = node.content as { label?: unknown; subLabel?: unknown } | undefined;
    return [content?.label, content?.subLabel].filter((value): value is string => typeof value === 'string');
  }));
  expect(text.filter((value) => JARGON.test(value))).toEqual([]);
  expect(await page.locator('body').innerText()).not.toMatch(JARGON);

  await page.goto('/#/home');
  await expect(page.getByRole('navigation', { name: 'Home' })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(JARGON);
});
