import { expect, type Page } from '@playwright/test';
import type { BrowserMetricSamples, ImportRunResult, InteractionRunResult } from './contracts';
import type { LoadedBenchmarkFixture } from './fixture';
import { subtractNullable, summarizeSamples } from './statistics';

const IMPORT_REPORT_STORAGE_KEY = 'openflowkit-import-report-latest';
const METRICS_STATE_KEY = '__OPENFLOWKIT_BROWSER_BENCHMARK__';

interface ImportReport {
  status: 'success' | 'success_with_warnings' | 'failed';
  nodeCount: number;
  edgeCount: number;
  elapsedMs: number;
}

interface BrowserMetricState extends BrowserMetricSamples {
  enabled: boolean;
  lastFrameAt: number | null;
  rafId: number;
}

interface BrowserPerformanceMemory {
  usedJSHeapSize: number;
}

interface BrowserEnvironment {
  userAgent: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
}

export type InteractionCapture = <T>(action: () => Promise<T>) => Promise<T>;

async function runWithoutCapture<T>(action: () => Promise<T>): Promise<T> {
  return action();
}

function countOver(samples: number[], threshold: number): number {
  return samples.filter((sample) => sample > threshold).length;
}

async function waitForPaint(page: Page, frameCount = 2): Promise<void> {
  await page.evaluate(async (count) => {
    for (let frame = 0; frame < count; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, frameCount);
}

export async function openEmptyFlow(page: Page): Promise<void> {
  await page.goto('/#/home');
  const createButton = page.getByTestId('home-create-new-header');
  await expect(createButton).toBeVisible({ timeout: 20_000 });
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+(?:\?.*)?$/);
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 20_000 });
  await waitForPaint(page, 3);
}

export async function installBrowserMetrics(page: Page): Promise<void> {
  await page.evaluate((stateKey) => {
    const benchmarkWindow = window as typeof window & Record<string, unknown>;
    if (benchmarkWindow[stateKey]) {
      return;
    }

    const state: BrowserMetricState = {
      enabled: false,
      frameTimesMs: [],
      inputNextFrameLatenciesMs: [],
      longAnimationFramesMs: [],
      longTasksMs: [],
      lastFrameAt: null,
      rafId: 0,
    };
    benchmarkWindow[stateKey] = state;

    function sampleFrame(now: number): void {
      if (state.enabled) {
        if (state.lastFrameAt !== null) {
          state.frameTimesMs.push(now - state.lastFrameAt);
        }
        state.lastFrameAt = now;
      }
      state.rafId = requestAnimationFrame(sampleFrame);
    }
    state.rafId = requestAnimationFrame(sampleFrame);

    function recordInputToNextFrame(event: Event): void {
      if (!state.enabled) {
        return;
      }
      const eventTimestamp = event.timeStamp;
      requestAnimationFrame(() => {
        state.inputNextFrameLatenciesMs.push(Math.max(0, performance.now() - eventTimestamp));
      });
    }
    window.addEventListener('pointermove', recordInputToNextFrame, {
      capture: true,
      passive: true,
    });
    window.addEventListener('wheel', recordInputToNextFrame, { capture: true, passive: true });

    const supportedEntryTypes = PerformanceObserver.supportedEntryTypes ?? [];
    if (supportedEntryTypes.includes('long-animation-frame')) {
      const observer = new PerformanceObserver((list) => {
        if (!state.enabled) {
          return;
        }
        state.longAnimationFramesMs.push(...list.getEntries().map((entry) => entry.duration));
      });
      observer.observe({ type: 'long-animation-frame', buffered: false });
    }
    if (supportedEntryTypes.includes('longtask')) {
      const observer = new PerformanceObserver((list) => {
        if (!state.enabled) {
          return;
        }
        state.longTasksMs.push(...list.getEntries().map((entry) => entry.duration));
      });
      observer.observe({ type: 'longtask', buffered: false });
    }
  }, METRICS_STATE_KEY);
}

export async function resetBrowserMetrics(page: Page): Promise<void> {
  await page.evaluate((stateKey) => {
    const state = (window as typeof window & Record<string, unknown>)[
      stateKey
    ] as BrowserMetricState;
    state.frameTimesMs = [];
    state.inputNextFrameLatenciesMs = [];
    state.longAnimationFramesMs = [];
    state.longTasksMs = [];
    state.lastFrameAt = null;
    state.enabled = true;
  }, METRICS_STATE_KEY);
}

export async function readBrowserMetrics(page: Page): Promise<BrowserMetricSamples> {
  return page.evaluate((stateKey) => {
    const state = (window as typeof window & Record<string, unknown>)[
      stateKey
    ] as BrowserMetricState;
    state.enabled = false;
    return {
      frameTimesMs: [...state.frameTimesMs],
      inputNextFrameLatenciesMs: [...state.inputNextFrameLatenciesMs],
      longAnimationFramesMs: [...state.longAnimationFramesMs],
      longTasksMs: [...state.longTasksMs],
    };
  }, METRICS_STATE_KEY);
}

export async function readHeapMb(page: Page): Promise<number | null> {
  return page.evaluate(async () => {
    const browserWindow = window as typeof window & { gc?: () => void };
    browserWindow.gc?.();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    browserWindow.gc?.();

    const browserPerformance = performance as Performance & {
      memory?: BrowserPerformanceMemory;
    };
    return browserPerformance.memory
      ? Number((browserPerformance.memory.usedJSHeapSize / 1024 / 1024).toFixed(3))
      : null;
  });
}

async function waitForImportReport(
  page: Page,
  fixture: LoadedBenchmarkFixture
): Promise<ImportReport> {
  await page.waitForFunction(
    ({ storageKey, nodes, edges }) => {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) {
        return false;
      }
      const report = JSON.parse(serialized) as ImportReport;
      return report.nodeCount === nodes && report.edgeCount === edges && report.status !== 'failed';
    },
    {
      storageKey: IMPORT_REPORT_STORAGE_KEY,
      nodes: fixture.data.nodes.length,
      edges: fixture.data.edges.length,
    },
    { timeout: 90_000 }
  );

  return page.evaluate((storageKey) => {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as ImportReport;
  }, IMPORT_REPORT_STORAGE_KEY);
}

export async function measureImportRun(
  page: Page,
  fixture: LoadedBenchmarkFixture
): Promise<ImportRunResult> {
  await page.evaluate(
    (storageKey) => localStorage.removeItem(storageKey),
    IMPORT_REPORT_STORAGE_KEY
  );
  const heapBeforeMb = await readHeapMb(page);
  await resetBrowserMetrics(page);
  const startedAt = await page.evaluate(() => performance.now());

  await page.locator('#json-import-input').setInputFiles(fixture.path);
  const importReport = await waitForImportReport(page, fixture);
  await waitForPaint(page);

  const endedAt = await page.evaluate(() => performance.now());
  const metrics = await readBrowserMetrics(page);
  const heapAfterMb = await readHeapMb(page);
  const visibleNodeCount = await page.locator('.react-flow__node').count();

  return {
    totalInteractiveMs: Number((endedAt - startedAt).toFixed(3)),
    appReportedImportMs: importReport.elapsedMs,
    frameTimes: summarizeSamples(metrics.frameTimesMs),
    framesOver16_7Ms: countOver(metrics.frameTimesMs, 16.7),
    framesOver50Ms: countOver(metrics.frameTimesMs, 50),
    longAnimationFrames: summarizeSamples(metrics.longAnimationFramesMs),
    longTasks: summarizeSamples(metrics.longTasksMs),
    heapBeforeMb,
    heapAfterMb,
    heapDeltaMb: subtractNullable(heapAfterMb, heapBeforeMb),
    visibleNodeCount,
    samples: metrics,
  };
}

export async function measureStandardInteraction(
  page: Page,
  capture: InteractionCapture = runWithoutCapture
): Promise<InteractionRunResult> {
  const node = page.locator('.react-flow__node').first();
  await expect(node).toBeVisible({ timeout: 30_000 });
  const box = await node.boundingBox();
  if (!box) {
    throw new Error('No visible benchmark node was available for drag measurement.');
  }

  const heapBeforeMb = await readHeapMb(page);
  const { startedAt, endedAt, metrics } = await capture(async () => {
    await resetBrowserMetrics(page);
    const startedAt = await page.evaluate(() => performance.now());
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 180, startY + 90, { steps: 30 });
    await page.mouse.up();
    await page.mouse.move(startX + 240, startY + 160);
    await page.mouse.wheel(0, -320);
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(250);
    const endedAt = await page.evaluate(() => performance.now());
    const metrics = await readBrowserMetrics(page);
    return { startedAt, endedAt, metrics };
  });
  const heapAfterMb = await readHeapMb(page);

  return {
    durationMs: Number((endedAt - startedAt).toFixed(3)),
    frameTimes: summarizeSamples(metrics.frameTimesMs),
    inputNextFrame: summarizeSamples(metrics.inputNextFrameLatenciesMs),
    framesOver16_7Ms: countOver(metrics.frameTimesMs, 16.7),
    framesOver50Ms: countOver(metrics.frameTimesMs, 50),
    longAnimationFrames: summarizeSamples(metrics.longAnimationFramesMs),
    longTasks: summarizeSamples(metrics.longTasksMs),
    heapBeforeMb,
    heapAfterMb,
    heapDeltaMb: subtractNullable(heapAfterMb, heapBeforeMb),
    samples: metrics,
  };
}

export async function readBrowserEnvironment(page: Page): Promise<BrowserEnvironment> {
  return page.evaluate(() => {
    const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
    return {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
    };
  });
}
