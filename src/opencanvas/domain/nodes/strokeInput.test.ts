import { describe, expect, it } from 'vitest';
import {
  normalizeStrokeInput,
  pressureTiltSegmentWidth,
  pressureTiltStrokeWidth,
} from './strokeInput';

describe('stroke input', () => {
  it('normalizes hostile pointer values into canonical bounds', () => {
    expect(normalizeStrokeInput({ pressure: 2, tiltX: -120, tiltY: 100, twist: -10 }))
      .toEqual({ pressure: 1, tiltX: -90, tiltY: 90, twist: 350 });
    expect(normalizeStrokeInput({ pressure: Number.NaN })).toEqual({
      pressure: 0.5, tiltX: 0, tiltY: 0, twist: 0,
    });
  });

  it('scales width monotonically with pressure and bounded tilt', () => {
    const light = pressureTiltStrokeWidth(4, normalizeStrokeInput({ pressure: 0.1 }));
    const firm = pressureTiltStrokeWidth(4, normalizeStrokeInput({ pressure: 0.9 }));
    const tilted = pressureTiltStrokeWidth(4, normalizeStrokeInput({
      pressure: 0.9, tiltX: 90,
    }));
    expect(firm).toBeGreaterThan(light);
    expect(tilted).toBeGreaterThan(firm);
    expect(tilted).toBeLessThanOrEqual(4 * 1.65 * 1.25);
    expect(pressureTiltSegmentWidth(
      4,
      normalizeStrokeInput({ pressure: 0.1 }),
      normalizeStrokeInput({ pressure: 0.9 })
    )).toBeCloseTo((light + firm) / 2);
  });
});
