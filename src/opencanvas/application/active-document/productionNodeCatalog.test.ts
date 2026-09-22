import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import { validateSceneDocumentV1 } from '../../domain/document/validation';
import type { SceneNode } from '../../domain/document/types';
import { resolveArchitectureNodePresentation } from '../../domain/nodes/architectureNodePresentation';
import { resolveBasicNodePresentation } from '../../domain/nodes/basicNodePresentation';
import { resolveClassEntityNodePresentation } from '../../domain/nodes/classEntityNodePresentation';
import { resolveContainerNodePresentation } from '../../domain/nodes/containerNodePresentation';
import { resolveFreeformNodePresentation } from '../../domain/nodes/freeformNodePresentation';
import { resolveJourneyNodePresentation } from '../../domain/nodes/journeyNodePresentation';
import { resolveMindmapNodePresentation } from '../../domain/nodes/mindmapNodePresentation';
import { resolveSequenceNodePresentation } from '../../domain/nodes/sequenceNodePresentation';
import { resolveWireframeNodePresentation } from '../../domain/nodes/wireframeNodePresentation';
import {
  createProductionFreeformNode,
  createProductionProcessNode,
  buildProductionNodeMutationCommand,
} from './productionNodeBridge';
import {
  PRODUCTION_NODE_CATALOG,
  createProductionSceneNode,
  productionNodeCatalogEntry,
} from './productionNodeCatalog';

const RESOLVERS: Readonly<Record<string, (node: SceneNode) => unknown>> = {
  basic: resolveBasicNodePresentation,
  freeform: resolveFreeformNodePresentation,
  architecture: resolveArchitectureNodePresentation,
  container: resolveContainerNodePresentation,
  sequence: resolveSequenceNodePresentation,
  wireframe: resolveWireframeNodePresentation,
};

function structuredResolver(node: SceneNode): unknown {
  return node.kind === 'mindmap'
    ? resolveMindmapNodePresentation(node)
    : node.kind === 'journey'
      ? resolveJourneyNodePresentation(node)
      : resolveClassEntityNodePresentation(node);
}

function document() {
  return projectLegacyDocument({
    name: 'Catalog',
    nodes: [{ id: 'seed', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Seed' } }],
    edges: [],
  }, { documentId: 'doc', pageId: 'page', now: '2026-08-26T00:00:00.000Z' });
}

describe('production node catalog', () => {
  it('exposes a unique entry for every kind the inspector can describe', () => {
    const ids = PRODUCTION_NODE_CATALOG.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rejects an unknown entry and an empty id', () => {
    expect(productionNodeCatalogEntry('nope')).toBeNull();
    expect(() => createProductionSceneNode('nope', 'a', { x: 0, y: 0 }, 'default'))
      .toThrow(/was not found/);
    expect(() => createProductionSceneNode('process', '', { x: 0, y: 0 }, 'default'))
      .toThrow(/must not be empty/);
  });

  it.each(PRODUCTION_NODE_CATALOG.map((entry) => [entry.id, entry] as const))(
    'creates a renderable %s node that inserts and inverts cleanly',
    (id, entry) => {
      const node = createProductionSceneNode(id, `new-${id}`, { x: 40, y: 60 }, 'default');
      expect(node.kind).toBe(entry.kind);
      expect(node.transform.translation).toEqual({ x: 40, y: 60 });
      const resolve = entry.group === 'structured' ? structuredResolver : RESOLVERS[entry.group];
      expect(resolve(node), `${id} must resolve to a presentation`).not.toBeNull();

      const source = document();
      const command = buildProductionNodeMutationCommand(source.pages[0], {
        kind: 'insert', node,
      }).command;
      const applied = applyDocumentCommand(source, command!);
      expect(validateSceneDocumentV1(applied.document).success).toBe(true);
      expect(applied.document.pages[0].nodes.map((candidate) => candidate.id))
        .toContain(`new-${id}`);
      expect(applyDocumentCommand(applied.document, applied.inverse).document)
        .toEqual(source);
    }
  );

  it('keeps the pre-catalog factories structurally unchanged', () => {
    expect(createProductionProcessNode('n', { x: 1, y: 2 }, 'layer')).toEqual({
      id: 'n', kind: 'process', parentId: null, layerId: 'layer', zIndex: 0,
      transform: { translation: { x: 1, y: 2 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: 168, height: 72 }, content: { label: 'Process' },
      appearance: {}, ports: [], metadata: {}, extensions: {},
    });
    expect(createProductionProcessNode('n', { x: 1, y: 2 }, 'layer', 'Named').content.label)
      .toBe('Named');
    expect(createProductionFreeformNode('s', 'sticky', { x: 0, y: 0 }, 'layer')).toMatchObject({
      kind: 'sticky', size: { width: 180, height: 120 },
      content: { label: 'Sticky note', subLabel: 'Add a note…' },
    });
    expect(createProductionFreeformNode('h', 'highlighter', { x: 0, y: 0 }, 'layer')).toMatchObject({
      kind: 'highlighter', size: { width: 180, height: 80 },
      content: { strokeColor: '#fde047', strokeWidth: 16, transparency: 0.45 },
    });
  });
});
