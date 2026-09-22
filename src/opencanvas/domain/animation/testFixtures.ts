import type { SceneConnector, SceneNode, ScenePage } from '../document/types';

/** Minimal scene records for animation tests; geometry only, no renderers. */
export function animNode(
  id: string,
  x: number,
  y: number,
  options: { kind?: string; parentId?: string | null; elementId?: string } = {},
): SceneNode {
  return {
    id,
    kind: options.kind ?? 'process',
    parentId: options.parentId ?? null,
    layerId: 'default',
    zIndex: 0,
    transform: { translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 100, height: 50 },
    content: {},
    appearance: {},
    ports: [],
    metadata: options.elementId ? { model: { elementId: options.elementId } } : {},
    extensions: {},
  };
}

export function animEdge(id: string, from: string | null, to: string | null): SceneConnector {
  const endpoint = (nodeId: string | null) => ({
    nodeId, portId: null, anchor: null, point: nodeId ? null : { x: 0, y: 0 },
  });
  return {
    id,
    source: endpoint(from),
    target: endpoint(to),
    route: { kind: 'direct', ownership: 'automatic' },
    waypoints: [],
    labels: [],
    appearance: {},
    semantics: {},
    metadata: {},
    extensions: {},
  };
}

export function animPage(nodes: SceneNode[], connectors: SceneConnector[] = []): ScenePage {
  return {
    id: 'page', name: 'Page', diagramKind: 'flowchart',
    layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
    nodes, connectors, metadata: {}, extensions: {},
  };
}
