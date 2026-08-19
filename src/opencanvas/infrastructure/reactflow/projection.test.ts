import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { SceneDocumentV1, SceneNode } from '../../domain/document/types';
import type { ReactFlowGraph, ReactFlowProjectionContext } from './contracts';
import { projectReactFlowToSceneDocument } from './fromReactFlow';
import { projectSceneDocumentToReactFlow } from './toReactFlow';

const context: ReactFlowProjectionContext = {
  documentId: 'document-1',
  pageId: 'page-1',
  name: 'Adapter Test',
  diagramType: 'flowchart',
  now: '2026-08-07T12:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  layers: [
    { id: 'default', name: 'Default', visible: true, locked: false },
    { id: 'infra', name: 'Infrastructure', visible: true, locked: false },
  ],
};

function node(id: string, type: string, data: Record<string, unknown> = {}): FlowNode {
  return {
    id,
    type,
    position: { x: 100, y: 200 },
    style: { width: 180, height: 90 },
    data: { label: id, ...data },
  } as FlowNode;
}

function edge(
  id: string,
  source: string,
  target: string,
  data: Record<string, unknown> = {}
): FlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle: 'right',
    targetHandle: 'left',
    label: id,
    data: { curve: 'smoothstep', routingMode: 'manual', ...data },
  } as FlowEdge;
}

function roundTrip(graph: ReactFlowGraph, overrides: Partial<ReactFlowProjectionContext> = {}) {
  const document = projectReactFlowToSceneDocument(graph, { ...context, ...overrides });
  return projectSceneDocumentToReactFlow(document, context.pageId);
}

describe('React Flow projection parity', () => {
  it.each([
    ['flowchart', node('process', 'process', { shape: 'rounded' })],
    [
      'architecture',
      node('api', 'architecture', { archProvider: 'aws', archResourceType: 'lambda' }),
    ],
    [
      'classDiagram',
      node('user', 'class', {
        classStereotype: 'aggregate',
        classAttributes: ['- id: UUID'],
        classMethods: ['+ save(): void'],
      }),
    ],
    [
      'erDiagram',
      node('users', 'er_entity', {
        erFields: [
          {
            name: 'id',
            dataType: 'UUID',
            isPrimaryKey: true,
            isForeignKey: false,
            referencesTable: 'accounts',
            referencesField: 'id',
          },
        ],
      }),
    ],
    [
      'mindmap',
      node('root', 'mindmap', {
        mindmapDepth: 1,
        mindmapParentId: 'parent',
        mindmapAlias: 'platform.api',
        mindmapWrapper: 'double-square',
        mindmapSide: 'right',
        mindmapBranchStyle: 'straight',
        mindmapCollapsed: true,
      }),
    ],
    [
      'journey',
      node('payment', 'journey', {
        journeyTitle: 'Checkout',
        journeySection: 'Payment',
        journeyTask: 'Confirm order',
        journeyActor: 'Buyer',
        journeyScore: 2,
      }),
    ],
    ['sequence', node('client', 'sequence_participant', { seqParticipantKind: 'actor' })],
  ])('round-trips unchanged %s records exactly', (diagramType, familyNode) => {
    const familyEdge = edge('relationship', familyNode.id, familyNode.id, {
      unknownFamilyField: { preserved: true },
    });
    const graph = { nodes: [familyNode], edges: [familyEdge] };

    const result = roundTrip(graph, { diagramType });

    expect(result.nodes).toEqual(graph.nodes);
    expect(result.edges).toEqual(graph.edges);
    expect(result.diagramType).toBe(diagramType);
  });

  it('removes transient renderer state before entering the canonical document', () => {
    const transientNode = {
      ...node('node-1', 'process'),
      selected: true,
      dragging: true,
      measured: { width: 180, height: 90 },
      positionAbsolute: { x: 100, y: 200 },
    } as FlowNode;
    const transientEdge = { ...edge('edge-1', 'node-1', 'node-1'), selected: true } as FlowEdge;

    const result = roundTrip({ nodes: [transientNode], edges: [transientEdge] });

    expect(result.nodes[0]).not.toHaveProperty('selected');
    expect(result.nodes[0]).not.toHaveProperty('dragging');
    expect(result.nodes[0]).not.toHaveProperty('measured');
    expect(result.nodes[0]).not.toHaveProperty('positionAbsolute');
    expect(result.edges[0]).not.toHaveProperty('selected');
  });

  it('preserves unknown top-level, node, edge, and data JSON', () => {
    const graph = {
      nodes: [
        {
          ...node('node-1', 'custom', { providerPayload: { region: 'ap-south-1' } }),
          customNodeField: ['keep'],
        } as FlowNode,
      ],
      edges: [
        {
          ...edge('edge-1', 'node-1', 'node-1', { customRoutePayload: 42 }),
          customEdgeField: { keep: true },
        } as FlowEdge,
      ],
    };

    const result = roundTrip(graph);
    expect(result.nodes).toEqual(graph.nodes);
    expect(result.edges).toEqual(graph.edges);
  });

  it('rejects dangling renderer references at the adapter boundary', () => {
    expect(() =>
      projectReactFlowToSceneDocument(
        { nodes: [node('node-1', 'process')], edges: [edge('edge-1', 'node-1', 'missing')] },
        context
      )
    ).toThrow(/source|target|Unknown node ID/);
  });
});

describe('canonical edits projected to React Flow', () => {
  function editFirstNode(
    document: SceneDocumentV1,
    edit: (node: SceneNode) => SceneNode
  ): SceneDocumentV1 {
    const page = document.pages[0];
    return {
      ...document,
      pages: [{ ...page, nodes: [edit(page.nodes[0]), ...page.nodes.slice(1)] }],
    };
  }

  it('projects node position, size, rotation, hierarchy, layer, and content edits', () => {
    const graph = {
      nodes: [node('parent', 'group'), node('child', 'process', { custom: 'original' })],
      edges: [],
    };
    const original = projectReactFlowToSceneDocument(graph, context);
    const child = original.pages[0].nodes[1];
    const edited: SceneDocumentV1 = {
      ...original,
      pages: [
        {
          ...original.pages[0],
          nodes: [
            original.pages[0].nodes[0],
            {
              ...child,
              parentId: 'parent',
              layerId: 'infra',
              zIndex: 7,
              transform: {
                translation: { x: 320, y: 480 },
                rotationRadians: Math.PI / 4,
                scale: { x: 1, y: 1 },
              },
              size: { width: 240, height: 120 },
              content: { ...child.content, label: 'Edited', custom: 'preserved' },
            },
          ],
        },
      ],
    };

    const result = projectSceneDocumentToReactFlow(edited);
    expect(result.nodes[1]).toMatchObject({
      id: 'child',
      position: { x: 320, y: 480 },
      parentId: 'parent',
      zIndex: 7,
      style: { width: 240, height: 120 },
      data: {
        label: 'Edited',
        custom: 'preserved',
        layerId: 'infra',
        rotation: 45,
      },
    });
  });

  it('projects endpoint, route, waypoint, and label edits while retaining unknown edge data', () => {
    const graph = {
      nodes: [node('a', 'process'), node('b', 'process')],
      edges: [edge('a-b', 'a', 'b', { custom: 'preserve' })],
    };
    const document = projectReactFlowToSceneDocument(graph, context);
    const page = document.pages[0];
    const connector = page.connectors[0];
    const edited: SceneDocumentV1 = {
      ...document,
      pages: [
        {
          ...page,
          connectors: [
            {
              ...connector,
              source: { nodeId: 'b', portId: null, anchor: null },
              target: { nodeId: 'a', portId: 'right', anchor: null },
              route: { kind: 'polyline', ownership: 'imported-fixed' },
              waypoints: [{ x: 200, y: 250 }],
              labels: [
                {
                  ...connector.labels[0],
                  text: 'updated',
                  pathRatio: 0.75,
                  offset: { x: 8, y: -12 },
                },
              ],
            },
          ],
        },
      ],
    };

    const result = projectSceneDocumentToReactFlow(edited);
    expect(result.edges[0]).toMatchObject({
      source: 'b',
      target: 'a',
      targetHandle: 'right',
      label: 'updated',
      data: {
        custom: 'preserve',
        routingMode: 'import-fixed',
        curve: 'linear',
        waypoints: [{ x: 200, y: 250 }],
        labelPosition: 0.75,
        labelOffsetX: 8,
        labelOffsetY: -12,
      },
    });
    expect(result.edges[0]).not.toHaveProperty('sourceHandle');
  });

  it('projects additions and deletions from canonical collection order', () => {
    const graph = { nodes: [node('old', 'process')], edges: [] };
    const document = projectReactFlowToSceneDocument(graph, context);
    const replacement: SceneNode = {
      ...document.pages[0].nodes[0],
      id: 'new',
      kind: 'decision',
      transform: { translation: { x: 20, y: 30 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: 120, height: 80 },
      content: { label: 'New' },
    };
    const edited = editFirstNode(document, () => replacement);

    const result = projectSceneDocumentToReactFlow(edited);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      id: 'new',
      type: 'decision',
      position: { x: 20, y: 30 },
      data: { label: 'New' },
      style: { width: 120, height: 80 },
    });
  });
});
