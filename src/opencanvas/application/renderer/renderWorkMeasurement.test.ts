import { describe, expect, it, vi } from 'vitest';
import {
  OPEN_CANVAS_RENDER_WORK_MEASURE,
  recordOpenCanvasRenderWork,
} from './renderWorkMeasurement';

describe('OpenCanvas renderer-work measurement', () => {
  it('records a named bounded User Timing measure', () => {
    const measure = vi.fn();
    expect(recordOpenCanvasRenderWork({ measure }, 10, 17.5)).toBe(true);
    expect(measure).toHaveBeenCalledWith(OPEN_CANVAS_RENDER_WORK_MEASURE, {
      start: 10,
      end: 17.5,
    });
  });

  it('never lets invalid or unavailable diagnostics break rendering', () => {
    expect(recordOpenCanvasRenderWork({ measure: vi.fn() }, 10, 9)).toBe(false);
    expect(recordOpenCanvasRenderWork({ measure: () => { throw new Error('disabled'); } }, 1, 2))
      .toBe(false);
  });
});
