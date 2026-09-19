import { describe, expect, it } from 'vitest';
import { projectLegacyDocument } from '@/opencanvas/domain/document/legacyProjection';
import { exportCanonicalSvg } from '@/opencanvas/infrastructure/export/canonicalSvg';
import { applyCinematicRenderState } from './cinematicCanonicalFrame';
import type { CinematicRenderState } from './cinematicRenderState';

const document = projectLegacyDocument({
  name: 'Frames',
  nodes: [
    { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: 'b', type: 'process', position: { x: 300, y: 0 }, data: { label: 'B' } },
    { id: 'c', type: 'process', position: { x: 600, y: 400 }, data: { label: 'C' } },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b' }],
}, { documentId: 'doc', pageId: 'page', now: '2026-09-19T00:00:00.000Z' });

const state: CinematicRenderState = {
  active: true, backgroundMode: 'light',
  visibleNodeIds: new Set(['a']), builtEdgeIds: new Set(), visibleEdgeIds: new Set(),
  activeNodeId: 'b', activeNodeProgress: 0.5, activeEdgeId: 'ab', activeEdgeProgress: 0.25,
  currentSegment: null,
};

describe('applyCinematicRenderState', () => {
  it('hides, fades, and shows objects by opacity without moving the frame bounds', () => {
    const frame = applyCinematicRenderState(document, 'page', state);
    const opacity = (id: string) => frame.pages[0].nodes.find((node) => node.id === id)!.appearance.opacity;
    expect(opacity('a')).toBe(1);
    expect(opacity('b')).toBe(0.5);
    expect(opacity('c')).toBe(0);
    expect(frame.pages[0].connectors[0].appearance.opacity).toBe(0.25);

    const full = exportCanonicalSvg(document, { pageId: 'page' });
    const partial = exportCanonicalSvg(frame, { pageId: 'page' });
    expect(partial.match(/viewBox="[^"]+"/)![0]).toBe(full.match(/viewBox="[^"]+"/)![0]);
    expect(partial).toContain('data-node-id="c" transform="matrix(1 0 0 1 600 400)" opacity="0"');
    expect(partial).toContain('data-node-id="b" transform="matrix(1 0 0 1 300 0)" opacity="0.5"');
  });
});
