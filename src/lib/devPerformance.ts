type PerfBucket = {
  totalMs: number;
  count: number;
  maxMs: number;
};

const REPORT_INTERVAL_MS = 2000;
const buckets = new Map<string, PerfBucket>();
let reportTimer: number | null = null;

declare global {
  interface Window {
    __FLOWMIND_PERF__?: boolean;
  }
}

function isPerfDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  return window.__FLOWMIND_PERF__ === true;
}

function scheduleReport(): void {
  if (reportTimer || !isPerfDebugEnabled()) return;

  reportTimer = window.setTimeout(() => {
    reportTimer = null;
    if (!isPerfDebugEnabled() || buckets.size === 0) {
      buckets.clear();
      return;
    }

    const summary = Array.from(buckets.entries())
      .map(([name, bucket]) => ({
        name,
        count: bucket.count,
        totalMs: Math.round(bucket.totalMs * 100) / 100,
        avgMs: Math.round((bucket.totalMs / bucket.count) * 100) / 100,
        maxMs: Math.round(bucket.maxMs * 100) / 100,
      }))
      .sort((left, right) => right.totalMs - left.totalMs);

    console.table(summary);
    buckets.clear();
  }, REPORT_INTERVAL_MS);
}

export function measureDevPerformance<T>(name: string, fn: () => T): T {
  if (!isPerfDebugEnabled()) {
    return fn();
  }

  const start = performance.now();
  try {
    return fn();
  } finally {
    const elapsedMs = performance.now() - start;
    const bucket = buckets.get(name) ?? { totalMs: 0, count: 0, maxMs: 0 };
    bucket.totalMs += elapsedMs;
    bucket.count += 1;
    bucket.maxMs = Math.max(bucket.maxMs, elapsedMs);
    buckets.set(name, bucket);
    scheduleReport();
  }
}
