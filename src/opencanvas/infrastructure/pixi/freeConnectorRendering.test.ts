import { expect, it } from 'vitest';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { exportCanonicalSvg } from '../export/canonicalSvg';

it('renders and exports connectors with free endpoints', () => {
  const document = createTestDocument({ nodes: [] });
  const connector = {
    id: 'free-arrow', source: { nodeId: null, portId: null, anchor: null, point: { x: 40, y: 50 } },
    target: { nodeId: null, portId: null, anchor: null, point: { x: 180, y: 130 } },
    route: { kind: 'direct' as const, ownership: 'automatic' as const },
    waypoints: [], labels: [], appearance: { markerEnd: 'arrow' }, semantics: {}, metadata: {}, extensions: {},
  };
  const page = { ...document.pages[0], connectors: [connector] };
  const renderer = new PixiConnectorRenderer();
  renderer.draw(page, true);
  expect(renderer.getDebugSnapshot().connectors).toBe(1);
  expect(exportCanonicalSvg({ ...document, pages: [page] })).toContain('free-arrow');
});
