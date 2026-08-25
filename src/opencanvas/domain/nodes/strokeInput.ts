import type { JsonObject } from '../document/json';

export interface StrokeInput extends JsonObject {
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly twist: number;
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeStrokeInput(input: Partial<StrokeInput>): StrokeInput {
  return {
    pressure: clamp(finiteOr(input.pressure, 0.5), 0, 1),
    tiltX: clamp(finiteOr(input.tiltX, 0), -90, 90),
    tiltY: clamp(finiteOr(input.tiltY, 0), -90, 90),
    twist: ((finiteOr(input.twist, 0) % 360) + 360) % 360,
  };
}

export function pressureTiltStrokeWidth(baseWidth: number, input: StrokeInput): number {
  const pressureScale = 0.35 + input.pressure * 1.3;
  const tiltMagnitude = Math.min(90, Math.hypot(input.tiltX, input.tiltY));
  const tiltScale = 1 + (tiltMagnitude / 90) * 0.25;
  return baseWidth * pressureScale * tiltScale;
}

export function pressureTiltSegmentWidth(
  baseWidth: number,
  start: StrokeInput | undefined,
  end: StrokeInput | undefined
): number {
  const startWidth = start ? pressureTiltStrokeWidth(baseWidth, start) : baseWidth;
  const endWidth = end ? pressureTiltStrokeWidth(baseWidth, end) : baseWidth;
  return (startWidth + endWidth) / 2;
}
