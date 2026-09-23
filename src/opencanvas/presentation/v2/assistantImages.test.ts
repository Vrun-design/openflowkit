import { describe, expect, it } from 'vitest';
import { fitWithin } from './assistantImages';

describe('assistant images', () => {
  it('caps the long edge, keeps the aspect, never upscales', () => {
    expect(fitWithin(3136, 1000)).toEqual({ width: 1568, height: 500 });
    expect(fitWithin(1000, 4704)).toEqual({ width: 333, height: 1568 });
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(0, 0)).toEqual({ width: 1, height: 1 });
  });
});
