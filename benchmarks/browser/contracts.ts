export const BROWSER_BENCHMARK_SCHEMA_VERSION = 1;

export const BROWSER_BENCHMARK_FIXTURES = ['small-100', 'medium-300', 'large-1000'] as const;

export type BrowserBenchmarkFixtureName = (typeof BROWSER_BENCHMARK_FIXTURES)[number];

export const PERFORMANCE_BUDGETS = {
  rendererWorkP95TargetMs: 12,
  framePacingP95TargetMs: 20,
  framePacingP95FailureMs: 33.4,
  inputNextFrameP95Ms: 50,
  inputNextFrameFailureMs: 100,
  longFrameMs: 50,
  largeInitialInteractiveTargetMs: 1_000,
  largeInitialInteractiveFailureMs: 2_000,
} as const;

export interface BenchmarkFixture {
  id: string;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    generatedAt: string;
    description: string;
  };
  nodes: unknown[];
  edges: unknown[];
}

export interface SampleSummary {
  count: number;
  median: number | null;
  p95: number | null;
  worst: number | null;
}

export interface BrowserMetricSamples {
  frameTimesMs: number[];
  inputNextFrameLatenciesMs: number[];
  longAnimationFramesMs: number[];
  longTasksMs: number[];
}

export interface ImportRunResult {
  totalInteractiveMs: number;
  appReportedImportMs: number;
  frameTimes: SampleSummary;
  framesOver16_7Ms: number;
  framesOver50Ms: number;
  longAnimationFrames: SampleSummary;
  longTasks: SampleSummary;
  heapBeforeMb: number | null;
  heapAfterMb: number | null;
  heapDeltaMb: number | null;
  visibleNodeCount: number;
  samples: BrowserMetricSamples;
}

export interface InteractionRunResult {
  durationMs: number;
  frameTimes: SampleSummary;
  inputNextFrame: SampleSummary;
  framesOver16_7Ms: number;
  framesOver50Ms: number;
  longAnimationFrames: SampleSummary;
  longTasks: SampleSummary;
  heapBeforeMb: number | null;
  heapAfterMb: number | null;
  heapDeltaMb: number | null;
  samples: BrowserMetricSamples;
}

export interface FixtureBenchmarkResult {
  fixture: {
    name: BrowserBenchmarkFixtureName;
    sha256: string;
    nodes: number;
    edges: number;
  };
  coldImport: ImportRunResult;
  warmImport: ImportRunResult;
  interaction: InteractionRunResult;
  budgetStatus: {
    initialInteractive: 'pass' | 'warning' | 'fail' | 'not-applicable';
    rendererWorkP95: 'not-measured';
    framePacingP95: 'pass' | 'warning' | 'fail';
    inputNextFrameP95: 'pass' | 'warning' | 'fail';
    longFrames: 'pass' | 'fail';
  };
}
