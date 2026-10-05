import { expect, test, type Page } from './test';
import { state } from './helpers';

// Home (#/home): ways in, templates, your diagrams with real thumbnails, search and shortcuts.
// npm run e2e:headed -- e2e/home-page.spec.ts

/** Saves `count` small diagrams straight through the repository, each with a thumbnail. */
async function seed(page: Page, count: number) {
  await page.goto('/#/home');
  await page.evaluate(async (total) => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { createV2Repository } = await load('/src/services/storage/v2/v2Repository.ts');
    const { createEmptyV2Document } = await load('/src/opencanvas/presentation/v2/v2Document.ts');
    const repository = createV2Repository(indexedDB);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect x="20" y="20" width="120" height="60" rx="8" fill="#e8f0fa"/></svg>';
    for (let index = 0; index < total; index += 1) {
      const id = `doc-${String(index).padStart(2, '0')}`;
      await repository.saveDocument(id, createEmptyV2Document(id, index === 3 ? 'Payments service' : `Diagram ${index}`), 1);
      await repository.saveThumbnail(id, { light: svg, dark: svg });
    }
  }, count);
}

const cards = (page: Page) => page.getByRole('list', { name: 'Diagrams' }).getByRole('link');

test('a template card opens a new diagram already drawn, with its text beside it @gate', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Let’s draw your first diagram.');
  await expect(page.getByRole('list', { name: 'Templates' }).getByRole('button')).toHaveCount(5);
  await page.getByRole('button', { name: 'Event pipeline' }).click();
  await expect(page).toHaveURL(/#\/d\/doc-/);
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toContainText('Event pipeline');
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThan(3);
  // The intent ran once: once saved, a reload is just the diagram.
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.reload();
  await expect(page.getByTestId('v2-canvas')).toBeVisible();
  await expect.poll(async () => (await state(page)).nodes.length).toBeGreaterThan(3);
});

test('each way in opens the panel it names @gate', async ({ page }) => {
  for (const [card, panel] of [['Describe it to AI', 'AI assistant'], ['Paste code or Mermaid', 'Diagram as code'], ['Connect your agent', 'Connect agent']] as const) {
    await page.goto('/#/home');
    await page.getByRole('button', { name: new RegExp(`^${card}`) }).click();
    await expect(page.locator('.ofk-panel').getByText(panel, { exact: true }).first()).toBeVisible();
  }
  await page.goto('/#/home');
  await page.getByRole('button', { name: /^Blank canvas/ }).click();
  await expect(page.getByTestId('v2-welcome')).toBeVisible();
});

test('a drawn diagram shows its real thumbnail on home, and the menu leads back @gate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('v2-welcome')).toBeVisible();
  await page.mouse.click(500, 350);
  await page.keyboard.press('r');
  await page.mouse.click(500, 350);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  // The preview is drawn after the save settles, when the browser is idle.
  await page.waitForTimeout(2_500);
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/#\/home$/);
  const preview = page.getByRole('list', { name: 'Diagrams' }).locator('img.ofk-home-preview-image');
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveAttribute('src', /^data:image\/svg\+xml/);
});

test('/ finds, Escape clears, N makes a new one @gate', async ({ page }) => {
  await seed(page, 9);
  await page.reload();
  await expect(cards(page)).toHaveCount(9);
  await page.keyboard.press('/');
  const search = page.getByRole('searchbox', { name: 'Search diagrams' });
  await expect(search).toBeFocused();
  await page.keyboard.type('payments');
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toHaveText('Payments service');
  await search.fill('zzz');
  await expect(page.getByRole('status').filter({ hasText: 'Nothing matches' })).toContainText('Nothing matches “zzz”.');
  await page.keyboard.press('Escape');
  await expect(cards(page)).toHaveCount(9);

  await page.keyboard.press('n');
  await expect(page).toHaveURL(/#\/d\/doc-/);
});

test('star, list layout and name sort survive a reload; duplicate makes a copy @gate', async ({ page }) => {
  await seed(page, 3);
  await page.reload();
  await page.getByRole('button', { name: 'Star Diagram 1' }).click();
  await page.getByRole('radio', { name: 'List' }).check();
  await page.getByRole('button', { name: 'Sort by Last edited' }).click();
  await page.getByRole('menuitemradio', { name: 'Name' }).click();
  await page.reload();
  await expect(page.getByRole('list', { name: 'Diagrams' })).toHaveAttribute('data-layout', 'list');
  await expect(cards(page)).toHaveText(['Diagram 0', 'Diagram 1', 'Diagram 2']);
  await page.getByRole('navigation', { name: 'Home' }).getByRole('link', { name: /Starred/ }).click();
  await expect(page).toHaveURL(/view=starred/);
  await expect(cards(page)).toHaveText(['Diagram 1']);

  await page.getByRole('button', { name: 'More actions for Diagram 1' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await page.getByRole('navigation', { name: 'Home' }).getByRole('link', { name: /Recents/ }).click();
  await expect(cards(page)).toHaveText(['Diagram 0', 'Diagram 1', 'Diagram 1 copy', 'Diagram 2']);
});

test('fifty diagrams list and paint inside the budget @gate', async ({ page }) => {
  await seed(page, 50);
  await page.addInitScript(() => {
    // From the moment the list request goes out to the frame that shows all fifty cards.
    const marks = { start: 0, painted: 0 };
    (window as unknown as { __homeMarks: typeof marks }).__homeMarks = marks;
    new MutationObserver(() => {
      if (!marks.start && document.querySelector('[aria-label="Diagrams"][aria-busy="true"]')) marks.start = performance.now();
      if (marks.start && !marks.painted && document.querySelectorAll('[aria-label="Diagrams"] a').length === 50) {
        requestAnimationFrame(() => { marks.painted = performance.now(); });
      }
    }).observe(document, { childList: true, subtree: true, attributes: true });
  });
  await page.reload();
  await expect(cards(page)).toHaveCount(50);
  const ms = await page.waitForFunction(() => {
    const marks = (window as unknown as { __homeMarks: { start: number; painted: number } }).__homeMarks;
    return marks.painted ? marks.painted - marks.start : null;
  }).then((handle) => handle.jsonValue());
  console.log(`home: 50 diagrams listed and painted in ${Math.round(ms as number)} ms`);
  // 300 ms on a dev machine; CI's two shared cores get room, still far under what a quadratic list would take.
  expect(ms).toBeLessThan(process.env.CI ? 1000 : 300);
});

test('N inside a card menu is typeahead, not a new diagram @gate', async ({ page }) => {
  await seed(page, 2);
  await page.reload();
  await page.getByRole('button', { name: 'More actions for Diagram 0' }).click();
  await expect(page.getByRole('menuitem', { name: 'Open in new tab' })).toBeFocused();
  await page.keyboard.press('n');
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/#\/home$/);
});

test('right-click opens the card menu at the pointer; ⌘K finds and opens a diagram @gate', async ({ page }) => {
  await seed(page, 2);
  await page.reload();
  const card = page.getByRole('list', { name: 'Diagrams' }).getByRole('listitem').filter({ hasText: 'Diagram 0' });
  const box = (await card.boundingBox())!;
  await page.mouse.click(box.x + 60, box.y + 40, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Diagram 0 actions' });
  await expect(menu).toBeVisible();
  const menuBox = (await menu.boundingBox())!;
  expect(Math.abs(menuBox.x - (box.x + 60))).toBeLessThan(24);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  await page.keyboard.press('ControlOrMeta+k');
  const palette = page.getByRole('dialog', { name: 'Find anything' });
  await expect(palette).toBeVisible();
  await page.keyboard.type('Diagram 1');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/d\/doc-01$/);
});

test('shift-arrows select a range, Delete archives it, Undo brings it back @gate', async ({ page }) => {
  await seed(page, 3);
  await page.reload();
  await expect(cards(page)).toHaveCount(3);
  await cards(page).first().focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByRole('toolbar', { name: 'Selection' })).toContainText('2 selected');
  await page.keyboard.press('Delete');
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByRole('toolbar', { name: 'Selection' })).toHaveCount(0);
  await page.getByRole('region', { name: 'Notifications' }).getByRole('button', { name: 'Undo' }).click();
  await expect(cards(page)).toHaveCount(3);
});

test('import: a Mermaid file draws as a new diagram; dropped .json exports join the list @gate', async ({ page }) => {
  await page.goto('/#/home');
  const exported = await page.evaluate(async () => {
    const { createEmptyV2Document } = await import(/* @vite-ignore */ '/src/opencanvas/presentation/v2/v2Document.ts');
    return [JSON.stringify(createEmptyV2Document('x', 'Imported one')), JSON.stringify(createEmptyV2Document('y', 'Imported two'))];
  });
  const drop = await page.evaluateHandle((texts) => {
    const transfer = new DataTransfer();
    texts.forEach((text, index) => transfer.items.add(new File([text], `export-${index}.json`, { type: 'application/json' })));
    return transfer;
  }, exported);
  await page.dispatchEvent('[data-testid="v2-home"]', 'drop', { dataTransfer: drop });
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Imported 2 diagrams.');
  await expect.poll(async () => (await cards(page).allInnerTexts()).sort()).toEqual(['Imported one', 'Imported two']);

  await page.locator('input[type="file"]').setInputFiles({ name: 'flow.mmd', mimeType: 'text/plain', buffer: Buffer.from('flowchart LR\n  A --> B\n  B --> C\n') });
  await expect(page).toHaveURL(/#\/d\/doc-/);
  await expect(page.getByTestId('v2-canvas')).toBeVisible();
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
});
