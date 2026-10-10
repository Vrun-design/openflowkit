import { describe, expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { exportCanonicalSvg, iconArtKey } from './canonicalSvg';
import { connectorLabelLineHeight, connectorLabelLines, connectorLabelPlate } from '../../domain/connectors/labelStyle';
import { projectPageConnectors } from '../../domain/connectors/routeProjection';
import { compile } from '../../../dsl/compile';
import { iconContent } from '../../domain/nodes/iconNode';
import { architectureIconBounds } from '../../domain/nodes/architectureNodePresentation';
import { createPresetFrame } from '../../domain/nodes/framePreset';
import { createWidgetNode } from '../../domain/nodes/widgetNode';

describe('canonical SVG export', () => {
  it('a C4 element with a long description wraps it inside its box', async () => {
    const compiled = await compile('architecture\nmodel {\n system Shop {\n  container API [tech: Go, desc: "Handles every order, payment, refund and shipping request from the web and mobile clients"]\n }\n}\nviews { view container of Shop }\n');
    const api = compiled.nodes.find((node) => node.id === 'shop.api')!;
    const sub = exportCanonicalSvg(createTestDocument({ nodes: [{ ...api, parentId: null }] })).match(/<text[^>]*opacity="0.72">(.*?)<\/text>/)!;
    const lines = [...sub[1]!.matchAll(/<tspan x="[^"]*" y="([^"]*)">([^<]*)</g)];
    expect(lines.length).toBeGreaterThan(2);
    expect(Number(lines.at(-1)![1])).toBeLessThan(api.size.height);
    expect(lines.map((line) => line[2]).join(' ')).toContain('mobile clients');
  });

  it('wraps a long sub-label at the canvas sub-label size and keeps it inside the node', () => {
    const node = createTestNode('api', {
      kind: 'process', size: { width: 320, height: 75 },
      content: { label: 'API', subLabel: '[Container · Go]\nHandles every order, payment, refund and shipping request from the web and mobile clients' },
    });
    const svg = exportCanonicalSvg(createTestDocument({ nodes: [node] }), { padding: 0 });
    const sub = svg.match(/<text[^>]*opacity="0.72">(.*?)<\/text>/)!;
    expect(sub[0]).toContain('font-size="11"');
    const ys = [...sub[1]!.matchAll(/<tspan x="[^"]*" y="([^"]*)"/g)].map((match) => Number(match[1]));
    expect(ys.length).toBeGreaterThan(1);
    expect(ys.at(-1)!).toBeLessThan(75);
  });

  it('wraps the sub-label where the sizing policy wraps it on the canvas', () => {
    const node = createTestNode('api', {
      kind: 'process', size: { width: 320, height: 110 },
      content: {
        label: 'API', subLabel: '[Container · Go]\nHandles every order, payment, refund and shipping request from the web and mobile clients',
        sizingPolicy: { version: 1, mode: 'fixed', minSize: { width: 24, height: 24 }, maxSize: { width: 1600, height: 1200 }, overflow: 'wrap', clipContent: false, maxLines: 4 },
      },
    });
    const sub = exportCanonicalSvg(createTestDocument({ nodes: [node] })).match(/<text[^>]*opacity="0.72">(.*?)<\/text>/)!;
    const ys = [...sub[1]!.matchAll(/<tspan x="[^"]*" y="([^"]*)"/g)].map((match) => Number(match[1]));
    expect(ys.length).toBeGreaterThan(2);
    expect(ys.at(-1)!).toBeLessThan(110);
  });

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
  it('draws wireframe widgets and device chrome from the canvas primitives, frames under their children', () => {
    const page = createTestDocument({ nodes: [] }).pages[0]!;
    const toggle = createWidgetNode(page, { id: 'toggle', widget: 'toggle', at: { x: 16, y: 60 }, label: 'Dark <mode>' });
    // The frame is newer (higher zIndex) than the toggle dropped into it.
    const phone = { ...createPresetFrame(page, { id: 'phone', preset: 'phone', at: { x: 0, y: 0 }, label: 'Login' }), zIndex: 9 };
    const light = exportCanonicalSvg(createTestDocument({ nodes: [{ ...toggle, parentId: 'phone' }, phone] }));
    expect(light.indexOf('data-node-id="phone"')).toBeLessThan(light.indexOf('data-node-id="toggle"'));
    expect(light).toContain('data-node-kind="widget"');
    expect(light).toContain('Dark &lt;mode&gt;');
    expect(light).toMatch(/<circle [^>]*fill="#ffffff"/); // the knob
    expect(light).toContain('>Login</text>');
    const dark = exportCanonicalSvg(createTestDocument({ nodes: [toggle] }), { theme: 'dark' });
    expect(dark).toMatch(/fill="#ffffff"[^>]*>Dark &lt;mode&gt;/); // canvas text turns light on dark
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

  it('stays well-formed XML when a label carries control characters (a PowerPoint soft break)', () => {
    const node = createTestNode('a', { content: { label: 'line\u000Bbreak nul\u0000 bad\uD800 ok 😀' } });
    const svg = exportCanonicalSvg(createTestDocument({ nodes: [node] }));
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(svg).toContain('linebreak nul bad ok 😀');
  });

  it('draws icon art where the canvas draws it, and only art it was given', () => {
    const card = createTestNode('db', {
      kind: 'architecture', size: { width: 148, height: 116 },
      content: { label: 'Postgres', ...iconContent({ provider: 'developer', packId: 'developer-icons-v1', shapeId: 'database-postgresql', label: 'Postgres' }) },
    });
    const document = createTestDocument({ nodes: [card] });
    const art = 'data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E';
    const svg = exportCanonicalSvg(document, { iconArt: { [iconArtKey('developer-icons-v1', 'database-postgresql')]: art } });
    const box = architectureIconBounds(card, 'provider-icon');
    expect(svg).toContain(`<image href="${art}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"`);
    // No art loaded (headless, or a failed fetch): the plate alone, never a broken link.
    expect(exportCanonicalSvg(document)).not.toContain('<image');
    expect(exportCanonicalSvg(document, { iconArt: {} })).not.toContain('<image');
  });

  it('draws a connector label where the projection puts it, wrapped like the canvas', () => {
    const text = 'Gets account information from, and makes payments using';
    const connector = createTestConnector('edge', 'a', 'b', {
      route: { kind: 'orthogonal', ownership: 'automatic' },
      labels: [{ id: 'l', text, pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }],
    });
    const document = createTestDocument({
      nodes: [createTestNode('a', { transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } }),
        createTestNode('b', { transform: { translation: { x: 400, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } } })],
      connectors: [connector],
    });
    const svg = exportCanonicalSvg(document);
    const projected = projectPageConnectors(document.pages[0]!)[0]!;
    const { point } = projected.labels[0]!;
    const n = (value: number) => Math.round(value * 100) / 100;
    const lines = connectorLabelLines(text, projected.presentation.label);
    expect(lines.length).toBeGreaterThan(2);
    for (const [index, line] of lines.entries()) {
      const y = point.y + (index - (lines.length - 1) / 2) * connectorLabelLineHeight(projected.presentation.label);
      expect(svg).toMatch(new RegExp(`<text x="${n(point.x)}" y="${n(y)}"[^>]*>${line}</text>`));
    }
    const plate = connectorLabelPlate(text, projected.presentation.label, point);
    expect(svg).toContain(`<rect x="${n(plate.x)}" y="${n(plate.y)}" width="${n(plate.width)}" height="${n(plate.height)}"`);
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

  it('expands a selected container to its whole subtree, dropping connectors that leave it', () => {
    const section = createTestNode('section', { kind: 'section' });
    const child = createTestNode('child', { parentId: 'section' });
    const grandchild = createTestNode('grandchild', { parentId: 'child' });
    const outside = createTestNode('outside');
    const document = createTestDocument({
      nodes: [section, child, grandchild, outside],
      connectors: [createTestConnector('inside-edge', 'child', 'grandchild'), createTestConnector('leaving-edge', 'grandchild', 'outside')],
    });
    const svg = exportCanonicalSvg(document, { selectedNodeIds: ['section'] });
    expect(svg).toContain('data-node-id="section"');
    expect(svg).toContain('data-node-id="child"');
    expect(svg).toContain('data-node-id="grandchild"');
    expect(svg).not.toContain('data-node-id="outside"');
    expect(svg).toContain('data-connector-id="inside-edge"');
    expect(svg).not.toContain('data-connector-id="leaving-edge"');
  });

  it('exports a lone connection without its endpoints', () => {
    const a = createTestNode('a'); const b = createTestNode('b');
    const document = createTestDocument({ nodes: [a, b], connectors: [createTestConnector('edge', 'a', 'b')] });
    const svg = exportCanonicalSvg(document, { selectedNodeIds: [], selectedConnectorIds: ['edge'] });
    expect(svg).toContain('data-connector-id="edge"');
    expect(svg).not.toContain('data-node-id="a"');
    expect(svg).not.toContain('data-node-id="b"');
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

describe('chart export', () => {
  const chartDocument = (chart: 'bar' | 'pie') => {
    const node = createTestNode('chart-1', {
      kind: 'chart',
      size: { width: 720, height: 440 },
      content: {
        chart,
        title: 'Monthly',
        categories: ['Jan', 'Feb', 'Mar'],
        series: [{ name: 'Revenue', values: [12, 19, 9] }],
      },
    });
    return createTestDocument({ nodes: [node] });
  };

  it('draws bars as rects with a tick axis and the title', () => {
    const svg = exportCanonicalSvg(chartDocument('bar'));
    expect(svg).toContain('data-node-kind="chart"');
    const bars = [...svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
    expect(bars.length).toBeGreaterThanOrEqual(3);
    expect(bars.every((bar) => Number(bar[3]) > 10)).toBe(true);
    expect(svg).toContain('>Monthly<');
    expect(svg).toContain('>Jan<');
    expect(svg).toContain('fill="#2563eb"');
  });

  it('draws pie slices as polygonal paths with percent labels', () => {
    const svg = exportCanonicalSvg(chartDocument('pie'));
    expect(svg.match(/<path /g)!.length).toBeGreaterThanOrEqual(3);
    expect(svg).toMatch(/>\d+%</);
  });
});

 it('exports semantic architecture card headers and descriptions', () => {
    const node = createTestNode('api', {kind: 'architecture', size: {width: 240, height: 152}, content: {
      label: 'Order API', assetPresentation: 'card', archProviderLabel: 'Container', archResourceType: 'Go', archEnvironment: 'Handles orders',
    }});
    const svg = exportCanonicalSvg(createTestDocument({nodes: [node]}));
    for (const text of ['Order API', 'Container', 'Go', 'Handles orders']) expect(svg).toContain(text);
  });

describe('dark architecture card export', () => {
  const person = (extra: Record<string, unknown> = {}) => createTestNode('who', { kind: 'architecture', size: { width: 240, height: 152 }, content: {
    label: 'Customer', assetPresentation: 'card', archProviderLabel: 'Person', archResourceType: '', color: 'violet', archKindColor: 'violet', ...extra,
  } });
  const cardRect = (svg: string) => svg.match(/<g[^>]*data-node-id="who"[^>]*>\s*<rect[^>]*>/)![0];

  it('washes a kind-default card as a faint tint, never an opaque light fill under white text', () => {
    const dark = exportCanonicalSvg(createTestDocument({ nodes: [person()] }), { theme: 'dark' });
    const rect = cardRect(dark);
    expect(rect).toMatch(/fill-opacity="0\.08"/);
    expect(rect).not.toContain('#f8fafc');
    expect(dark).toMatch(/fill="#ffffff"[^>]*><tspan[^>]*>Customer/);
  });
  it('keeps the light export of the same card unchanged', () => {
    const light = exportCanonicalSvg(createTestDocument({ nodes: [person()] }));
    expect(cardRect(light)).not.toContain('fill-opacity');
  });
  it('keeps a bold (filled) card solid in dark', () => {
    const dark = exportCanonicalSvg(createTestDocument({ nodes: [person({ colorMode: 'filled', archKindColor: undefined })] }), { theme: 'dark' });
    expect(cardRect(dark)).not.toContain('fill-opacity');
  });
});
