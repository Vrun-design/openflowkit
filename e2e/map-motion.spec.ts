import { expect, test, type Page } from './test';
import { centreOf, doc, rect, state } from './helpers';

// Map mode's open/close move on the Pixi canvas: boxes grow and slide for 480 ms, arrows come back after.
// npx playwright test e2e/map-motion.spec.ts

interface Motion {
  running: boolean;
  frames: number;
  workMs: { p50: number; p95: number; max: number };
  rafMs: { p50: number; p95: number };
  reactRendersDuringMotion: number;
  active: boolean;
  arrowAlpha: number;
  renderMs: { p50: number; p95: number };
}
const motion = (page: Page): Promise<Motion> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapMotion(): Motion } }).__V2__.getMapMotion());
const mapNodes = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { nodes: string[] } } }).__V2__.getMapState().nodes);
const camera = (page: Page) => page.evaluate(() => (window as unknown as { __V2__: { getRenderDiagnostics(): unknown } }).__V2__.getRenderDiagnostics());

// Past the editor's double-click guard (400 ms after a click that opened or closed a box).
const PAST_DOUBLE_CLICK_MS = 420;

async function openModel(page: Page, create: () => Promise<void>): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await create();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await mapNodes(page)).length).toBeGreaterThan(0);
}

async function openStarter(page: Page): Promise<void> {
  await openModel(page, async () => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="v2-canvas"]');
    await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
    await page.getByRole('button', { name: 'Create C4 workspace', exact: true }).click();
    await expect.poll(async () => (await doc(page))?.pages.length).toBe(3);
    await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  });
}

const idle = async (page: Page): Promise<void> => {
  await expect.poll(async () => { const m = await motion(page); return !m.running && !m.active && m.arrowAlpha === 1; }, { timeout: 15_000 }).toBe(true);
};

async function click(page: Page, id: string): Promise<void> {
  const at = await centreOf(page, id);
  await page.mouse.click(at.x, at.y);
}

test('opening a box moves in place, hides the arrows meanwhile and shows them after, without rendering the page per frame @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openStarter(page);
  await idle(page);
  // Entering Map lands like a fresh map: no move.
  expect((await motion(page)).frames).toBe(0);
  expect((await page.evaluate(() => (window as unknown as { __V2__: { getMapState(): { connectors: unknown[] } } }).__V2__.getMapState().connectors.length))).toBeGreaterThan(0);

  await click(page, 'shop.api');
  await expect.poll(async () => (await motion(page)).running || (await motion(page)).frames > 0).toBe(true);
  await expect.poll(async () => (await mapNodes(page))).toContain('shop.api.orders');
  await idle(page);
  const after = await motion(page);
  // Headless SwiftShader is slow: it draws what it can in the 480 ms, never fewer than two frames.
  expect(after.frames).toBeGreaterThan(1);
  expect(after.reactRendersDuringMotion).toBeLessThanOrEqual(2);
  console.log(`open: ${JSON.stringify(after)}`);
  expect((await rect(page, 'shop.api.orders'))!.width).toBeGreaterThan(20);
});

test('arrows are hidden during the move and fade in after it @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openStarter(page);
  await idle(page);
  await click(page, 'shop.api');
  // The move starts with the arrows off; the first sample inside it sees them hidden.
  await expect.poll(async () => { const m = await motion(page); return m.running ? m.arrowAlpha : null; }, { timeout: 10_000, intervals: [16] }).toBe(0);
  await idle(page);
  expect((await motion(page)).arrowAlpha).toBe(1);
});

test('a click during the move lands on the target layout, and a second flip re-targets the move @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openStarter(page);
  await idle(page);
  await click(page, 'shop.api');
  await expect.poll(async () => (await motion(page)).running, { intervals: [16] }).toBe(true);
  // Mid-move the boxes are still travelling; Web is where the target layout has it, and a click there selects it.
  const clickedWhileRunning = (await motion(page)).running;
  await click(page, 'shop.web');
  expect(clickedWhileRunning).toBe(true);
  await expect.poll(async () => (await state(page)).selectedNodes).toEqual(['shop.web']);
  // Escape closes the box around it: a new move starting from where the boxes are drawn, fired while the first still runs.
  const retargetedWhileRunning = (await motion(page)).running;
  await page.keyboard.press('Escape');
  expect(retargetedWhileRunning).toBe(true);
  await expect.poll(async () => (await mapNodes(page))).not.toContain('shop.web');
  await idle(page);
  expect((await mapNodes(page)).sort()).toEqual(['customer', 'payments', 'shop']);
});

test('two flips in quick succession end in the right state, open then closed @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await openStarter(page);
  await idle(page);
  const before = [...(await mapNodes(page))].sort();
  await click(page, 'shop.api');
  await expect.poll(async () => (await mapNodes(page))).toContain('shop.api.orders');
  await page.waitForTimeout(PAST_DOUBLE_CLICK_MS);
  // The open box's header strip closes it again while the first move may still be running.
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const api = (await rect(page, 'shop.api'))!;
  await page.mouse.click(box.x + api.x + 12, box.y + api.y + 8);
  await expect.poll(async () => (await mapNodes(page))).not.toContain('shop.api.orders');
  await idle(page);
  expect([...(await mapNodes(page))].sort()).toEqual(before);
  expect((await camera(page))).toBeTruthy();
});

test('reduced motion lands the end state at once with the arrows visible and no frames between @gate', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openStarter(page);
  await idle(page);
  await click(page, 'shop.api');
  await expect.poll(async () => (await mapNodes(page))).toContain('shop.api.orders');
  const m = await motion(page);
  expect(m.frames).toBe(0);
  expect(m.running).toBe(false);
  expect(m.arrowAlpha).toBe(1);
  await page.waitForTimeout(200);
  expect((await motion(page)).frames).toBe(0);
});

// A generated C4 model: 3 systems x 14 services x 3 components = 171 boxes with everything open.
const SYSTEMS = 3;
const SERVICES = 14;
function bigModel(): string {
  const systems = Array.from({ length: SYSTEMS }, (_, s) => {
    const services = Array.from({ length: SERVICES }, (_, c) => {
      const parts = Array.from({ length: 3 }, (_, p) => `    component P${s}x${c}x${p}`).join('\n');
      return `   container C${s}x${c} [tech: Go] {\n${parts}\n   }`;
    }).join('\n');
    return `  system S${s} {\n${services}\n  }`;
  }).join('\n');
  const relations = Array.from({ length: SYSTEMS - 1 }, (_, s) => ` S${s}.C${s}x0 -> S${s + 1}.C${s + 1}x1 : calls`).join('\n');
  return `%% ofk 1\narchitecture\ntitle: Big\nmodel {\n${systems}\n${relations}\n}\nviews {\n view landscape\n}\n`;
}

test('opening a box among ~170 never drops a frame, drawing and rendering @local', async ({ page }) => {
  test.setTimeout(120_000);
  const { deflateRawSync } = await import('node:zlib');
  await openModel(page, async () => {
    await page.goto(`/#/from/dsl?d=${deflateRawSync(Buffer.from(bigModel(), 'utf8')).toString('base64url')}`);
    await page.waitForSelector('[data-testid="v2-canvas"]', { timeout: 30_000 });
  });
  await idle(page);
  const systems = Array.from({ length: SYSTEMS }, (_, s) => `s${s}`);
  const services = systems.flatMap((s) => Array.from({ length: SERVICES }, (_, c) => `${s}.c${s.slice(1)}x${c}`));
  const last = services.at(-1)!;
  const openBoxes = (ids: string[], focus?: string) => page.evaluate(([list, at]) => (window as unknown as { __V2__: { openMapBoxes(ids: string[], focus?: string): void } }).__V2__.openMapBoxes(list as string[], at as string | undefined), [ids, focus]);
  await openBoxes([...systems, ...services.slice(0, -1)]);
  await expect.poll(async () => (await mapNodes(page)).length, { timeout: 30_000 }).toBeGreaterThan(150);
  await idle(page);
  const boxes = (await mapNodes(page)).length;
  await openBoxes([...systems, ...services], last);
  await expect.poll(async () => (await mapNodes(page))).toContain(`${last}.p${last.slice(1, 2)}x${last.split('x')[1]}x0`);
  await idle(page);
  const m = await motion(page);
  const fps = m.frames / 0.48;
  console.log(`perf: ${boxes} boxes, ${m.frames} frames (${fps.toFixed(0)} fps), draw+render p50 ${m.workMs.p50.toFixed(2)} p95 ${m.workMs.p95.toFixed(2)} max ${m.workMs.max.toFixed(2)} ms (render alone p50 ${m.renderMs.p50.toFixed(2)} p95 ${m.renderMs.p95.toFixed(2)}), raf p50 ${m.rafMs.p50.toFixed(1)} p95 ${m.rafMs.p95.toFixed(1)} ms, react renders ${m.reactRendersDuringMotion}`);
  // ponytail: whole-frame redraw of every moving box (path A) — move translate-only boxes as cached containers if 300 boxes drop frames.
  expect(m.workMs.p95).toBeLessThanOrEqual(16);
  expect(m.reactRendersDuringMotion).toBeLessThanOrEqual(2);
});
