/**
 * Diagnostic: attribute OpenCanvas camera-frame cost to a phase.
 *
 * The paired hardware capture shows OpenCanvas at a 166 ms frame p95 on the
 * 1,000-node fixture while Pixi's own `app.render()` stays under 1 ms. This
 * reads the camera phase measures so the expensive phase is named rather than
 * guessed at. Diagnosis tool, not a gate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { BROWSER_BENCHMARK_FIXTURES } from './contracts';
import { loadBenchmarkFixture } from './fixture';
import {
  installBrowserMetrics,
  measureImportRun,
  openEmptyFlow,
  readBrowserMetrics,
  resetBrowserMetrics,
} from './pageHarness';
import { summarizeSamples } from './statistics';
import {
  OPEN_CANVAS_CAMERA_PHASE_MEASURES,
  OPEN_CANVAS_RENDER_WORK_MEASURE,
} from '../../src/opencanvas/application/renderer/renderWorkMeasurement';

const RESULT_PATH = path.resolve(
  process.cwd(),
  'benchmarks/browser/results/camera-phases.latest.json'
);

async function panAndMeasure(
  page: import('@playwright/test').Page,
  box: { x: number; y: number; width: number; height: number }
): Promise<{ frameP95Ms: number | null; framesOver50Ms: number }> {
  await resetBrowserMetrics(page);
  const startX = box.x + box.width * 0.72;
  const startY = box.y + box.height * 0.65;
  await page.mouse.move(startX, startY);
  await page.keyboard.down('Space');
  await page.mouse.down();
  await page.mouse.move(startX + 160, startY + 80, { steps: 30 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await page.mouse.wheel(0, -320);
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(300);
  const metrics = await readBrowserMetrics(page);
  return {
    frameP95Ms: summarizeSamples(metrics.frameTimesMs).p95 ?? null,
    framesOver50Ms: metrics.frameTimesMs.filter((sample) => sample > 50).length,
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('attributes OpenCanvas camera frame cost to a phase', async ({ page }) => {
  const report: Record<string, Record<string, number | null>> = {};
  const hotFunctions: Record<string, unknown[]> = {};

  for (const fixtureName of BROWSER_BENCHMARK_FIXTURES) {
    const fixture = loadBenchmarkFixture(fixtureName);
    await openEmptyFlow(page);
    await installBrowserMetrics(page);
    await measureImportRun(page, fixture);

    // The import must settle before navigating, or OpenCanvas opens a document
    // that is still being written and mounts an empty, zero-sized canvas.
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_500);

    const url = new URL(page.url());
    const separator = url.hash.includes('?') ? '&' : '?';
    await page.goto(`${url.origin}${url.pathname}${url.hash}${separator}renderer=opencanvas`);
    const viewport = page.getByTestId('opencanvas-document-viewport');
    await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 60_000 });
    await expect(viewport.locator('canvas')).toBeVisible({ timeout: 60_000 });

    const box = await viewport.boundingBox();
    if (!box) throw new Error('OpenCanvas viewport has no browser bounds.');

    const measureNames = [
      ...Object.values(OPEN_CANVAS_CAMERA_PHASE_MEASURES),
      OPEN_CANVAS_RENDER_WORK_MEASURE,
    ];
    await page.evaluate((names) => {
      for (const name of names) performance.clearMeasures(name);
    }, measureNames);

    // Cold: measure immediately after the reload, exactly as the hardware
    // capture does. Warm: measure again once hydration has settled.
    const cold = await panAndMeasure(page, box);
    await page.waitForTimeout(6_000);

    const session = await page.context().newCDPSession(page);
    await session.send('Profiler.enable');
    await session.send('Profiler.setSamplingInterval', { interval: 100 });
    await session.send('Profiler.start');
    const warm = await panAndMeasure(page, box);
    const { profile } = (await session.send('Profiler.stop')) as {
      profile: {
        nodes: {
          callFrame: { functionName: string; url: string; lineNumber: number };
          hitCount?: number;
        }[];
      };
    };
    const totalHits = profile.nodes.reduce((sum, node) => sum + (node.hitCount ?? 0), 0);
    hotFunctions[fixtureName] = [...profile.nodes]
      .filter((node) => (node.hitCount ?? 0) > 0)
      .sort((a, b) => (b.hitCount ?? 0) - (a.hitCount ?? 0))
      .slice(0, 25)
      .map((node) => ({
        fn: node.callFrame.functionName || '(anonymous)',
        url: node.callFrame.url.replace(/^https?:\/\/[^/]+/, ''),
        line: node.callFrame.lineNumber,
        selfPercent: Number((((node.hitCount ?? 0) / Math.max(1, totalHits)) * 100).toFixed(2)),
      }));

    const durations = await page.evaluate((names) => {
      const result: Record<string, number[]> = {};
      for (const name of names) {
        result[name] = performance.getEntriesByName(name).map((entry) => entry.duration);
      }
      return result;
    }, measureNames);

    const fixtureReport: Record<string, number | null> = {};
    for (const [name, samples] of Object.entries(durations)) {
      const summary = summarizeSamples(samples);
      fixtureReport[`${name}::p95`] = summary.p95 ?? null;
      fixtureReport[`${name}::count`] = samples.length;
      fixtureReport[`${name}::total`] = samples.reduce((sum, value) => sum + value, 0);
    }
    fixtureReport['cold::frameP95'] = cold.frameP95Ms;
    fixtureReport['cold::framesOver50'] = cold.framesOver50Ms;
    fixtureReport['warm::frameP95'] = warm.frameP95Ms;
    fixtureReport['warm::framesOver50'] = warm.framesOver50Ms;
    report[fixtureName] = fixtureReport;
  }

  fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
  fs.writeFileSync(
    RESULT_PATH,
    `${JSON.stringify({ capturedAt: new Date().toISOString(), report, hotFunctions }, null, 2)}\n`
  );
});
