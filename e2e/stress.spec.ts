import { existsSync } from 'node:fs';
import { expect, test } from './test';

type SceneNodeShape = { id: string; kind: string; content: Record<string, unknown> };
type V2Api = {
  getState(): { nodes: string[] };
  getDocument(): { pages: Array<{ nodes: SceneNodeShape[]; connectors: unknown[] }> } | null;
};

const EVERYTHING = 'stress/everything.json';

// Heavy import; run `npm run stress:generate` first. @local: CI has no file and no GPU.
test('everything stress sheet opens as one page without page errors @local', async ({ page }) => {
  test.skip(!existsSync(EVERYTHING), 'run `npm run stress:generate` first');
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');

  await page.locator('input[type=file][accept*="json"]').setInputFiles(EVERYTHING);
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0),
      { timeout: 20_000 }
    )
    .toBeGreaterThan(600);

  const document = await page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getDocument() ?? null);
  expect(document?.pages).toHaveLength(1);
  const nodes = document?.pages[0]?.nodes ?? [];

  const frameLabels = new Set(nodes.filter((node) => node.kind === 'frame').map((node) => String(node.content.label)));
  for (const label of ['Flowchart — release decision', 'Sequence — payment retries', 'ERD — shop schema', 'Wireframe — shop app']) {
    expect(frameLabels.has(label), `family frame ${label}`).toBe(true);
  }

  const charts = new Set(nodes.filter((node) => node.kind === 'chart').map((node) => String(node.content.chart)));
  for (const kind of ['bar', 'line', 'area', 'scatter', 'pie', 'donut', 'radar', 'heatmap', 'table', 'quadrant']) {
    expect(charts.has(kind), `chart ${kind}`).toBe(true);
  }

  const widgets = nodes.filter((node) => node.kind === 'widget');
  expect(new Set(widgets.map((node) => String(node.content.widget))).size).toBe(35);

  const canvas = page.locator('[data-testid="v2-canvas"]');
  await expect(canvas).toBeVisible();
});

const scaleFile = [5000, 2000, 500].map((size) => `stress/scale-${size}.json`).find((file) => existsSync(file));

// The capacity probe: the biggest generated scale doc must open without errors.
test('large scale document opens and renders @local', async ({ page }) => {
  test.skip(!scaleFile, 'run `npm run stress:generate` first');
  test.setTimeout(120_000);
  const size = Number(/scale-(\d+)\.json$/.exec(scaleFile ?? '')?.[1] ?? 0);
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.locator('input[type=file][accept*="json"]').setInputFiles(scaleFile ?? '');
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0),
      { timeout: 60_000 }
    )
    .toBeGreaterThan(size);
  const document = await page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getDocument() ?? null);
  expect(document?.pages[0]?.connectors).toHaveLength(size - 1);
});
