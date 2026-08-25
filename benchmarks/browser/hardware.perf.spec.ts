import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { BROWSER_BENCHMARK_FIXTURES } from './contracts';
import { loadBenchmarkFixture } from './fixture';
import {
  evaluateHardwareGate,
  HARDWARE_GATE_SCHEMA_VERSION,
  MIN_HARDWARE_RUNS,
  type HardwareFixtureRun,
  type HardwareRendererCapture,
  type HardwareRunnerIdentity,
} from './hardwareGate';
import {
  installBrowserMetrics,
  measureImportRun,
  openEmptyFlow,
  readBrowserEnvironment,
  readBrowserMetrics,
  resetBrowserMetrics,
} from './pageHarness';
import { summarizeSamples } from './statistics';
import { OPEN_CANVAS_RENDER_WORK_MEASURE } from '../../src/opencanvas/application/renderer/renderWorkMeasurement';

const RESULT_PATH = path.resolve(
  process.cwd(),
  'benchmarks/browser/results/hardware-pair.latest.json'
);

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

async function readWebGlIdentity(page: Page): Promise<HardwareRunnerIdentity['webGl']> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const debug = context?.getExtension('WEBGL_debug_renderer_info');
    return {
      vendor: debug ? String(context?.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : '',
      renderer: debug ? String(context?.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '',
    };
  });
}

async function measureCameraInteraction(
  page: Page,
  viewport: Locator,
  captureRendererWork: boolean
): Promise<HardwareFixtureRun['interaction']> {
  const bounds = await viewport.boundingBox();
  if (!bounds) throw new Error('Benchmark viewport has no browser bounds.');
  await resetBrowserMetrics(page);
  await page.evaluate((measureName) => performance.clearMeasures(measureName),
    OPEN_CANVAS_RENDER_WORK_MEASURE);
  const startX = bounds.x + bounds.width * 0.72;
  const startY = bounds.y + bounds.height * 0.65;
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
  const rendererWorkSamples = captureRendererWork
    ? await page.evaluate((measureName) => performance.getEntriesByName(measureName)
        .map((entry) => entry.duration), OPEN_CANVAS_RENDER_WORK_MEASURE)
    : [];
  return {
    frameP95Ms: summarizeSamples(metrics.frameTimesMs).p95 ?? Number.NaN,
    inputNextFrameP95Ms: summarizeSamples(metrics.inputNextFrameLatenciesMs).p95 ?? Number.NaN,
    framesOver50Ms: metrics.frameTimesMs.filter((sample) => sample > 50).length,
    rendererWorkP95Ms: captureRendererWork
      ? summarizeSamples(rendererWorkSamples).p95 ?? Number.NaN
      : null,
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('captures paired React Flow and OpenCanvas evidence on production GPU hardware', async ({ page, browserName }) => {
  const commit = git(['rev-parse', 'HEAD']);
  const dirty = git(['status', '--porcelain']).length > 0;
  expect(dirty, 'Hardware evidence requires a clean committed worktree.').toBe(false);

  const reactFlowRuns: HardwareFixtureRun[] = [];
  const openCanvasRuns: HardwareFixtureRun[] = [];
  let runner: HardwareRunnerIdentity | null = null;

  for (const fixtureName of BROWSER_BENCHMARK_FIXTURES) {
    const fixture = loadBenchmarkFixture(fixtureName);
    await openEmptyFlow(page);
    await installBrowserMetrics(page);
    await measureImportRun(page, fixture);

    if (!runner) {
      const environment = await readBrowserEnvironment(page);
      runner = {
        browserName,
        browserVersion: page.context().browser()?.version() ?? '',
        platform: process.platform,
        architecture: process.arch,
        viewport: environment.viewport,
        devicePixelRatio: environment.devicePixelRatio,
        hardwareConcurrency: environment.hardwareConcurrency,
        webGl: await readWebGlIdentity(page),
      };
    }

    const fixtureIdentity = {
      name: fixture.name,
      sha256: fixture.sha256,
      nodes: fixture.data.nodes.length,
      edges: fixture.data.edges.length,
    };
    const reactFlowViewport = page.locator('.react-flow');
    for (let run = 0; run < MIN_HARDWARE_RUNS; run += 1) {
      reactFlowRuns.push({
        fixture: fixtureIdentity,
        interaction: await measureCameraInteraction(page, reactFlowViewport, false),
      });
    }

    const url = new URL(page.url());
    const separator = url.hash.includes('?') ? '&' : '?';
    await page.goto(`${url.origin}${url.pathname}${url.hash}${separator}renderer=opencanvas`);
    const openCanvasViewport = page.getByTestId('opencanvas-document-viewport');
    // The canary reports ready before it attaches its canvas, and a large
    // workspace is still rehydrating at that point. Waiting on the status
    // first keeps the capture from racing an unmounted renderer.
    await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 60_000 });
    await expect(openCanvasViewport.locator('canvas')).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2_000);
    await installBrowserMetrics(page);
    for (let run = 0; run < MIN_HARDWARE_RUNS; run += 1) {
      openCanvasRuns.push({
        fixture: fixtureIdentity,
        interaction: await measureCameraInteraction(page, openCanvasViewport, true),
      });
    }
  }

  if (!runner) throw new Error('Runner identity was not captured.');
  const shared = { schemaVersion: HARDWARE_GATE_SCHEMA_VERSION, git: { commit, dirty }, runner };
  const reactFlow: HardwareRendererCapture = { ...shared, renderer: 'reactflow', runs: reactFlowRuns };
  const openCanvas: HardwareRendererCapture = { ...shared, renderer: 'opencanvas-pixi', runs: openCanvasRuns };
  const gate = evaluateHardwareGate(reactFlow, openCanvas);

  // Evidence is written before the gate assertion: a failing capture is the
  // run whose numbers are most worth keeping, and a run this expensive should
  // never have to be repeated just to find out by how much it missed.
  const payload = { capturedAt: new Date().toISOString(), gate, reactFlow, openCanvas };
  fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  expect(gate.errors, gate.errors.join('\n')).toEqual([]);
});
