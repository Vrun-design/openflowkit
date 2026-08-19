import { describe, expect, it } from 'vitest';
import { customSvgPathOutline, validateCustomSvgPath } from './customSvgPath';

describe('custom SVG path geometry', () => {
  it('parses absolute and relative polygon commands and normalizes geometry', () => {
    expect(customSvgPathOutline('M 10 10 h 80 v 40 l -40 30 L 10 50 z', { width: 200, height: 100 }))
      .toEqual([
        { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 57.14285714285714 },
        { x: 100, y: 100 }, { x: 0, y: 57.14285714285714 },
      ]);
  });

  it.each(['', 'M0 0 L1 1', 'M0 0 C1 2 3 4 5 6 Z', 'M0 0 LNaN 1 L2 2 Z'])
    ('rejects unsafe or degenerate path %j', (source) => {
      expect(() => validateCustomSvgPath(source)).toThrow();
    });
});
