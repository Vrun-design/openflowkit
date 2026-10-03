import { describe, expect, it } from 'vitest';
import { PRODUCTION_NODE_CATALOG } from '../../application/active-document/productionNodeCatalog';
import { resolveConnectorPresentation } from '../../domain/connectors/presentation';
import type { ConnectorMarkerGlyph } from '../../domain/connectors/types';
import type { ConnectorRouteKind, SceneDocumentV1, SceneNode } from '../../domain/document/types';
import { validateSceneDocumentV1 } from '../../domain/document/validation';
import { CHART_KINDS } from '../../domain/nodes/chartNodePresentation';
import { FRAME_PRESETS } from '../../domain/nodes/framePreset';
import { SHAPE_KINDS } from '../../domain/nodes/shapeNode';
import { WIDGET_KINDS } from '../../domain/nodes/widgetNodePresentation';
import { buildScaleDocument, buildStressDocument } from './buildStressDocument';
import { FAMILY_SAMPLES, STRESS_ICONS } from './stressSamples';

const NOW = '2026-09-25T00:00:00.000Z';

function validated(document: SceneDocumentV1): SceneDocumentV1 {
  const validation = validateSceneDocumentV1(document);
  if (validation.success === false) {
    throw new Error(`Invalid stress document: ${JSON.stringify(validation.issues.slice(0, 5))}`);
  }
  return validation.document;
}

function firstPage(document: SceneDocumentV1) {
  const page = document.pages[0];
  if (!page) throw new RangeError('Stress document has no pages.');
  return page;
}

function shapesRepresented(nodes: readonly SceneNode[]): Set<string> {
  const shapes = new Set<string>();
  for (const node of nodes) {
    if (node.kind === 'text') shapes.add('text');
    else if (typeof node.content.shape === 'string') shapes.add(node.content.shape);
  }
  return shapes;
}

function catalogRepresented(nodes: readonly SceneNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (node.kind === 'architecture') {
      ids.add(node.content.assetPresentation === 'icon' ? 'provider_icon' : 'architecture');
    } else if (node.kind === 'annotation' && typeof node.content.seqFragmentId === 'string') {
      ids.add('sequence_fragment');
    } else {
      ids.add(node.kind);
    }
  }
  return ids;
}

describe('buildStressDocument', () => {
  it('builds one valid page with unique node and connector ids', async () => {
    const document = validated(await buildStressDocument({ scaleNodes: 20, now: NOW }));
    expect(document.pages).toHaveLength(1);
    const page = firstPage(document);
    expect(new Set(page.nodes.map((node) => node.id)).size).toBe(page.nodes.length);
    expect(new Set(page.connectors.map((connector) => connector.id)).size).toBe(page.connectors.length);
  });

  it('covers every pickable shape and the DSL-only shapes', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const present = shapesRepresented(page.nodes);
    for (const kind of SHAPE_KINDS) expect(present.has(kind), `shape ${kind}`).toBe(true);
    for (const shape of ['comment', 'panel', 'callout-stack', 'queue', 'capsule', 'diamond']) {
      expect(present.has(shape), `DSL shape ${shape}`).toBe(true);
    }
  });

  it('covers every insert-catalogue node kind', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const present = catalogRepresented(page.nodes);
    for (const entry of PRODUCTION_NODE_CATALOG) expect(present.has(entry.id), `catalogue ${entry.id}`).toBe(true);
  });

  it('compiles one frame for every DSL family sample', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const labels = new Set(page.nodes.flatMap((node) => (node.kind === 'frame' ? [String(node.content.label)] : [])));
    for (const sample of FAMILY_SAMPLES) {
      const title = /^title:\s*(.+)$/m.exec(sample.text)?.[1]?.trim();
      expect(title, `sample ${sample.key} needs a title`).toBeTruthy();
      expect(labels.has(title ?? ''), `frame ${sample.key}`).toBe(true);
    }
  });

  it('covers every chart kind, widget kind and frame preset', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const charts = new Set(page.nodes.filter((node) => node.kind === 'chart').map((node) => String(node.content.chart)));
    for (const kind of CHART_KINDS) expect(charts.has(kind), `chart ${kind}`).toBe(true);

    const widgets = new Set(page.nodes.filter((node) => node.kind === 'widget').map((node) => String(node.content.widget)));
    for (const kind of WIDGET_KINDS) expect(widgets.has(kind), `widget ${kind}`).toBe(true);

    const frames = new Set(page.nodes.filter((node) => node.kind === 'frame').map((node) => String(node.content.preset)));
    for (const preset of FRAME_PRESETS) expect(frames.has(preset), `frame preset ${preset}`).toBe(true);
  });

  it('covers every ink kind and a range of text styles', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const kinds = new Set(page.nodes.map((node) => node.kind));
    for (const kind of ['pen', 'highlighter', 'line', 'arrow']) expect(kinds.has(kind), `ink ${kind}`).toBe(true);
    const sizes = new Set(page.nodes.filter((node) => node.kind === 'text').map((node) => node.content.fontSize));
    expect(sizes.size).toBeGreaterThanOrEqual(5);
  });

  it('covers every connector route and marker glyph', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const routes = new Set<ConnectorRouteKind>(page.connectors.map((connector) => connector.route.kind));
    const routeKinds: readonly ConnectorRouteKind[] = ['direct', 'polyline', 'bezier', 'orthogonal'];
    for (const route of routeKinds) expect(routes.has(route), `route ${route}`).toBe(true);

    const glyphs = new Set<ConnectorMarkerGlyph>();
    for (const connector of page.connectors) {
      const presentation = resolveConnectorPresentation(connector);
      for (const glyph of [...presentation.sourceMarkers, ...presentation.targetMarkers]) glyphs.add(glyph);
    }
    const allGlyphs: readonly ConnectorMarkerGlyph[] = [
      'arrow', 'triangle-open', 'triangle-filled', 'diamond-open', 'diamond-filled',
      'circle', 'bar', 'cross', 'crow-foot',
    ];
    for (const glyph of allGlyphs) expect(glyphs.has(glyph), `glyph ${glyph}`).toBe(true);
  });

  it('places one of every curated icon', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const icons = page.nodes.filter((node) => node.kind === 'architecture' && node.content.assetPresentation === 'icon');
    for (const icon of STRESS_ICONS) {
      const found = icons.some((node) =>
        node.content.archIconShapeId === icon.shapeId && node.content.archIconPackId === icon.packId
      );
      expect(found, `icon ${icon.dslId}`).toBe(true);
    }
  });

  it('connects only endpoints that exist on the page', async () => {
    const page = firstPage(validated(await buildStressDocument({ scaleNodes: 20, now: NOW })));
    const nodeIds = new Set(page.nodes.map((node) => node.id));
    for (const connector of page.connectors) {
      for (const endpoint of [connector.source, connector.target]) {
        if (endpoint.nodeId !== null) expect(nodeIds.has(endpoint.nodeId), endpoint.nodeId).toBe(true);
        else expect(endpoint.point).not.toBeNull();
      }
    }
  });
});

describe('buildScaleDocument', () => {
  it('builds a valid chain of exactly N nodes', () => {
    const document = validated(buildScaleDocument(64, { now: NOW }));
    const page = firstPage(document);
    expect(page.nodes).toHaveLength(64 + 1);
    expect(page.connectors).toHaveLength(64 - 1);
    const nodeIds = new Set(page.nodes.map((node) => node.id));
    const chain = page.connectors.filter((connector) => connector.appearance.markerEnd === 'arrow');
    expect(chain).toHaveLength(64 - 1);
    for (const connector of chain) {
      expect(nodeIds.has(connector.source.nodeId ?? '')).toBe(true);
      expect(nodeIds.has(connector.target.nodeId ?? '')).toBe(true);
    }
  });

  it('rejects counts below two', () => {
    expect(() => buildScaleDocument(1)).toThrow(RangeError);
    expect(() => buildScaleDocument(2.5)).toThrow(RangeError);
  });
});
