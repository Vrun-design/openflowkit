import { describe, expect, it } from 'vitest';
import { curve, roundedPath } from './geometry';

describe('arrow paths', () => {
  it('rounds bends and survives short segments', () => {
    expect(roundedPath([{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }])).toContain('Q0,40');
    expect(roundedPath([{ x: 0, y: 0 }])).toBe('');
  });
  it('curves between two boxes', () => {
    const c = curve({ x: 0, y: 0, width: 10, height: 10 }, { x: 100, y: 0, width: 10, height: 10 });
    expect(c.d.startsWith('M10,5')).toBe(true);
    expect(c.mid.x).toBeGreaterThan(10);
  });
});
