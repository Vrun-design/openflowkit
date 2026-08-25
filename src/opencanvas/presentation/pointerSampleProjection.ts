import type { Point2d } from '../domain/geometry/types';
import { normalizeStrokeInput, type StrokeInput } from '../domain/nodes/strokeInput';

interface BrowserPointerSample {
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerType?: string;
  readonly pressure?: number;
  readonly tiltX?: number;
  readonly tiltY?: number;
  readonly twist?: number;
}

export interface BrowserPointerSampleEvent extends BrowserPointerSample {
  readonly getCoalescedEvents?: () => readonly BrowserPointerSample[];
  readonly getPredictedEvents?: () => readonly BrowserPointerSample[];
}

export interface PointerSampleProjection {
  readonly confirmed: readonly ProjectedPointerSample[];
  readonly predicted: readonly ProjectedPointerSample[];
}

export interface ProjectedPointerSample extends Point2d {
  readonly input?: StrokeInput;
}

const MAX_PREDICTED_SAMPLES = 8;

function projectSamples(
  samples: readonly BrowserPointerSample[],
  fallback: BrowserPointerSample,
  viewportOrigin: Point2d,
  screenToWorld: (point: Point2d) => Point2d
): readonly ProjectedPointerSample[] {
  const points: ProjectedPointerSample[] = [];
  for (const sample of samples) {
    if (!Number.isFinite(sample.clientX) || !Number.isFinite(sample.clientY)) continue;
    const point = screenToWorld({
      x: sample.clientX - viewportOrigin.x,
      y: sample.clientY - viewportOrigin.y,
    });
    const previous = points.at(-1);
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    const pointerType = sample.pointerType ?? fallback.pointerType;
    points.push(pointerType === 'pen'
      ? {
          ...point,
          input: normalizeStrokeInput({
            pressure: sample.pressure ?? fallback.pressure,
            tiltX: sample.tiltX ?? fallback.tiltX,
            tiltY: sample.tiltY ?? fallback.tiltY,
            twist: sample.twist ?? fallback.twist,
          }),
        }
      : point);
  }
  return points;
}

export function projectPointerSamples(
  event: BrowserPointerSampleEvent,
  viewportOrigin: Point2d,
  screenToWorld: (point: Point2d) => Point2d
): PointerSampleProjection {
  const coalesced = event.getCoalescedEvents?.() ?? [];
  const confirmedSamples = coalesced.length > 0 ? coalesced : [event];
  const predictedSamples = (event.getPredictedEvents?.() ?? []).slice(0, MAX_PREDICTED_SAMPLES);
  return {
    confirmed: projectSamples(confirmedSamples, event, viewportOrigin, screenToWorld),
    predicted: projectSamples(predictedSamples, event, viewportOrigin, screenToWorld),
  };
}
