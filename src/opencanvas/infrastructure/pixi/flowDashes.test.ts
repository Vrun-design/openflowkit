import { describe, expect, it } from 'vitest';
import { flowDashes } from './flowDashes';

const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];

describe('flowDashes', () => {
  it('cuts a line into dashes of the asked length', () => {
    expect(flowDashes(line, 10, 10, 0).map((d) => [d[0]!.x, d.at(-1)!.x])).toEqual([[0, 10], [20, 30], [40, 50], [60, 70], [80, 90]]);
  });

  it('a growing phase moves every dash toward the end, and a full period looks the same', () => {
    expect(flowDashes(line, 10, 10, 5).map((d) => [d[0]!.x, d.at(-1)!.x]).slice(0, 2)).toEqual([[5, 15], [25, 35]]);
    expect(flowDashes(line, 10, 10, 20)).toEqual(flowDashes(line, 10, 10, 0));
    expect(flowDashes(line, 10, 10, -15)).toEqual(flowDashes(line, 10, 10, 5));
  });

  it('a dash follows a corner', () => {
    const bent = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(flowDashes(bent, 8, 100, 4)[0]).toEqual([{ x: 4, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 2 }]);
  });

  it('nothing to draw for a point or a zero dash', () => {
    expect(flowDashes([{ x: 1, y: 1 }], 10, 10, 0)).toEqual([]);
    expect(flowDashes(line, 0, 10, 0)).toEqual([]);
  });
});
