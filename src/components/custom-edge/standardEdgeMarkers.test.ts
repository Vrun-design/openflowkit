import { describe, expect, it } from 'vitest';
import { MarkerType } from '@/lib/reactflowCompat';
import { resolveStandardEdgeMarkers } from './standardEdgeMarkers';

describe('resolveStandardEdgeMarkers', () => {
  it('keeps upstream marker urls when connectorModelV1 is disabled', () => {
    const result = resolveStandardEdgeMarkers({
      connectorModelEnabled: false,
      edgeId: 'edge-1',
      markerStartUrl: 'url(#rf-start)',
      markerEndUrl: 'url(#rf-end)',
      markerStartConfig: { type: MarkerType.ArrowClosed, color: '#111827' },
      markerEndConfig: { type: MarkerType.ArrowClosed, color: '#111827' },
      stroke: '#111827',
    });

    expect(result.defs).toEqual([]);
    expect(result.markerStartUrl).toBe('url(#rf-start)');
    expect(result.markerEndUrl).toBe('url(#rf-end)');
  });

  it('creates local arrow markers for closed-arrow configs when connectorModelV1 is enabled', () => {
    const result = resolveStandardEdgeMarkers({
      connectorModelEnabled: true,
      edgeId: 'edge-1',
      markerStartConfig: { type: MarkerType.ArrowClosed, color: '#0f172a', width: 18, height: 18 },
      markerEndConfig: { type: MarkerType.ArrowClosed, color: '#0f172a' },
      stroke: '#64748b',
    });

    expect(result.defs).toHaveLength(2);
    expect(result.markerStartUrl).toContain('flow-edge-marker-edge-1-start');
    expect(result.markerEndUrl).toContain('flow-edge-marker-edge-1-end');
    expect(result.defs[0]?.color).toBe('#0f172a');
    expect(result.defs[0]?.width).toBe(12);
    expect(result.defs[0]?.height).toBe(12);
  });

  it('falls back to the edge stroke when marker color is omitted', () => {
    const result = resolveStandardEdgeMarkers({
      connectorModelEnabled: true,
      edgeId: 'edge-2',
      markerEndConfig: { type: MarkerType.ArrowClosed },
      stroke: '#334155',
    });

    expect(result.defs).toHaveLength(1);
    expect(result.defs[0]?.color).toBe('#334155');
    expect(result.markerEndUrl).toContain('flow-edge-marker-edge-2-end');
  });
});
