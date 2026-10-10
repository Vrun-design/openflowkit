import { expect, test, type Page } from './test';
import { doc, state } from './helpers';

// Edit as drawing (pin): the open Map becomes an ordinary Canvas page (one insert-page, one undo step), and Canvas shows it.
interface MapState { mode: 'canvas' | 'map'; open: string[]; nodes: string[]; labels: Record<string, string> }
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState())
    .catch(() => ({ mode: 'canvas', open: [], nodes: [], labels: {} }) as MapState);
const settled = (page: Page) => expect.poll(() => page.evaluate(() =>
  (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion().running), { timeout: 20_000 }).toBe(false);
const pagesOf = async (page: Page) => (await doc(page).catch(() => null))?.pages ?? [];
const pin = (page: Page) => page.getByRole('toolbar', { name: 'Map depth', exact: true }).getByRole('button', { name: 'Edit as drawing', exact: true });

async function openC4Map(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await pagesOf(page)).length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
  await settled(page);
}

for (const how of ['the toolbar button', 'Shift+M']) {
  test(`pinning the map with ${how} adds one plain page, switches to it, and undo removes it @gate`, async ({ page }) => {
    test.setTimeout(90_000);
    await openC4Map(page);
    const map = await mapState(page);
    expect(map.open).toContain('shop');
    if (how === 'Shift+M') {
      // Focus without a pointer: a click in Map would open or close a box.
      await page.locator('[data-testid="v2-canvas"]').focus();
      await page.keyboard.press('Shift+M');
    } else await pin(page).click();

    await expect.poll(async () => (await pagesOf(page)).length).toBe(4);
    // The pinned page has no model, so no Canvas | Map switch and no Map toolbar: it is on Canvas.
    await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveCount(0);
    await expect(page.getByRole('toolbar', { name: 'Map depth', exact: true })).toHaveCount(0);
    const pinned = (await pagesOf(page)).at(-1)!;
    expect(pinned.name).toBe('Shop (drawing)');
    // The same boxes, as plain Canvas content: labels match the map's, and nothing ties it back to the model.
    const labels = pinned.nodes.map((node) => (node as unknown as { content?: { label?: string } }).content?.label ?? '').filter(Boolean).sort();
    expect(labels).toEqual(Object.values(map.labels).filter(Boolean).sort());
    expect(pinned.nodes.every((node) => Object.keys((node as unknown as { metadata: object }).metadata).length === 0)).toBe(true);

    // One undo step brings back the three pages.
    const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
    await page.mouse.click(canvas.x + 5, canvas.y + 150);
    await page.keyboard.press('Meta+z');
    await expect.poll(async () => (await pagesOf(page)).length).toBe(3);
    // And redo brings the pinned page back.
    await page.keyboard.press('Meta+Shift+z');
    await expect.poll(async () => (await pagesOf(page)).length).toBe(4);
    await page.keyboard.press('Meta+z');
    await expect.poll(async () => (await pagesOf(page)).length).toBe(3);
    // Back on the Landscape page, whose Canvas | Map switch is there again.
    await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();
  });
}

// A repo map's own page stays read-only; a page pinned from it is an ordinary Canvas page (GitHub served by page.route, no network).
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-ratelimit-remaining, x-ratelimit-reset' };
const REPO: Readonly<Record<string, string>> = {
  'README.md': '# shop\n',
  'web/package.json': '{"name":"web"}',
  'web/src/main.ts': "import { App } from './App';\nApp();\n",
  'web/src/App.ts': 'export const App = () => 1;\n',
  'api/package.json': '{"name":"api"}',
  'api/src/server.ts': "import { users } from './users';\nexport const s = users;\n",
  'api/src/users.ts': 'export const users = 1;\n',
};
test('a repo map pins to an editable page; the repo page stays read-only @gate', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => route.fulfill({
    json: { sha: 'abc', truncated: false, tree: Object.entries(REPO).map(([path, text]) => ({ path, type: 'blob', mode: '100644', sha: 'x', size: text.length })) }, headers: CORS }));
  await page.route('https://raw.githubusercontent.com/acme/shop/**', (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/acme\/shop\/[^/]+\//, ''));
    return route.fulfill({ status: REPO[path] === undefined ? 404 : 200, contentType: 'text/plain', body: REPO[path] ?? '', headers: CORS });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/map/github/acme/shop');
  await expect(page).toHaveURL(/#\/d\/map-acme_shop$/);
  await page.waitForFunction(() => '__V2__' in window);
  const mapReady = async () => {
    await expect.poll(async () => (await mapState(page)).nodes.length, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 20_000 });
    await settled(page);
  };
  const pagesButton = () => page.getByRole('button', { name: /^Pages/ });
  const mapSwitch = () => page.getByRole('button', { name: 'Map', exact: true });
  const saved = () => expect.poll(async () => ['saved', 'clean'].includes((await state(page)).save)).toBe(true);
  await mapReady();
  const before = (await pagesOf(page)).length;
  await expect(pin(page)).toBeEnabled();
  await pin(page).click();
  await expect.poll(async () => (await pagesOf(page)).length).toBe(before + 1);
  const pinned = (await pagesOf(page)).at(-1)!;
  expect(pinned.name).toMatch(/\(drawing\)$/);
  // The pinned page is an ordinary Canvas page: no Map switch there.
  await expect(mapSwitch()).toHaveCount(0);

  // Rename it from the Pages menu.
  await pagesButton().click();
  await page.getByRole('button', { name: `Actions for ${pinned.name}` }).click();
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
  const rename = page.getByRole('textbox', { name: `Rename ${pinned.name}` });
  await rename.fill('Overview snapshot');
  await rename.press('Enter');
  await expect.poll(async () => (await pagesOf(page)).at(-1)!.name).toBe('Overview snapshot');
  await page.keyboard.press('Escape');

  // Edit a box on it: delete one node.
  const nodesBefore = (await pagesOf(page)).at(-1)!.nodes.length;
  const ids = (await pagesOf(page)).at(-1)!.nodes.map((node) => node.id);
  // Click boxes until one selects (a child sits inside its parent, so the first may be a nested one).
  await expect.poll(async () => {
    for (const id of ids) { await clickNodeOnCanvas(page, id); if ((await state(page)).selectedNodes.length > 0) return true; }
    return false;
  }).toBe(true);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await pagesOf(page)).at(-1)!.nodes.length).toBeLessThan(nodesBefore);
  await saved();

  // It persists across a reload (the page the editor opens is the repo's own, so go to the pinned one).
  await page.reload();
  await page.waitForFunction(() => '__V2__' in window);
  await mapReady();
  expect((await pagesOf(page)).length).toBe(before + 1);
  expect((await pagesOf(page)).at(-1)!.name).toBe('Overview snapshot');
  expect((await pagesOf(page)).at(-1)!.nodes.length).toBeLessThan(nodesBefore);

  // The repo's own page cannot be renamed, duplicated, moved or deleted.
  const pagesDialog = page.getByRole('dialog', { name: 'Pages' });
  const repoPageName = (await pagesOf(page))[0]!.name;
  await expect(mapSwitch()).toBeVisible();
  await pagesButton().click();
  await page.getByRole('button', { name: `Actions for ${repoPageName}` }).click();
  for (const item of ['Rename', 'Duplicate', 'Move up', 'Move down', 'Delete page']) await expect(page.getByRole('menuitem', { name: item, exact: true }), item).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(pagesDialog).toBeHidden();

  // On the pinned page there is no Map switch; going back to the repo page shows its Map again.
  await pagesButton().click();
  await page.getByRole('button', { name: 'Overview snapshot', exact: true }).click();
  await expect(mapSwitch()).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(pagesDialog).toBeHidden();
  await pagesButton().click();
  await page.getByRole('button', { name: repoPageName, exact: true }).click();
  await expect(mapSwitch()).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await mapState(page)).mode).toBe('map');
  await page.keyboard.press('Escape');
  await expect(pagesDialog).toBeHidden();

  // The pinned page can be deleted while the reader is on the repo page.
  await pagesButton().click();
  await page.getByRole('button', { name: 'Actions for Overview snapshot' }).click();
  await page.getByRole('menuitem', { name: 'Delete page' }).click();
  await expect.poll(async () => (await pagesOf(page)).length).toBe(before);
  await saved();
  await page.reload();
  await page.waitForFunction(() => '__V2__' in window);
  await mapReady();
  expect((await pagesOf(page)).length).toBe(before);
  await expect(mapSwitch()).toBeVisible();
  await expect(pin(page)).toBeVisible();
});

test('a page added to a repo document can hold a normal C4 map, with no repo overlay @gate', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => route.fulfill({
    json: { sha: 'abc', truncated: false, tree: Object.entries(REPO).map(([path, text]) => ({ path, type: 'blob', mode: '100644', sha: 'x', size: text.length })) }, headers: CORS }));
  await page.route('https://raw.githubusercontent.com/acme/shop/**', (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/acme\/shop\/[^/]+\//, ''));
    return route.fulfill({ status: REPO[path] === undefined ? 404 : 200, contentType: 'text/plain', body: REPO[path] ?? '', headers: CORS });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/map/github/acme/shop');
  await page.waitForFunction(() => '__V2__' in window);
  await expect.poll(async () => (await mapState(page)).nodes.length, { timeout: 20_000 }).toBeGreaterThan(0);
  await settled(page);
  const before = (await pagesOf(page)).length;
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.getByRole('button', { name: 'Add page' }).click();
  await expect.poll(async () => (await pagesOf(page)).length).toBe(before + 1);
  await page.keyboard.press('Escape');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('%% ofk 1\narchitecture\nmodel {\n person Customer\n system Shop\n Customer -> Shop : buys\n}\nviews { view landscape }\n');
  await source.press('ControlOrMeta+Enter');
  const mapSwitch = page.getByRole('button', { name: 'Map', exact: true });
  await expect(mapSwitch).toBeVisible();
  await mapSwitch.click();
  await expect.poll(async () => (await mapState(page)).nodes).toEqual(expect.arrayContaining(['customer', 'shop']));
  // A normal C4 map: no repo address chip, no repo-only boxes.
  await expect(page.getByText('acme/shop', { exact: false }).filter({ hasText: /Showing|files|read at/i })).toHaveCount(0);
  expect((await mapState(page)).nodes.some((id) => id.startsWith('ext:') || id.includes('#outside'))).toBe(false);
});

async function clickNodeOnCanvas(page: Page, id: string): Promise<void> {
  const r = await page.evaluate((i) => (window as unknown as { __V2__: { getNodeRect(i: string): { x: number; y: number; width: number; height: number } | null } }).__V2__.getNodeRect(i), id);
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  if (r) await page.mouse.click(box.x + r.x + r.width / 2, box.y + r.y + r.height / 2);
}
