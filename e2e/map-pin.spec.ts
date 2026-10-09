import { expect, test, type Page } from './test';
import { doc, state } from './helpers';

// Pin as page: the open Map becomes an ordinary Canvas page (one insert-page, one undo step), and Canvas shows it.
interface MapState { mode: 'canvas' | 'map'; open: string[]; nodes: string[]; labels: Record<string, string> }
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState())
    .catch(() => ({ mode: 'canvas', open: [], nodes: [], labels: {} }) as MapState);
const settled = (page: Page) => expect.poll(() => page.evaluate(() =>
  (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion().running), { timeout: 20_000 }).toBe(false);
const pagesOf = async (page: Page) => (await doc(page).catch(() => null))?.pages ?? [];
const pin = (page: Page) => page.getByRole('toolbar', { name: 'Map depth', exact: true }).getByRole('button', { name: 'Pin as page', exact: true });

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
    expect(pinned.name).toBe('Shop (pinned)');
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

// A repo document is read-only as a whole, so its map offers no Pin as page (GitHub served by page.route, no network).
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
test('a repo map offers no Pin as page @gate', async ({ page }) => {
  test.setTimeout(90_000);
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
  await expect.poll(async () => (await mapState(page)).nodes.length, { timeout: 20_000 }).toBeGreaterThan(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 20_000 });
  await settled(page);
  await expect(page.getByRole('toolbar', { name: 'Map depth', exact: true })).toBeVisible();
  await expect(pin(page)).toHaveCount(0);
  const before = (await pagesOf(page)).length;
  await page.locator('[data-testid="v2-canvas"]').focus();
  await page.keyboard.press('Shift+M');
  await page.waitForTimeout(400);
  expect((await pagesOf(page)).length).toBe(before);
});
