import { describe, expect, it } from 'vitest';
import {
  CONNECTOR_OPTIONS, CONNECTOR_ROUTE, MORE_SECTIONS, SHAPE_OPTIONS, connectorHeadEnd,
} from './v2ToolCatalog';
import { LIBRARY_SHAPES } from '../../domain/nodes/shapeNode';
import { FRAME_PRESETS } from '../../domain/nodes/framePreset';
import { WIDGET_KINDS } from '../../domain/nodes/widgetNodePresentation';

describe('v2 tool catalog', () => {
  it('offers every library shape once, and nothing the R/O tools already draw', () => {
    const ids = SHAPE_OPTIONS.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...LIBRARY_SHAPES].sort());
    expect(ids).not.toContain('rectangle');
  });

  it('maps connector picks onto routes and heads', () => {
    expect(CONNECTOR_OPTIONS.map((option) => option.id)).toEqual(['arrow', 'elbow', 'curve', 'line', 'path']);
    expect(CONNECTOR_ROUTE.arrow).toBe('direct');
    expect(CONNECTOR_ROUTE.elbow).toBe('orthogonal');
    expect(CONNECTOR_ROUTE.line).toBe('direct');
    expect(CONNECTOR_ROUTE.curve).toBe('bezier');
    expect(CONNECTOR_ROUTE.path).toBe('polyline');
    expect(connectorHeadEnd('line')).toBe('none');
    expect(connectorHeadEnd('arrow')).toBe('arrow');
    expect(connectorHeadEnd('elbow')).toBe('arrow');
  });

  it('offers every frame preset and every wireframe widget in More, each once', () => {
    const ids = MORE_SECTIONS.flatMap((section) => section.options.map((option) => option.id));
    expect(new Set(ids).size).toBe(ids.length);
    const of = (group: string) => ids.filter((id) => id.startsWith(`${group}:`)).map((id) => id.slice(group.length + 1));
    expect(of('frame')).toEqual([...FRAME_PRESETS]);
    expect(of('widget')).toEqual([...WIDGET_KINDS]);
    expect(of('tool')).toEqual(['lasso', 'laser', 'eraser', 'sticky']);
  });
});
