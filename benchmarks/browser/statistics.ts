import type { SampleSummary } from './contracts';

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}

function percentile(sortedSamples: number[], percentileValue: number): number {
  const index = Math.max(0, Math.ceil(sortedSamples.length * percentileValue) - 1);
  return sortedSamples[index];
}

export function summarizeSamples(samples: number[]): SampleSummary {
  if (samples.length === 0) {
    return { count: 0, median: null, p95: null, worst: null };
  }

  const sortedSamples = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sortedSamples.length / 2);
  const median =
    sortedSamples.length % 2 === 0
      ? (sortedSamples[middle - 1] + sortedSamples[middle]) / 2
      : sortedSamples[middle];

  return {
    count: sortedSamples.length,
    median: roundMetric(median),
    p95: roundMetric(percentile(sortedSamples, 0.95)),
    worst: roundMetric(sortedSamples[sortedSamples.length - 1]),
  };
}

export function subtractNullable(
  endValue: number | null,
  startValue: number | null
): number | null {
  if (endValue === null || startValue === null) {
    return null;
  }
  return roundMetric(endValue - startValue);
}
