import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  BROWSER_BENCHMARK_FIXTURES,
  BROWSER_BENCHMARK_SCHEMA_VERSION,
  PERFORMANCE_BUDGETS,
  type FixtureBenchmarkResult,
} from './contracts';
import { captureChromeTrace } from './chromeTrace';
import { loadBenchmarkFixture } from './fixture';
import {
  installBrowserMetrics,
  measureImportRun,
  measureStandardInteraction,
  openEmptyFlow,
  readBrowserEnvironment,
} from './pageHarness';

const RESULT_PATH = path.resolve(
  process.cwd(),
  'benchmarks',
  'browser',
  'results',
  'reactflow-baseline.latest.json'
);

function getGitValue(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function classifyMetric(
  value: number | null,
  target: number,
  failure: number
): 'pass' | 'warning' | 'fail' {
  if (value === null || value > failure) {
    return 'fail';
  }
  return value <= target ? 'pass' : 'warning';
}

function evaluateBudget(
  result: Omit<FixtureBenchmarkResult, 'budgetStatus'>
): FixtureBenchmarkResult['budgetStatus'] {
  const initialInteractive =
    result.fixture.name === 'large-1000'
      ? classifyMetric(
          result.warmImport.totalInteractiveMs,
          PERFORMANCE_BUDGETS.largeInitialInteractiveTargetMs,
          PERFORMANCE_BUDGETS.largeInitialInteractiveFailureMs
        )
      : 'not-applicable';

  return {
    initialInteractive,
    rendererWorkP95: 'not-measured',
    framePacingP95: classifyMetric(
      result.interaction.frameTimes.p95,
      PERFORMANCE_BUDGETS.framePacingP95TargetMs,
      PERFORMANCE_BUDGETS.framePacingP95FailureMs
    ),
    inputNextFrameP95: classifyMetric(
      result.interaction.inputNextFrame.p95,
      PERFORMANCE_BUDGETS.inputNextFrameP95Ms,
      PERFORMANCE_BUDGETS.inputNextFrameFailureMs
    ),
    longFrames: result.interaction.framesOver50Ms === 0 ? 'pass' : 'fail',
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('captures the React Flow browser baseline', async ({ page, browserName }, testInfo) => {
  test.setTimeout(300_000);

  const results: FixtureBenchmarkResult[] = [];
  let browserEnvironment: Awaited<ReturnType<typeof readBrowserEnvironment>> | null = null;

  for (const fixtureName of BROWSER_BENCHMARK_FIXTURES) {
    const fixture = loadBenchmarkFixture(fixtureName);
    await openEmptyFlow(page);
    await installBrowserMetrics(page);
    browserEnvironment ??= await readBrowserEnvironment(page);

    const coldImport = await measureImportRun(page, fixture);
    const warmImport = await measureImportRun(page, fixture);
    const tracePath = testInfo.outputPath(`${fixtureName}.devtools-trace.json`);
    const interaction = await measureStandardInteraction(page, (action) =>
      captureChromeTrace(page, tracePath, action)
    );
    await testInfo.attach(`${fixtureName}-devtools-trace`, {
      path: tracePath,
      contentType: 'application/json',
    });
    const resultWithoutBudget = {
      fixture: {
        name: fixtureName,
        sha256: fixture.sha256,
        nodes: fixture.data.nodes.length,
        edges: fixture.data.edges.length,
      },
      coldImport,
      warmImport,
      interaction,
    };

    results.push({
      ...resultWithoutBudget,
      budgetStatus: evaluateBudget(resultWithoutBudget),
    });
  }

  const payload = {
    schemaVersion: BROWSER_BENCHMARK_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    renderer: 'reactflow',
    appMode: 'production-preview',
    scenario: 'json-import-cold-and-warm-then-drag-and-wheel',
    git: {
      commit: getGitValue(['rev-parse', 'HEAD']),
      branch: getGitValue(['branch', '--show-current']),
      dirty: getGitValue(['status', '--porcelain']).length > 0,
    },
    runner: {
      browserName,
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      viewport: browserEnvironment?.viewport ?? null,
      devicePixelRatio: browserEnvironment?.devicePixelRatio ?? null,
      hardwareConcurrency: browserEnvironment?.hardwareConcurrency ?? null,
      deviceMemoryGb: browserEnvironment?.deviceMemoryGb ?? null,
      userAgent: browserEnvironment?.userAgent ?? null,
    },
    budgets: PERFORMANCE_BUDGETS,
    results,
    notes: [
      'Results are machine-specific and must be compared on the same runner.',
      'Input latency is pointer/wheel event timestamp to the next animation frame.',
      'Heap uses Chromium performance.memory with exposed GC and may still contain browser noise.',
      'Visible node count reflects React Flow viewport culling, not total document nodes.',
      'Budget status is informational until repeated-run variance is established.',
      'The 12ms renderer-work target is not inferred from rAF spacing; inspect the attached DevTools traces.',
    ],
  };

  fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  await testInfo.attach('reactflow-browser-baseline', {
    body: Buffer.from(JSON.stringify(payload, null, 2)),
    contentType: 'application/json',
  });

  expect(results).toHaveLength(BROWSER_BENCHMARK_FIXTURES.length);
  for (const result of results) {
    expect(result.coldImport.totalInteractiveMs).toBeGreaterThan(0);
    expect(result.warmImport.totalInteractiveMs).toBeGreaterThan(0);
    expect(result.interaction.frameTimes.count).toBeGreaterThan(0);
    expect(result.interaction.inputNextFrame.count).toBeGreaterThan(0);
  }
});
