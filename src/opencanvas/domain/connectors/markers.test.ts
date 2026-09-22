import { describe, expect, it } from 'vitest';
import { connectorMarkerShapes } from './markers';

const endpoint = { x: 100, y: 100 };
const outward = { x: 0, y: -1 };

describe('connector marker geometry', () => {
  it('draws the open arrow as a chevron from the second point through the tip', () => {
    const [shape] = connectorMarkerShapes('arrow', endpoint, outward, 0);
    expect(shape).toEqual({
      kind: 'polygon', closed: false, filled: false, round: true,
      subpaths: [[{ x: 104.5, y: 109 }, endpoint, { x: 95.5, y: 109 }]],
    });
  });

  it('offsets stacked glyphs further back along the line', () => {
    const [first] = connectorMarkerShapes('bar', endpoint, outward, 0);
    const [second] = connectorMarkerShapes('bar', endpoint, outward, 9);
    expect(first).toMatchObject({ subpaths: [[{ x: 105, y: 103 }, { x: 95, y: 103 }]] });
    expect(second).toMatchObject({ subpaths: [[{ x: 105, y: 112 }, { x: 95, y: 112 }]] });
  });

  it('fills closed glyphs and leaves open ones stroked', () => {
    expect(connectorMarkerShapes('triangle-filled', endpoint, outward, 0)[0]).toMatchObject({ closed: true, filled: true });
    expect(connectorMarkerShapes('triangle-open', endpoint, outward, 0)[0]).toMatchObject({ closed: true, filled: false });
    expect(connectorMarkerShapes('diamond-filled', endpoint, outward, 0)[0]).toMatchObject({ closed: true, filled: true });
  });

  it('draws a circle as its centre and radius', () => {
    expect(connectorMarkerShapes('circle', endpoint, outward, 0)).toEqual([
      { kind: 'circle', center: { x: 100, y: 105 }, radius: 4 },
    ]);
  });

  it('draws a cross as two subpaths of one glyph', () => {
    const [shape] = connectorMarkerShapes('cross', endpoint, outward, 0);
    expect(shape).toMatchObject({ kind: 'polygon', closed: false, filled: false });
    if (shape?.kind !== 'polygon') throw new Error('expected a polygon');
    expect(shape.subpaths).toHaveLength(2);
    expect(shape.subpaths[0]).toHaveLength(2);
  });

  it('draws nothing for a glyph the exporter has no geometry for', () => {
    expect(connectorMarkerShapes('crow-foot', endpoint, outward, 0)).toEqual([]);
  });
});
