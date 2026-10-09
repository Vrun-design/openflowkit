import { expect, test, type Page } from './test';
import { centreOf, doc, rect, state } from './helpers';

const META = process.platform === 'darwin' ? 'Meta' : 'Control';

// A repo's map in the editor (#/map/github/<owner>/<repo> opens /d/map-<owner>-<repo>): GitHub's tree and raw files are
// served by page.route from a small fake repo (two parts, a two-way import, a compose relation, a store), so no network.
// Box ids on the canvas are the map's ids ('web', 'web/src', 'web/src/ui/Modal.ts', 'root#outside', 'ext:db').
// npx playwright test e2e/map-repo.spec.ts

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


interface MapState { mode: 'canvas' | 'map'; open: string[]; nodes: string[]; connectors: { id: string; from: string; to: string; label: string; kind: string | null }[] }
interface Motion { running: boolean; frames: number; arrowAlpha: number }
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState());
const motion = (page: Page): Promise<Motion> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapMotion(): Motion } }).__V2__.getMapMotion());
const settled = (page: Page) => expect.poll(async () => (await motion(page)).running, { timeout: 20_000 }).toBe(false);
const selected = async (page: Page) => (await state(page)).selectedNodes;
const kinds = async (page: Page) => [...new Set((await mapState(page)).connectors.map((c) => c.kind))];
const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Map depth', exact: true });
const pill = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true });
const alert = (page: Page) => page.getByRole('alert');

/** The repo's map opened in the editor, loaded and settled. */
async function openMap(page: Page, repo: Readonly<Record<string, string>> = REPO): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await serveGitHub(page, repo);
  await page.goto('/#/map/github/acme/shop');
  await expect(page).toHaveURL(/#\/d\/map-acme_shop$/);
  await page.waitForFunction(() => '__V2__' in window);
  await expect.poll(async () => (await mapState(page)).nodes.length, { timeout: 20_000 }).toBeGreaterThan(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 20_000 });
  await settled(page);
}

/** An open box is mostly its children: its own click target is the header strip. */
async function clickHeader(page: Page, id: string): Promise<void> {
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const r = (await rect(page, id))!;
  await page.mouse.click(canvas.x + r.x + 12, canvas.y + r.y + 8);
}

async function click(page: Page, id: string): Promise<void> {
  const at = await centreOf(page, id);
  await page.mouse.click(at.x, at.y);
}

test('the first paint shows the parts, open, with the arrow between them @gate', async ({ page }) => {
  await openMap(page);
  const map = await mapState(page);
  expect(map.mode).toBe('map');
  expect(map.open).toEqual(expect.arrayContaining(['web', 'api', 'root#outside']));
  expect(map.nodes).toEqual(expect.arrayContaining(['web', 'api', 'ext:db']));
  const has = (from: string, to: string, kind: string) => map.connectors.some((c) => c.from === from && c.to === to && c.kind === kind);
  expect(map.connectors.some((c) => c.kind === 'import' && /⇄/.test(c.label))).toBe(true);
  // Discovery's compose reading: web calls api, and api reaches the database in the Outside services box.
  expect(has('web', 'api', 'call')).toBe(true);
  expect(has('api', 'root#outside', 'data') || has('api', 'ext:db', 'data')).toBe(true);
  // The editor frame is the map: no separate page, no Canvas content behind it.
  await expect(page.getByTestId('v2-map')).toHaveCount(0);
});

test('a click opens a box and a second click closes it @gate', async ({ page }) => {
  await openMap(page);
  const before = (await mapState(page)).nodes.length;
  await click(page, 'web/src');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('web/src/ui');
  expect((await mapState(page)).nodes.length).toBeGreaterThan(before);
  await settled(page);
  await page.waitForTimeout(450); // past the double-click guard
  // An open box is mostly its children: its own click target is the header strip.
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const r = (await rect(page, 'web/src'))!;
  await page.mouse.click(canvas.x + r.x + 12, canvas.y + r.y + 8);
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('web/src/ui');
});

test('an arrow opens its evidence with a GitHub link per line @gate', async ({ page }) => {
  await openMap(page);
  const arrow = (await mapState(page)).connectors.find((c) => c.kind === 'import' && /web|api/.test(c.from + c.to))!;
  const lane = await page.evaluate((id: string) =>
    (window as unknown as { __V2__: { getConnectorScreenSamples(id: string): { x: number; y: number }[] | null } }).__V2__.getConnectorScreenSamples(id) ?? [], arrow.id);
  const [a, b] = [lane[0]!, lane[lane.length - 1]!];
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(canvas.x + a.x + (b.x - a.x) / 4, canvas.y + a.y + (b.y - a.y) / 4);
  await expect.poll(async () => (await state(page)).selectedConnector).toBe(arrow.id);
  const links = page.locator('a[href^="https://github.com/acme/shop/blob/"]');
  await expect(links.first()).toHaveAttribute('href', /\/blob\/HEAD\/(?:web|api)\/src\/.+#L\d+$/);
  expect(await links.count()).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('web/src/lib/client.ts').first()).toBeVisible();
  await expect(page.locator('a[href*="/blob/abc/"]'), 'links name the ref, never the tree sha').toHaveCount(0);
});

test('a selected box shows where it lives, what it talks to and what is inside @gate', async ({ page }) => {
  await openMap(page);
  await click(page, 'web/src');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('web/src/ui');
  await settled(page);
  await page.waitForTimeout(450);
  await clickHeader(page, 'web/src'); // closed again: a selected, shut folder
  await expect.poll(() => selected(page)).toEqual(['web/src']);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  const panel = page.getByLabel('Selected box');
  await expect(panel).toContainText('web/src');
  await expect(panel).toContainText('Folder · 8 files');
  await expect(panel.getByRole('link', { name: 'web/src' })).toHaveAttribute('href', 'https://github.com/acme/shop/tree/HEAD/web/src');
  const inside = panel.getByRole('list', { name: 'Inside' });
  await expect(inside).toContainText('ui/');
  await inside.getByRole('button', { name: 'ui/', exact: true }).click();
  await expect.poll(() => selected(page)).toEqual(['web/src/ui']);
  await expect(page.getByLabel('Selected box')).toContainText('web/src/ui');
});

test('depth presets change what is drawn @gate', async ({ page }) => {
  await openMap(page);
  // Top level is every box shut, whatever this small repo opened with.
  await pill(page, 'Top level').click();
  await expect(pill(page, 'Top level')).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  const overview = (await mapState(page)).nodes.length;
  await pill(page, 'All levels').click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(overview);
  await expect(pill(page, 'All levels')).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  await pill(page, 'Top level').click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBe(overview);
  await settled(page);
});

test('the Connections menu switches each kind of arrow off and on @gate', async ({ page }) => {
  await openMap(page);
  const trigger = toolbar(page).getByRole('button', { name: 'Connections', exact: true });
  expect(await kinds(page)).toEqual(expect.arrayContaining(['import', 'call', 'data']));
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('menuitemcheckbox', { name: /^import/i }).click();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect.poll(() => kinds(page)).not.toContain('import');
  expect(await kinds(page)).toEqual(expect.arrayContaining(['call', 'data']));
  await trigger.click();
  await page.getByRole('menuitemcheckbox', { name: /^import/i }).click();
  await page.mouse.click(700, 700);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => kinds(page)).toContain('import');
});

test('Find reveals a file buried in a closed folder and selects it @gate', async ({ page }) => {
  await openMap(page);
  await click(page, 'web');
  await page.keyboard.press('Meta+f');
  const find = page.getByRole('searchbox', { name: 'Find in map' });
  await expect(find).toBeVisible();
  await find.fill('Modal');
  await expect(page.locator('.ofk-v2-find-count')).toContainText('found');
  await page.keyboard.press('Enter');
  await expect.poll(() => selected(page)).toEqual(['web/src/ui/Modal.ts']);
  await expect.poll(async () => (await mapState(page)).nodes).toContain('web/src/ui/Modal.ts');
  await find.fill('zzzz');
  await expect(page.locator('.ofk-v2-find-count')).toContainText(/no match|0/i);
});

test('the keyboard walks between boxes, opens and backs out of them @gate', async ({ page }) => {
  await openMap(page);
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(canvas.x + 10, canvas.y + 100);
  await expect.poll(() => selected(page)).toEqual([]);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await selected(page)).length).toBe(1);
  const first = (await selected(page))[0]!;
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  for (let i = 0; i < 8 && (await selected(page))[0] === first; i++) await page.keyboard.press(keys[i % 4]!);
  expect((await selected(page))[0]).not.toBe(first);
  // Down from an open part enters it; Up goes back out. Escape closes the box around the selection, then clears it.
  await clickHeader(page, 'web'); // selects it and, being open, closes it; Enter opens it again
  await expect.poll(() => selected(page)).toEqual(['web']);
  await page.waitForTimeout(450);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await mapState(page)).open).toContain('web');
  await settled(page);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await selected(page))[0]?.startsWith('web/')).toBe(true);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => selected(page)).toEqual(['web']);
  // A top-level part has no box around it: Escape clears the selection.
  await page.keyboard.press('Escape');
  await expect.poll(() => selected(page)).toEqual([]);
  // Inside an open folder, Escape closes the folder and selects it.
  await click(page, 'web/src');
  await expect.poll(async () => (await mapState(page)).open).toContain('web/src');
  await settled(page);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await selected(page))[0]?.startsWith('web/src/')).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await mapState(page)).open).not.toContain('web/src');
  await expect.poll(() => selected(page)).toEqual(['web/src']);
});

test('with reduced motion a box opens in one step, with no frames between @gate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMap(page);
  await click(page, 'web/src');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('web/src/ui');
  const m = await motion(page);
  expect(m.frames).toBe(0);
  expect(m.running).toBe(false);
  expect(m.arrowAlpha).toBe(1);
});

test('reopening the document later loads the map again, and the same address opens the same document @gate', async ({ page }) => {
  await openMap(page);
  await page.reload();
  await page.waitForFunction(() => '__V2__' in window);
  await expect.poll(async () => (await mapState(page)).nodes.length, { timeout: 20_000 }).toBeGreaterThan(0);
  await settled(page);
  // The same address is the same document: a revisit reopens it instead of piling up copies.
  await page.goto('/#/map/github/acme/shop');
  await expect(page).toHaveURL(/#\/d\/map-acme_shop$/);
  await page.goto('/#/home');
  await expect(page.getByText('acme/shop')).toHaveCount(1);
});

test('a bad address says so @gate', async ({ page }) => {
  await page.goto('/#/map/github/..');
  await expect(alert(page)).toContainText('not a GitHub repo address');
  await expect(page.getByRole('button', { name: 'Back to home' })).toHaveAttribute('data-variant', 'primary');
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
  await expect(alert(page)).toContainText('limiting reads');
  await expect(alert(page)).toContainText('The CLI reads a checkout with no limit: npx -p @vrun-design/openflowkit-mcp openflowkit map .');
  await expect(alert(page)).not.toContainText('discover');
  expect(((await alert(page).innerText()).match(/openflowkit map/g) ?? []).length, 'the command, once').toBe(1);
  await expect(page.getByRole('button', { name: 'Try with token' })).toHaveAttribute('data-variant', 'primary');
  limited = false;
  await page.getByLabel('GitHub token (optional)').fill('github_pat_test123');
  await page.getByRole('button', { name: 'Try with token' }).click();
  await expect.poll(async () => (await mapState(page)).nodes, { timeout: 20_000 }).toContain('web');
  expect(seen.some((entry) => entry.url.startsWith('https://api.github.com/') && entry.auth === 'Bearer github_pat_test123')).toBe(true);
  expect(seen.filter((entry) => entry.url.startsWith('https://raw.githubusercontent.com/')).every((entry) => entry.auth === undefined)).toBe(true);
  expect(page.url()).not.toContain('github_pat');
});

test('a repo that is not found, an unreachable GitHub and a repo with nothing to map each say so @gate', async ({ page }) => {
  await serveGitHub(page, null);
  await page.goto('/#/map/github/acme/shop');
  await expect(alert(page)).toContainText('not found, or it is private');
  await expect(toolbar(page), 'no toolbar for a map that is not there').toHaveCount(0);
  expect(((await alert(page).innerText()).match(/openflowkit map/g) ?? []).length, 'the command, once').toBe(1);
  await expect(page.getByRole('button', { name: 'Back to home' })).toHaveAttribute('data-variant', 'primary');

  await page.unroute('https://api.github.com/repos/acme/shop/git/trees/**');
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => route.abort('connectionrefused'));
  await page.goto('/#/map/github/acme/other');
  await page.goto('/#/map/github/acme/shop');
  await expect(alert(page)).toContainText('could not be reached');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

  await page.unroute('https://api.github.com/repos/acme/shop/git/trees/**');
  await serveGitHub(page, { 'README.md': '# nothing\n', 'LICENSE': 'MIT\n' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Nothing to map here.')).toBeVisible({ timeout: 20_000 });
});

test('a crowded level draws its strongest arrows and offers the rest @gate', async ({ page }) => {
  // Ten folders, each importing the next three: 30 arrows at the top level, a budget of 15.
  const dense: Record<string, string> = {};
  for (let i = 0; i < 10; i++) dense[`p${i}/index.ts`] = [1, 2, 3].map((d) => imp(`x${d}`, `../p${(i + d) % 10}/index`)).join('') + `export const x${i} = 1;\n`;
  await openMap(page, dense);
  await expect.poll(async () => (await mapState(page)).connectors.length).toBe(15);
  const chip = page.getByRole('group', { name: 'Arrows shown' });
  await expect(chip).toContainText('Showing 15 of 30 links');
  await chip.getByRole('button', { name: 'Show all' }).click();
  await expect.poll(async () => (await mapState(page)).connectors.length).toBe(30);
  await expect(chip).toContainText('Showing all 30 links');
  await chip.getByRole('button', { name: 'Show fewer' }).click();
  await expect.poll(async () => (await mapState(page)).connectors.length).toBe(15);
});

test('a repo document cannot be edited: no new elements, no generated diagram, nothing for undo @gate', async ({ page }) => {
  await openMap(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add element' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create C4 workspace' })).toHaveCount(0);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nA -> B');
  await source.press(`${META}+Enter`);
  await page.waitForTimeout(800);
  expect((await doc(page))!.pages.flatMap((p) => p.nodes)).toHaveLength(0);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.keyboard.press(`${META}+z`);
  expect((await state(page)).selectedNodes).toEqual([]);
  expect((await mapState(page)).nodes.length).toBeGreaterThan(0);
});

test('JSON export keeps the document, and the share/JSON source is not the Map scene @gate', async ({ page }) => {
  await openMap(page);
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('radio', { name: 'JSON' }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download' }).click();
  const json = JSON.parse((await (await (await download).createReadStream()).toArray()).join('')) as { metadata: { map?: { source?: { owner?: string; repo?: string } } }; pages: { nodes: unknown[] }[] };
  expect(json.metadata.map?.source).toMatchObject({ owner: 'acme', repo: 'shop' });
  expect(json.pages.flatMap((p) => p.nodes), 'the stored page, not the Map scene').toHaveLength(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await dialog.getByRole('radio', { name: 'SVG' }).click();
  const svgDownload = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download' }).click();
  const svg = (await (await (await svgDownload).createReadStream()).toArray()).join('');
  expect(svg, 'SVG draws what is on screen').toContain('web');
});
