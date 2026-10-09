import { expect, test, type Page } from './test';
import { centreOf, doc, state } from './helpers';

// M4.5: the model changes under an open Map (the Code panel, or the agent over the live bridge). The map re-derives with its
// motion, keeps what the reader opened and the selection, and undo brings it back with an announcement.
interface MapState { open: string[]; nodes: string[] }
interface Motion { running: boolean; frames?: number }
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState()).catch(() => ({ open: [], nodes: [] }));
const motion = (page: Page): Promise<Motion> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapMotion(): Motion } }).__V2__.getMapMotion());
const settled = (page: Page) => expect.poll(async () => (await motion(page)).running).toBe(false);
const selected = async (page: Page) => (await state(page)).selectedNodes;

const BRIDGE_PORT = 44_000 + (process.pid % 1_000);

/** The page samples the motion state, so a short move is not missed between two polls. */
const watchMotion = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __sawRunning?: boolean; __V2__: { getMapMotion(): Motion } };
  w.__sawRunning = false;
  setInterval(() => { if (w.__V2__.getMapMotion().running) w.__sawRunning = true; }, 5);
});
const sawMotion = (page: Page) => page.evaluate(() => (window as unknown as { __sawRunning?: boolean }).__sawRunning === true);

async function openMapWithApiSelected(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const rail = page.getByRole('toolbar', { name: 'Workspace', exact: true });
  await rail.getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page).catch(() => null))?.pages.length).toBe(3);
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
  await settled(page);
  expect((await mapState(page)).open).toContain('shop');
  // Selecting shop.api by click also opens it: the reader's open set is {shop, shop.api}.
  const at = await centreOf(page, 'shop.api');
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => selected(page)).toEqual(['shop.api']);
  await settled(page);
}

/** What the user should see once the change has landed and the map has finished moving. */
async function expectDerived(page: Page): Promise<void> {
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.cache');
  await settled(page);
  const after = await mapState(page);
  expect(after.open).toEqual(expect.arrayContaining(['shop', 'shop.api']));
  expect(await selected(page)).toEqual(['shop.api']);
}

async function expectUndo(page: Page): Promise<void> {
  // Focus the canvas without touching a box, then undo as a user does.
  const canvas = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(canvas.x + 10, canvas.y + 100);
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('shop.cache');
  await expect(page.getByText('Undid last change').first()).toBeVisible();
  await settled(page);
  expect((await mapState(page)).open).toEqual(expect.arrayContaining(['shop', 'shop.api']));
}

const withCache = (dsl: string): string => dsl
  .replace(' store Database', ' container Cache [tech: Redis, desc: Session cache]\n store Database')
  .replace('  API -> Database', '  API -> Cache : caches sessions [tech: TCP]\n  API -> Database');

for (const reduced of [false, true]) {
  test(`the Code panel changes the model under an open Map${reduced ? ' (reduced motion)' : ''} @gate`, async ({ page }) => {
    test.setTimeout(90_000);
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await openMapWithApiSelected(page);
    const source = page.getByRole('textbox', { name: 'Diagram source' });
    // The panel may already be open (creating the workspace opens it): the rail button toggles.
    if (!(await source.isVisible())) await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code', exact: true }).click();
    await expect(source).toBeVisible();
    const text = await source.inputValue();
    expect(withCache(text), 'the starter text has the lines to extend').not.toBe(text);
    await watchMotion(page);
    await source.fill(withCache(text));
    await source.press('ControlOrMeta+Enter');
    await expectDerived(page);
    // `running` also covers a layout still on its way, so reduced motion is judged by the frames the player drew.
    if (reduced) expect((await motion(page)).frames ?? 0, 'reduced motion: end state at once, no frames').toBe(0);
    else expect(await sawMotion(page), 'the new box grows in with motion').toBe(true);
    await expectUndo(page);
  });
}

test('the agent changes the model over the live bridge under an open Map @gate', async ({ page }) => {
  test.setTimeout(90_000);
  // A stand-in for the MCP server's HTTP side: the editor long-polls /next, we hand it one update_diagram op.
  let queued: { id: string; op: string; input: unknown; pageId?: string } | null = null;
  const results: unknown[] = [];
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  await page.route(`http://127.0.0.1:${BRIDGE_PORT}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/next') {
      if (queued) { const request = queued; queued = null; return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(request) }); }
      await new Promise((resolve) => setTimeout(resolve, 150));
      return route.fulfill({ status: 204, headers: cors }).catch(() => undefined);
    }
    if (url.pathname === '/result') results.push(JSON.parse(route.request().postData() ?? 'null'));
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: '{}' });
  });
  await page.addInitScript((port) => {
    const key = 'openflowkit-v2-preferences';
    const current = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    window.localStorage.setItem(key, JSON.stringify({ ...current, agentBridgeEnabled: true, bridgePort: port, bridgeToken: '' }));
  }, BRIDGE_PORT);
  await openMapWithApiSelected(page);
  await expect(page.locator('[data-bridge-status="connected"]')).toBeVisible({ timeout: 30_000 });

  // The op an agent sends: the whole model's new text for the Landscape frame, as get_diagram would have given it.
  const document = (await doc(page))!;
  const framePage = document.pages[0]!;
  const frame = framePage.nodes.find((node) => (node.metadata as { dsl?: unknown } | undefined)?.dsl !== undefined);
  expect(frame, 'the landscape page carries its model frame').toBeTruthy();
  const dsl = (frame!.metadata as { dsl: { text?: string; source?: string } }).dsl;
  const original = dsl.text ?? dsl.source;
  expect(original, 'the frame keeps its DSL text').toBeTruthy();
  await watchMotion(page);
  queued = { id: 'live-edit-1', op: 'update_diagram', input: { frameId: frame!.id, dsl: withCache(original!) }, pageId: framePage.id };
  await expectDerived(page);
  expect(await sawMotion(page), 'the new box grows in with motion').toBe(true);
  expect(results.at(0), 'the agent got an ok result').toMatchObject({ ok: true });
  await expectUndo(page);
});
