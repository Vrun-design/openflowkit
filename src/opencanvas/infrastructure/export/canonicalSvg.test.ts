import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { exportCanonicalSvg } from './canonicalSvg';

describe('canonical SVG export', () => {
  it('is deterministic, renderer-independent, escaped, themed, and high-DPI', () => {
    const a = createTestNode('a', { content: { label: '<Alpha & beta>', shape: 'diamond' } });
    const b = createTestNode('b', { transform: { ...createTestNode('x').transform,
      translation: { x: 200, y: 50 } } });
    const document = createTestDocument({ nodes: [a, b], connectors: [createTestConnector('a-b', 'a', 'b')] });
    const first = exportCanonicalSvg(document, { theme: 'dark', pixelRatio: 2 });
    expect(first).toBe(exportCanonicalSvg(document, { theme: 'dark', pixelRatio: 2 }));
    expect(first).toContain('data-theme="dark"');
    expect(first).toContain('data-pixel-ratio="2"');
    expect(first).toContain('&lt;Alpha &amp; beta&gt;');
    expect(first).toContain('data-connector-id="a-b"');
    expect(first).not.toContain('<Alpha & beta>');
  });

  it('exports a visible selection and rejects empty output', () => {
    const a = createTestNode('a'); const b = createTestNode('b');
    const document = createTestDocument({ nodes: [a, b], connectors: [createTestConnector('edge', 'a', 'b')] });
    const selected = exportCanonicalSvg(document, { selectedNodeIds: ['a'], theme: 'print' });
    expect(selected).toContain('data-node-id="a"');
    expect(selected).not.toContain('data-node-id="b"');
    expect(selected).not.toContain('data-connector-id="edge"');
    expect(() => exportCanonicalSvg(document, { selectedNodeIds: ['missing'] })).toThrow(/visible node/);
  });
});
