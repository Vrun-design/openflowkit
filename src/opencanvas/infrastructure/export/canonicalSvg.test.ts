import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { exportCanonicalSvg } from './canonicalSvg';

describe('canonical SVG export', () => {
  it('omits hidden objects, their children and attached connectors', () => {
    const visible = createTestNode('visible');
    const hidden = createTestNode('hidden', { content: { sectionHidden: true } });
    const child = createTestNode('child', { parentId: 'hidden' });
    const svg = exportCanonicalSvg(createTestDocument({ nodes: [visible, hidden, child],
      connectors: [createTestConnector('hidden-edge', 'child', 'visible')] }));
    expect(svg).toContain('data-node-id="visible"');
    expect(svg).not.toContain('data-node-id="hidden"');
    expect(svg).not.toContain('data-node-id="child"');
    expect(svg).not.toContain('data-connector-id="hidden-edge"');
  });
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

  it('exports freeform paths, pressure-width segments, and arrowheads', () => {
    const pen = createTestNode('pressure-pen', {
      kind: 'pen',
      size: { width: 20, height: 10 },
      content: {
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }],
        strokeColor: '#123456',
        strokeWidth: 4,
        inputSamples: [
          { pressure: 0.1, tiltX: 0, tiltY: 0, twist: 0 },
          { pressure: 0.5, tiltX: 20, tiltY: 0, twist: 0 },
          { pressure: 0.9, tiltX: 60, tiltY: 0, twist: 0 },
        ],
      },
    });
    const arrow = createTestNode('arrow', {
      kind: 'arrow',
      transform: { ...createTestNode('x').transform, translation: { x: 40, y: 0 } },
      size: { width: 20, height: 20 },
      content: { points: [{ x: 0, y: 0 }, { x: 20, y: 20 }], strokeWidth: 3 },
    });

    const svg = exportCanonicalSvg(createTestDocument({ nodes: [pen, arrow] }));
    expect(svg).toContain('data-node-kind="pen"');
    expect(svg).toContain('stroke="#123456"');
    const penGroup = svg.split('data-node-kind="pen"')[1].split('</g>')[0];
    expect(penGroup.match(/<path /g)).toHaveLength(2);
    const penWidths = [...penGroup.matchAll(/stroke-width="([\d.]+)"/g)]
      .map((match) => Number(match[1]));
    expect(penWidths[1]).toBeGreaterThan(penWidths[0]);
    expect(svg).toContain('data-node-kind="arrow"');
    const arrowGroup = svg.split('data-node-kind="arrow"')[1].split('</g>')[0];
    expect(arrowGroup.match(/<path /g)).toHaveLength(2);
    expect(svg).not.toContain('Pressure-pen');
  });

  it('exports rich text, annotation, and safe image interiors', () => {
    const text = createTestNode('text', {
      kind: 'text',
      content: {
        label: '<Release notes>',
        fontSize: 24,
        fontFamily: 'serif',
        fontWeight: '700',
        fontStyle: 'italic',
        backgroundColor: '#f8fafc',
      },
    });
    const annotation = createTestNode('annotation', {
      kind: 'annotation',
      transform: { ...createTestNode('x').transform, translation: { x: 120, y: 0 } },
      content: { label: 'Risk', subLabel: 'Rotate & verify', color: 'yellow' },
    });
    const image = createTestNode('image', {
      kind: 'image',
      transform: { ...createTestNode('x').transform, translation: { x: 240, y: 0 } },
      content: {
        label: 'Diagram',
        imageUrl: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
        transparency: 0.7,
      },
    });

    const svg = exportCanonicalSvg(createTestDocument({ nodes: [text, annotation, image] }));
    expect(svg).toContain('data-node-kind="text"');
    expect(svg).toContain('&lt;Release notes&gt;');
    expect(svg).toContain('font-family="serif"');
    expect(svg).toContain('font-style="italic"');
    expect(svg).toContain('data-node-kind="annotation"');
    expect(svg).toContain('Rotate &amp; verify');
    expect(svg).toContain('data-node-kind="image"');
    expect(svg).toContain('<image href="data:image/svg+xml,%3Csvg%3E%3C/svg%3E"');
    expect(svg).toContain('opacity="0.7"');
  });
});
