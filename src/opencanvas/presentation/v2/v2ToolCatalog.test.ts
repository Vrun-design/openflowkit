import { describe, expect, it } from 'vitest';
import {
  CONNECTOR_OPTIONS, CONNECTOR_ROUTE, SHAPE_OPTIONS, connectorHeadEnd, connectorOption,
  shapeOption,
} from './v2ToolCatalog';

describe('v2 tool catalog', () => {
  it('offers every library shape once', () => {
    const ids = SHAPE_OPTIONS.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('diamond');
    expect(ids).toContain('rectangle');
  });

  it('resolves a shape option and falls back to the first for an unknown id', () => {
    expect(shapeOption('diamond').label).toBe('Diamond');
    expect(shapeOption('nope' as never)).toBe(SHAPE_OPTIONS[0]);
  });

  it('maps connector picks onto routes and heads', () => {
    expect(CONNECTOR_OPTIONS).toHaveLength(4);
    expect(CONNECTOR_ROUTE.arrow).toBe('orthogonal');
    expect(CONNECTOR_ROUTE.line).toBe('direct');
    expect(CONNECTOR_ROUTE.curve).toBe('bezier');
    expect(CONNECTOR_ROUTE.path).toBe('polyline');
    expect(connectorHeadEnd('line')).toBe('none');
    expect(connectorHeadEnd('arrow')).toBe('arrow');
    expect(connectorOption('path').label).toBe('Path');
  });
});
