import { expect, test, type Page } from './test';

// The Living Map (#/map/github/<owner>/<repo>): GitHub's tree and raw files are served by page.route
// from a small fake repo (two parts, a two-way import, a compose relation, a store), so no network.
// npx playwright test e2e/map.spec.ts

const imp = (names: string, from: string) => `import { ${names} } from '${from}';\n`;
const REPO: Readonly<Record<string, string>> = {
  'docker-compose.yml': 'services:\n  web:\n    build: ./web\n    depends_on: [api]\n  api:\n    build: ./api\n    depends_on: [db]\n  db:\n    image: postgres:16\n',
  'README.md': '# shop\n',
  'web/package.json': '{"name":"web"}',
  'web/Dockerfile': 'FROM node:20\n',
  'web/src/main.ts': imp('App', './App') + 'App();\n',
  'web/src/App.ts': imp('Button', './ui/Button') + imp('Card', './ui/Card') + imp('Modal', './ui/Modal') + imp('call', './lib/client') + 'export const App = () => [Button, Card, Modal, call];\n',
  'web/src/shared.ts': 'export const shared = 1;\n',
  'web/src/ui/Button.ts': 'export const Button = 1;\n',
  'web/src/ui/Card.ts': imp('Button', './Button') + 'export const Card = Button;\n',
  'web/src/ui/Modal.ts': imp('Button', './Button') + 'export const Modal = Button;\n',
  'web/src/lib/format.ts': 'export const fmt = (n: number) => String(n);\n',
  'web/src/lib/client.ts': imp('fmt', './format') + "import type { User } from '../../../api/src/types';\nexport const call = (u: User) => fmt(u.id);\n",
  'api/package.json': '{"name":"api"}',
  'api/Dockerfile': 'FROM node:20\n',
  'api/src/types.ts': 'export interface User { id: number }\n',
  'api/src/util.ts': 'export const id = () => 1;\n',
  'api/src/db.ts': 'export const query = () => [];\n',
  'api/src/server.ts': imp('shared', '../../web/src/shared') + imp('users', './routes/users') + imp('orders', './routes/orders') + imp('health', './routes/health') + 'export const s = [shared, users, orders, health];\n',
  'api/src/routes/users.ts': imp('query', '../db') + imp('id', '../util') + "import type { User } from '../types';\nexport const users = (u?: User) => [query, id, u];\n",
  'api/src/routes/orders.ts': imp('query', '../db') + imp('id', '../util') + 'export const orders = [query, id];\n',
  'api/src/routes/health.ts': 'export const health = 1;\n',
};
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-ratelimit-remaining, x-ratelimit-reset' };

async function serveGitHub(page: Page, repo: Readonly<Record<string, string>> | null, tree?: (route: Parameters<Parameters<Page['route']>[1]>[0]) => Promise<boolean>): Promise<void> {
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', async (route) => {
    if (tree && await tree(route)) return;
    await (repo
      ? route.fulfill({ json: { sha: 'abc', truncated: false, tree: Object.entries(repo).map(([path, text]) => ({ path, type: 'blob', mode: '100644', sha: 'x', size: text.length })) }, headers: CORS })
      : route.fulfill({ status: 404, json: { message: 'Not Found' }, headers: CORS }));
  });
  await page.route('https://raw.githubusercontent.com/acme/shop/**', (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/acme\/shop\/[^/]+\//, ''));
    return route.fulfill({ status: repo?.[path] === undefined ? 404 : 200, contentType: 'text/plain', body: repo?.[path] ?? '', headers: CORS });
  });
}

/** The map page with the fake repo loaded and settled. */
async function openMap(page: Page): Promise<void> {
  await serveGitHub(page, REPO);
  await page.goto('/#/map/github/acme/shop');
  await expect(page.locator('[data-box]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.map-status [role="status"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('.l-edges')).toHaveCSS('opacity', '1');
}

const box = (page: Page, id: string) => page.locator(`[data-box][data-id="${id}"]`);
const count = (page: Page) => page.locator('[data-box]').count();
/** The camera's scale: the one transform on the svg's camera group. */
const scale = (page: Page) => page.evaluate(() => Number(/scale\(([^)]+)\)/.exec(document.querySelector('.map-svg > g:not(defs)')?.getAttribute('transform') ?? '')?.[1]));

/** rAF frame deltas across `action`, logged (not asserted: a loaded machine is not a regression). */
async function fps(page: Page, label: string, action: () => Promise<void>): Promise<void> {
  await page.evaluate(() => { const w = window as unknown as { __f: number[]; __run: boolean }; w.__f = []; w.__run = true; const loop = (t: number) => { w.__f.push(t); if (w.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  await action();
  await page.waitForTimeout(700);
  const frames = await page.evaluate(() => { const w = window as unknown as { __f: number[]; __run: boolean }; w.__run = false; return w.__f; });
  const deltas = frames.slice(1).map((t, i) => t - frames[i]!).sort((x, y) => x - y);
  console.log(`map fps ${label}: ${deltas.length} frames, p50 ${(1000 / deltas[Math.floor(deltas.length / 2)]!).toFixed(0)} fps, p95 ${(1000 / deltas[Math.floor(deltas.length * 0.95)]!).toFixed(0)} fps`);
}

test('the first paint shows the parts, open, with the arrow between them @gate', async ({ page }) => {
  await openMap(page);
  for (const part of ['web', 'api']) await expect(box(page, part)).toHaveClass(/open/);
  await expect(page.locator('[data-edge].k-import')).toHaveAttribute('aria-label', 'api to web, import, 1 ⇄ 1');
  // Discovery's compose reading: web calls api, and api reaches the database in the Outside services box.
  await expect(page.locator('[data-edge].k-call')).toHaveAttribute('aria-label', 'web to api, call, depends on');
  await expect(box(page, 'root#outside')).toHaveClass(/open/);
  await expect(box(page, 'ext:db')).toBeVisible();
  await expect(page.locator('[data-edge].k-data')).toHaveAttribute('aria-label', 'api to Outside services, data, depends on');
  await expect(page.getByRole('complementary', { name: 'Overview' })).toContainText('acme/shop');
});

test('a click opens a box and a second click closes it @gate', async ({ page }) => {
  await openMap(page);
  const before = await count(page);
  await fps(page, 'expand', async () => { await box(page, 'web/src').click(); });
  await expect(box(page, 'web/src')).toHaveClass(/open/);
  await expect(box(page, 'web/src/ui')).toBeVisible();
  expect(await count(page)).toBeGreaterThan(before);
  await box(page, 'web/src').click({ position: { x: 150, y: 28 } });
  await expect(box(page, 'web/src')).not.toHaveClass(/open/);
  await expect(box(page, 'web/src/ui')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'src' })).toBeVisible();
});

test('an arrow opens its evidence with a GitHub link per line @gate', async ({ page }) => {
  await openMap(page);
  await page.locator('.lbl', { hasText: '1 ⇄ 1' }).click();
  const panel = page.getByRole('complementary', { name: 'Arrow' });
  await expect(panel).toBeVisible();
  const links = panel.locator('a[href^="https://github.com/acme/shop/blob/"]');
  await expect(links.first()).toHaveAttribute('href', /\/blob\/HEAD\/(?:web|api)\/src\/.+#L\d+$/);
  expect(await links.count()).toBeGreaterThanOrEqual(2);
  await expect(panel).toContainText('web/src/lib/client.ts');
});

test('depth presets and layers change what is drawn @gate', async ({ page }) => {
  await openMap(page);
  const overview = await count(page);
  expect(await scale(page), 'readable landing at overview').toBeGreaterThanOrEqual(0.6);
  await page.getByRole('button', { name: /^Depth/ }).click();
  await page.getByRole('menuitemradio', { name: 'Detailed' }).click();
  await expect.poll(() => count(page)).toBeGreaterThan(overview);
  await expect.poll(() => scale(page)).toBeGreaterThanOrEqual(0.6);
  await page.getByRole('button', { name: /^Depth/ }).click();
  await page.getByRole('menuitemradio', { name: 'Everything' }).click();
  await expect.poll(() => scale(page)).toBeGreaterThanOrEqual(0.6);
  await page.getByRole('button', { name: /^Depth/ }).click();
  await page.getByRole('menuitemradio', { name: 'Detailed' }).click();
  expect(await page.evaluate(() => localStorage.getItem('ofk.map.depth.acme/shop'))).toBe('detailed');
  await page.getByRole('button', { name: /^Depth/ }).click();
  await page.getByRole('menuitemradio', { name: 'Overview' }).click();
  await expect.poll(() => count(page)).toBe(overview);

  const layers = page.getByRole('button', { name: 'Layers' });
  await layers.click();
  await expect(layers).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('menuitemcheckbox', { name: /^import/ }).click();
  await page.keyboard.press('Escape');
  await expect(layers).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-edge].k-import')).toHaveCount(0);
  await layers.click();
  await page.getByRole('menuitemcheckbox', { name: /^import/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-edge].k-import')).toHaveCount(1);
});

test('"/" searches and reveals a box buried in a closed folder @gate', async ({ page }) => {
  await openMap(page);
  await page.locator('.map-svg').focus();
  await page.keyboard.press('/');
  await expect(page.getByRole('combobox', { name: 'Search the map' })).toBeFocused();
  await page.keyboard.type('Modal');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(box(page, 'web/src/ui/Modal.ts')).toHaveClass(/sel/);
  await expect(page.getByRole('complementary', { name: 'Modal.ts' })).toContainText('web/src/ui/Modal.ts');
  await page.keyboard.press('/');
  await page.keyboard.type('zzzz');
  await expect(page.getByRole('status').filter({ hasText: 'No matches' })).toHaveCount(1);
});

test('the keyboard reaches, moves between, opens and backs out of boxes @gate', async ({ page }) => {
  await openMap(page);
  await page.locator('.map-svg').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.mb:focus')).toHaveCount(1);
  const first = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id);
  await page.keyboard.press('Enter');
  await expect(page.locator('.mb.sel')).toHaveCount(1);
  // Arrow keys hop to the sibling part, whichever side it is on.
  const other = first === 'web' ? 'api' : 'web';
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
  for (let i = 0; i < 8; i++) {
    if (await box(page, other).evaluate((el) => el.classList.contains('sel'))) break;
    await page.keyboard.press(keys[i % keys.length]!);
    await page.waitForTimeout(80);
  }
  await expect(box(page, other)).toHaveClass(/sel/);
  // Enter toggles the selected part; open/close is symmetrical.
  const wasOpen = await box(page, other).evaluate((el) => el.classList.contains('open'));
  await page.keyboard.press('Enter');
  await expect(box(page, other)).toHaveClass(wasOpen ? /^(?!.*\bopen\b)/ : /open/);
  await page.keyboard.press('Enter');
  await expect(box(page, other)).toHaveClass(wasOpen ? /open/ : /^(?!.*\bopen\b)/);
  // Open a folder inside a part; Escape closes its parent level and selects the parent.
  await box(page, 'web/src').focus();
  await page.keyboard.press('Enter');
  await expect(box(page, 'web/src')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(box(page, 'web')).not.toHaveClass(/open/);
  await expect(box(page, 'web')).toHaveClass(/sel/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.mb.sel')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ofk-panel')).toHaveCount(0);
});

test('with reduced motion a box opens in one step, with no frames between @gate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMap(page);
  await page.evaluate(() => {
    const w = window as unknown as { __moves: Map<string, number> };
    w.__moves = new Map();
    new MutationObserver((records) => { for (const r of records) { const id = (r.target as HTMLElement).dataset.id; if (id) w.__moves.set(id, (w.__moves.get(id) ?? 0) + 1); } })
      .observe(document.querySelector('.map-svg')!, { attributes: true, attributeFilter: ['transform'], subtree: true });
  });
  await box(page, 'web/src').click();
  await expect(box(page, 'web/src/ui')).toBeVisible();
  await page.waitForTimeout(800);
  const most = await page.evaluate(() => Math.max(...(window as unknown as { __moves: Map<string, number> }).__moves.values()));
  expect(most, 'transform writes per box').toBeLessThanOrEqual(3);
});

test('the toolbar keeps the control contract: tooltips on icon buttons, menus toggle, Escape and an outside click close @gate', async ({ page }) => {
  await openMap(page);
  const bar = page.getByRole('toolbar', { name: 'Map', exact: true });
  for (const name of ['Expand one level', 'Collapse all', 'Fit to screen', 'Details panel']) {
    const button = bar.getByRole('button', { name, exact: true });
    await button.hover();
    await expect(page.getByRole('tooltip'), `${name}: tooltip`).toBeVisible();
    await expect(button, `${name}: no native title`).not.toHaveAttribute('title');
    await page.mouse.move(700, 600);
  }
  for (const name of [/^Depth/, 'Layers']) {
    const trigger = bar.getByRole('button', { name });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.mouse.click(700, 700);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
});

test('a rate-limited read asks for a token, sends it to the API only, and then draws the map @gate', async ({ page }) => {
  let limited = true;
  const seen: { url: string; auth: string | undefined }[] = [];
  page.on('request', (request) => { if (/api\.github\.com|raw\.githubusercontent\.com/.test(request.url())) seen.push({ url: request.url(), auth: request.headers().authorization }); });
  await serveGitHub(page, REPO, async (route) => {
    if (!limited || route.request().headers().authorization) return false;
    await route.fulfill({ status: 403, json: { message: 'API rate limit exceeded' }, headers: { ...CORS, 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791396922' } });
    return true;
  });
  await page.goto('/#/map/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('limiting reads');
  await expect(page.getByRole('alert')).toContainText('The CLI reads a checkout with no limit: npx -p @vrun-design/openflowkit-mcp openflowkit map .');
  await expect(page.getByRole('alert')).not.toContainText('discover');
  expect(((await page.getByRole('alert').innerText()).match(/openflowkit map/g) ?? []).length, 'the command, once').toBe(1);
  await expect(page.getByRole('button', { name: 'Try with token' })).toHaveAttribute('data-variant', 'primary');
  limited = false;
  await page.getByLabel('GitHub token (optional)').fill('github_pat_test123');
  await page.getByRole('button', { name: 'Try with token' }).click();
  await expect(box(page, 'web')).toBeVisible({ timeout: 20_000 });
  expect(seen.some((entry) => entry.url.startsWith('https://api.github.com/') && entry.auth === 'Bearer github_pat_test123')).toBe(true);
  expect(seen.filter((entry) => entry.url.startsWith('https://raw.githubusercontent.com/')).every((entry) => entry.auth === undefined)).toBe(true);
  expect(page.url()).not.toContain('github_pat');
});

test('a repo that is not found, an unreachable GitHub and a repo with nothing to map each say so @gate', async ({ page }) => {
  await serveGitHub(page, null);
  await page.goto('/#/map/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('not found, or it is private');
  expect(((await page.getByRole('alert').innerText()).match(/openflowkit map/g) ?? []).length, 'the command, once').toBe(1);
  await expect(page.getByRole('alert')).toContainText('openflowkit map .');
  await expect(page.getByRole('button', { name: 'Back to home' })).toHaveAttribute('data-variant', 'primary');

  await page.unroute('https://api.github.com/repos/acme/shop/git/trees/**');
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => route.abort('connectionrefused'));
  await page.goto('/#/map/github/acme/other');
  await page.goto('/#/map/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('could not be reached');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

  await page.unroute('https://api.github.com/repos/acme/shop/git/trees/**');
  await serveGitHub(page, { 'README.md': '# nothing\n', 'LICENSE': 'MIT\n' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Nothing to map here.')).toBeVisible({ timeout: 20_000 });
});
