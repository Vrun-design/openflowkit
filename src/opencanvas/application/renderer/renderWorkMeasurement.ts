export const OPEN_CANVAS_RENDER_WORK_MEASURE = 'openflowkit:opencanvas-render-work';

interface PerformanceMeasurePort {
  measure(name: string, options: { start: number; end: number }): unknown;
}

export function recordOpenCanvasRenderWork(
  timeline: PerformanceMeasurePort,
  startedAt: number,
  endedAt: number
): boolean {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
    return false;
  }
  try {
    timeline.measure(OPEN_CANVAS_RENDER_WORK_MEASURE, { start: startedAt, end: endedAt });
    return true;
  } catch {
    return false;
  }
}
