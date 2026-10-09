import { expect, test, type Page } from './test';
import { centreOf, doc, emptyPoint, openCanvas, rect, state } from './helpers';

interface MapState {
  mode: 'canvas' | 'map';
  open: string[];
  nodes: string[];
  labels: Record<string, string>;
  /** How many layouts have landed: a click that changes nothing must not add one. */
  layouts: number;
  connectors: { id: string; from: string; to: string; label: string }[];
  /** What the canvas keeps bright around the selection (null: nothing dimmed) and whether its arrows are marching. */
  focus: { nodeIds: string[]; connectorIds: string[]; twoWayIds?: string[]; animating: boolean } | null;
}
const mapState = (page: Page): Promise<MapState> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): MapState } }).__V2__.getMapState());

// Past the editor's double-click guard (400 ms after a click that opened or closed a box): two flips this far apart are two clicks.
const BETWEEN_CLICKS_MS = 450;

async function openC4(page: Page, width = 1440): Promise<void> {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  // The Model panel stays open from here.
  await expect(page.getByRole('complementary', { name: 'Architecture model' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Diagram as code' })).toHaveCount(0);
  // A phone-width panel covers the bar and the canvas: the switch tests need them.
  if (width <= 720) await page.getByRole('button', { name: 'Close panel' }).click();
}

const mapButton = (page: Page) => page.getByRole('button', { name: 'Map', exact: true });
const canvasButton = (page: Page) => page.getByRole('button', { name: 'Canvas', exact: true });

async function enterMap(page: Page): Promise<void> {
  await mapButton(page).click();
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
}

/** An open box is mostly its children: its own click target is the header strip. */
async function clickHeader(page: Page, id: string): Promise<void> {
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const r = (await rect(page, id))!;
  await page.mouse.click(box.x + r.x + 12, box.y + r.y + 8);
}

async function click(page: Page, id: string): Promise<void> {
  const at = await centreOf(page, id);
  await page.mouse.click(at.x, at.y);
}

test('Map shows the model as boxes; a click opens a box in place and a second closes it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  await enterMap(page);
  const first = await mapState(page);
  expect(first.mode).toBe('map');
  expect(first.nodes).toEqual(expect.arrayContaining(['customer', 'shop', 'payments']));
  expect(first.nodes).not.toContain('shop.api.orders');
  // Arrows are labelled with the relation they stand for.
  expect(first.connectors.map((c) => c.label).join('|')).toContain('shops');

  await click(page, 'shop.api');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  expect((await state(page)).selectedNodes).toEqual(['shop.api']);
  await page.waitForTimeout(BETWEEN_CLICKS_MS);
  await clickHeader(page, 'shop.api');
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('shop.api.orders');
});

test('a click on a leaf changes neither the open boxes nor the layout @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.web');
  const before = await mapState(page);
  await click(page, 'shop.web');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.web']);
  await page.keyboard.press('Enter');
  // Nothing to poll for: a relayout, if there were one, lands within a few frames.
  await page.waitForTimeout(400);
  const after = await mapState(page);
  expect(after.open).toEqual(before.open);
  expect(after.layouts).toBe(before.layouts);
});

test('browsing the map never dirties the document or adds an undo step @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  // A reload empties the undo stack, so any step the browsing adds is the only thing ⌘Z could undo.
  await expect.poll(async () => (await state(page)).save).toBe('saved');
  await page.reload();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
  const revision = (await state(page)).revision;
  const pages = JSON.stringify((await doc(page))!.pages);
  await enterMap(page);
  await click(page, 'shop.api');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Meta+z');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  expect((await state(page)).revision).toBe(revision);
  expect(JSON.stringify((await doc(page))!.pages)).toBe(pages);
});

test('Delete, drag, nudge, typing and duplicate on a map box change nothing @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  const revision = (await state(page)).revision;
  const pages = JSON.stringify((await doc(page))!.pages);
  await click(page, 'customer');
  expect((await state(page)).selectedNodes).toEqual(['customer']);
  // Selecting a model element shows it in the Model panel, whose fields are the only inputs there should be.
  const editors = await page.locator('textarea, [contenteditable="true"]').count();
  const at = await centreOf(page, 'customer');
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 120, at.y + 60, { steps: 6 });
  await page.mouse.up();
  for (const key of ['Delete', 'Backspace', 'ArrowRight', 'Shift+ArrowDown', 'Meta+d', 'Control+d', 'Meta+Shift+Backspace', 'F2', 'q', 'Meta+x', 'Meta+a', 'r']) {
    await page.keyboard.press(key);
  }
  await page.mouse.dblclick(at.x, at.y);
  await page.waitForTimeout(300);
  await expect(page.locator('textarea, [contenteditable="true"]')).toHaveCount(editors);
  expect((await state(page)).revision).toBe(revision);
  expect(JSON.stringify((await doc(page))!.pages)).toBe(pages);
  // The box did not move on the map either.
  const after = await rect(page, 'customer');
  expect(Math.abs(after!.x + after!.width / 2 - (at.x - (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!.x))).toBeLessThan(2);
  await expect(page.getByTestId('v2-editor')).toHaveAttribute('data-tool', 'select');
});

test('M returns to Canvas with the original page, the camera and the selection kept @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await click(page, 'customer');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['customer']);
  const canvasBox = await rect(page, 'customer');
  // Nothing selected: M is a mode key, not type-to-edit.
  await page.keyboard.press('Escape');
  await page.keyboard.press('m');
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await mapState(page)).nodes.length).toBeGreaterThan(0);
  await click(page, 'customer');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['customer']);
  await page.keyboard.press('m');
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  expect((await mapState(page)).nodes).toEqual([]);
  expect((await state(page)).selectedNodes).toEqual(['customer']);
  const back = await rect(page, 'customer');
  expect(Math.abs(back!.x - canvasBox!.x)).toBeLessThan(2);
  expect(Math.abs(back!.width - canvasBox!.width)).toBeLessThan(1);
});

test('Escape closes the box around the selection, then clears it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  await click(page, 'shop.api');
  await expect.poll(async () => (await mapState(page)).nodes).toContain('shop.api.orders');
  await page.waitForTimeout(BETWEEN_CLICKS_MS);
  await click(page, 'shop.api.orders');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('shop.api.orders');
  // The reader keeps their place: the box that closed is the one now selected.
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.api']);
  // Escape again: the open box has no open parent but Shop, which closes in turn.
  await page.waitForTimeout(BETWEEN_CLICKS_MS);
  await click(page, 'shop.api');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await mapState(page)).nodes).not.toContain('shop.web');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop']);
  // Nothing selected is left to close: Escape clears the selection.
  await click(page, 'customer');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual([]);
});

test('another page of the model keeps the map where it is; leaving Map lands on that page @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  const before = (await rect(page, 'customer'))!;
  await page.getByRole('button', { name: /^Pages/ }).click();
  const list = page.getByRole('dialog', { name: 'Pages', exact: true });
  const other = list.locator('.ofk-v2-page-select:not([aria-current="page"])').first();
  const name = (await other.innerText()).trim();
  await other.click();
  await page.getByRole('button', { name: 'Close pages' }).click();
  await expect.poll(async () => (await mapState(page)).nodes).toContain('customer');
  expect((await mapState(page)).mode).toBe('map');
  // The map did not jump to the other page's content.
  const during = (await rect(page, 'customer'))!;
  expect(Math.abs(during.x - before.x)).toBeLessThan(2);
  expect(Math.abs(during.y - before.y)).toBeLessThan(2);

  await canvasButton(page).click();
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  // Canvas shows the page switched to, framed: every one of its top-level nodes is on screen.
  const target = (await doc(page))!.pages.find((p) => p.name === name)!;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await expect.poll(async () => {
    const rects = await Promise.all(target.nodes.map((n) => rect(page, n.id)));
    return rects.some((r) => r !== null) && rects.every((r) => r === null
      || (r.x >= -1 && r.y >= -1 && r.x + r.width <= box.width + 1 && r.y + r.height <= box.height + 1));
  }).toBe(true);
});

test('an edit made from the Model panel shows in the map, and undo takes it back there too @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  const original = (await mapState(page)).labels.customer!;
  // openC4 leaves the Model panel open.
  await page.getByLabel('Search architecture').fill(original);
  await page.getByRole('treeitem', { name: new RegExp(`^${original}`) }).first().focus();
  await page.keyboard.press('Enter');
  const name = page.getByLabel('Name', { exact: true });
  await name.fill('Buyer');
  await name.blur(); // saves as you leave the field
  await expect.poll(async () => (await mapState(page)).labels.customer).toContain('Buyer');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await mapState(page)).labels.customer).toBe(original);
  // Not silent: what was undone is announced, the Canvas page behind the map being what changed.
  await expect(page.getByText('Undid last change').first()).toBeAttached();
});

test('a selected map box shows an outline and no handles to resize or rotate it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  const handleAtCorner = async (id: string) => {
    const r = (await rect(page, id))!;
    return page.evaluate((at) => (window as unknown as { __V2__: { pickTransformHandle(p: { x: number; y: number }): string | null } })
      .__V2__.pickTransformHandle(at), { x: r.x + r.width, y: r.y + r.height });
  };
  // The probe means something: on Canvas the same corner is a handle.
  await click(page, 'customer');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['customer']);
  expect(await handleAtCorner('customer')).not.toBeNull();
  await enterMap(page);
  await click(page, 'customer');
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['customer']);
  expect(await handleAtCorner('customer')).toBeNull();
});

test('a click on an arrow lists the relations behind it in the Model panel @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  const arrow = (await mapState(page)).connectors.find((c) => c.from === 'customer' || c.to === 'customer')!;
  const lane = await page.evaluate((id: string) =>
    (window as unknown as { __V2__: { getConnectorScreenSamples(id: string): { x: number; y: number }[] | null } }).__V2__.getConnectorScreenSamples(id) ?? [], arrow.id);
  // A quarter of the way along, clear of the label in the middle.
  const [a, b] = [lane[0]!, lane[lane.length - 1]!];
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(box.x + a.x + (b.x - a.x) / 4, box.y + a.y + (b.y - a.y) / 4);
  await expect.poll(async () => (await state(page)).selectedConnector).toBe(arrow.id);
  const panel = page.getByText('1 relation', { exact: true });
  await expect(panel).toBeVisible();
  await expect(page.getByText('shops · HTTPS', { exact: true })).toBeVisible();
});

test('a plain diagram has no Canvas | Map switch @gate', async ({ page }) => {
  await openCanvas(page);
  await expect(page.getByRole('group', { name: 'View mode' })).toHaveCount(0);
  await page.keyboard.press('m');
  expect((await mapState(page)).mode).toBe('canvas');
});

test('the Canvas | Map switch sits right after the title and never moves; the path follows it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  const crumbs = page.getByRole('navigation', { name: 'Architecture level' });
  // The first page of a C4 workspace is its top view, by the name "Landscape".
  await expect(crumbs).toBeVisible();
  await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('Landscape');
  const bar = page.getByRole('toolbar', { name: 'Document', exact: true });
  const modes = bar.getByRole('group', { name: 'View mode' });
  const [navBox, divider, modesBox] = [await crumbs.boundingBox(), await bar.locator('.ofk-v2-divider').boundingBox(), await modes.boundingBox()];
  expect(modesBox!.x + modesBox!.width).toBeLessThanOrEqual(divider!.x);
  expect(divider!.x + divider!.width).toBeLessThanOrEqual(navBox!.x);
  await enterMap(page);
  // Nothing selected: no path, and no divider for it.
  await expect(page.getByRole('navigation', { name: 'Map path' })).toHaveCount(0);
  await expect(crumbs).toHaveCount(0);
  await expect(bar.locator('.ofk-v2-divider')).toHaveCount(0);
  expect((await modes.boundingBox())!.x).toBe(modesBox!.x);
  await canvasButton(page).click();
  await expect(crumbs).toBeVisible();
});

for (const width of [1440, 700]) test(`the switch is under the same point in Canvas and Map, with a path in Map, at ${width}px @gate`, async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page, width);
  await page.getByRole('button', { name: /^Pages/ }).click();
  await page.getByRole('dialog', { name: 'Pages', exact: true }).getByRole('button', { name: /^Services: Shop/ }).click();
  await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('Services: Shop');
  const before = (await mapButton(page).boundingBox())!;
  await enterMap(page);
  await click(page, 'shop.api');
  const path = page.getByRole('navigation', { name: 'Map path' });
  await expect(path).toBeVisible();
  await expect(path.locator('.ofk-v2-breadcrumb-current')).toHaveText('API');
  const inMap = (await mapButton(page).boundingBox())!;
  expect(inMap.x).toBe(before.x);
  expect(inMap.width).toBe(before.width);
  // An ancestor segment selects that box; the current one is no button.
  await expect(path.getByRole('button', { name: 'API' })).toHaveCount(0);
  await path.getByRole('button', { name: 'Shop', exact: true }).click();
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop']);
  await expect(path.locator('.ofk-v2-breadcrumb-current')).toHaveText('Shop');
  // The button the keyboard was on became the current crumb: focus follows it.
  await expect(path.locator('.ofk-v2-breadcrumb-current')).toBeFocused();
  await expect(path.locator('[aria-current="location"]')).toHaveCount(1);
  // The Map segment is a segmented control, not a toggle: pressing it again stays in Map (the M key toggles).
  await mapButton(page).click();
  await expect(mapButton(page)).toHaveAttribute('aria-pressed', 'true');
  // The Canvas button is under the point the Map button was at.
  const canvasAt = (await canvasButton(page).boundingBox())!;
  const mapAt = (await mapButton(page).boundingBox())!;
  expect(mapAt.x).toBe(before.x);
  await page.mouse.click(mapAt.x - canvasAt.width / 2, mapAt.y + mapAt.height / 2);
  await expect(canvasButton(page)).toHaveAttribute('aria-pressed', 'true');
});

test('a click on a box focuses it and the boxes it talks to; an empty click, Escape or leaving Map clears it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  expect((await mapState(page)).focus).toBeNull();
  await click(page, 'customer');
  await expect.poll(async () => (await mapState(page)).focus?.nodeIds ?? []).toContain('customer');
  const map = await mapState(page);
  const touching = map.connectors.filter((c) => c.from === 'customer' || c.to === 'customer');
  expect(touching.length).toBeGreaterThan(0);
  expect(map.focus!.connectorIds).toEqual(touching.map((c) => c.id).sort());
  expect(map.focus!.nodeIds).toEqual([...new Set(['customer', ...touching.flatMap((c) => [c.from, c.to])])].sort());
  expect(map.focus!.animating).toBe(true);
  // Empty canvas clears it.
  const empty = await emptyPoint(page, 700, 960);
  await page.mouse.click(empty.x, empty.y);
  await expect.poll(async () => (await mapState(page)).focus).toBeNull();
  // Escape clears it too (after the editor's own cancel chain).
  await click(page, 'customer');
  await expect.poll(async () => (await mapState(page)).focus !== null).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await mapState(page)).focus).toBeNull();
  // Leaving Map clears it.
  await click(page, 'customer');
  await expect.poll(async () => (await mapState(page)).focus !== null).toBe(true);
  await canvasButton(page).click();
  await expect.poll(async () => (await mapState(page)).mode).toBe('canvas');
  expect((await mapState(page)).focus).toBeNull();
});

test('a click on an arrow focuses the arrow and its two ends @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openC4(page);
  await enterMap(page);
  const arrow = (await mapState(page)).connectors.find((c) => c.from === 'customer' || c.to === 'customer')!;
  const lane = await page.evaluate((id: string) =>
    (window as unknown as { __V2__: { getConnectorScreenSamples(id: string): { x: number; y: number }[] | null } }).__V2__.getConnectorScreenSamples(id) ?? [], arrow.id);
  const [a, b] = [lane[0]!, lane[lane.length - 1]!];
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  await page.mouse.click(box.x + a.x + (b.x - a.x) / 4, box.y + a.y + (b.y - a.y) / 4);
  await expect.poll(async () => (await mapState(page)).focus?.connectorIds).toEqual([arrow.id]);
  expect((await mapState(page)).focus!.nodeIds).toEqual([...new Set([arrow.from, arrow.to])].sort());
  expect((await mapState(page)).focus!.animating).toBe(true);
});

test('with reduced motion the focus is shown and the arrows do not march @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openC4(page);
  await enterMap(page);
  await click(page, 'customer');
  await expect.poll(async () => (await mapState(page)).focus?.nodeIds ?? []).toContain('customer');
  expect((await mapState(page)).focus!.connectorIds.length).toBeGreaterThan(0);
  expect((await mapState(page)).focus!.animating).toBe(false);
});

test('an arrow between boxes that call each other is two-way, and its focus marches both ways @gate', async ({ page }) => {
  test.setTimeout(60_000);
  const dsl = '%% ofk 1\narchitecture\ntitle: Two ways\nmodel {\n system Web\n system Api\n system Db\n Web -> Api : asks\n Api -> Web : answers\n Api -> Db : saves\n}\nviews {\n view landscape\n}\n';
  const { deflateRawSync } = await import('node:zlib');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/#/from/dsl?d=${deflateRawSync(Buffer.from(dsl, 'utf8')).toString('base64url')}`);
  await page.waitForSelector('[data-testid="v2-canvas"]', { timeout: 30_000 });
  await enterMap(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __V2__: { getMapMotion(): { running: boolean } } }).__V2__.getMapMotion().running)).toBe(false);
  const connectors = (await mapState(page)).connectors;
  expect(connectors).toHaveLength(2);
  const focusArrow = async (id: string): Promise<void> => {
    const lane = await page.evaluate((arrow: string) =>
      (window as unknown as { __V2__: { getConnectorScreenSamples(id: string): { x: number; y: number }[] | null } }).__V2__.getConnectorScreenSamples(arrow) ?? [], id);
    // Halfway along the first leg: the route bends, so the straight line between its ends is off it.
    const [a, b] = [lane[0]!, lane[1]!];
    const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
    await page.mouse.click(box.x + (a.x + b.x) / 2, box.y + (a.y + b.y) / 2);
    await expect.poll(async () => (await mapState(page)).focus?.connectorIds).toEqual([id]);
  };
  const [twoWay] = connectors.filter((c) => [c.from, c.to].sort().join() === 'api,web');
  const [oneWay] = connectors.filter((c) => [c.from, c.to].sort().join() === 'api,db');
  await focusArrow(twoWay!.id);
  expect((await mapState(page)).focus).toMatchObject({ twoWayIds: [twoWay!.id], animating: true });
  // The other arrow goes one way: its focus marches toward its target only.
  await focusArrow(oneWay!.id);
  expect((await mapState(page)).focus).toMatchObject({ twoWayIds: [], animating: true });
});
