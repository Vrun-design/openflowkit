import { createPoint2d } from '../geometry/point';
import { createSize2d } from '../geometry/size';
import { createTransform2d } from '../geometry/transform';
import { createDefaultSceneLayer, DEFAULT_SCENE_LAYER_ID } from './defaults';
import { cloneJsonValue, isJsonObject, type JsonObject, type JsonValue } from './json';
import {
  SCENE_DOCUMENT_FORMAT,
  SCENE_DOCUMENT_VERSION,
  type ConnectorRouteIntent,
  type SceneConnector,
  type SceneDocumentV1,
  type SceneLayer,
  type SceneNode,
  type ScenePort,
} from './types';

const LEGACY_SNAPSHOT_KEY = 'openflowkit.legacy.document';

export interface LegacyProjectionOptions {
  readonly documentId: string;
  readonly pageId: string;
  readonly pageName?: string;
  readonly now: string;
  readonly layers?: readonly SceneLayer[];
  readonly pageExtensions?: JsonObject;
}

function requireRecord(value: JsonValue, path: string): JsonObject {
  if (!isJsonObject(value)) throw new TypeError(`${path} must be a JSON object.`);
  return value;
}

function requireString(value: JsonValue | undefined, path: string): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError(`${path} must be a non-empty string.`);
  return value;
}

function optionalString(value: JsonValue | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function finiteNumber(value: JsonValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegativeNumber(value: JsonValue | undefined, fallback: number): number {
  const number = finiteNumber(value, fallback);
  return number >= 0 ? number : fallback;
}

function nodeSize(node: JsonObject, data: JsonObject): { width: number; height: number } {
  const style = isJsonObject(node.style) ? node.style : {};
  return createSize2d(
    nonNegativeNumber(node.width, nonNegativeNumber(style.width, nonNegativeNumber(data.width, 0))),
    nonNegativeNumber(
      node.height,
      nonNegativeNumber(style.height, nonNegativeNumber(data.height, 0))
    )
  );
}

function projectNode(value: JsonValue): SceneNode {
  const node = requireRecord(value, 'Legacy node');
  const data = isJsonObject(node.data) ? cloneJsonValue(node.data) : {};
  const position = requireRecord(node.position ?? {}, `Legacy node ${String(node.id)} position`);
  const rotationDegrees = finiteNumber(data.rotation, 0);
  return {
    id: requireString(node.id, 'Legacy node id'),
    kind: optionalString(node.type) ?? 'custom',
    parentId: optionalString(node.parentId),
    layerId: optionalString(data.layerId) ?? DEFAULT_SCENE_LAYER_ID,
    zIndex: finiteNumber(node.zIndex, 0),
    transform: createTransform2d({
      translation: createPoint2d(finiteNumber(position.x, 0), finiteNumber(position.y, 0)),
      rotationRadians: (rotationDegrees * Math.PI) / 180,
    }),
    size: nodeSize(node, data),
    content: data,
    appearance: {},
    ports: [],
    metadata: {},
    extensions: {},
  };
}

function routeIntent(data: JsonObject): ConnectorRouteIntent {
  let ownership: ConnectorRouteIntent['ownership'] = 'automatic';
  if (data.routingMode === 'manual') {
    ownership = 'manual';
  } else if (data.routingMode === 'import-fixed') {
    ownership = 'imported-fixed';
  }

  const curve = data.curve;
  let kind: ConnectorRouteIntent['kind'] = 'bezier';
  if (curve === 'linear') {
    kind = 'polyline';
  } else if (curve === 'step' || curve === 'smoothstep') {
    kind = 'orthogonal';
  }
  return { kind, ownership };
}

function projectWaypoints(data: JsonObject): readonly { readonly x: number; readonly y: number }[] {
  const input = Array.isArray(data.waypoints) ? data.waypoints : [];
  return input
    .filter(isJsonObject)
    .map((point) => createPoint2d(finiteNumber(point.x, 0), finiteNumber(point.y, 0)));
}

function connectorAppearance(edge: JsonObject, data: JsonObject): JsonObject {
  const style = isJsonObject(edge.style) ? edge.style : {};
  const appearance: Record<string, JsonValue> = {};
  if (typeof style.stroke === 'string') appearance.stroke = style.stroke;
  const strokeWidth = finiteNumber(data.strokeWidth, finiteNumber(style.strokeWidth, 0));
  if (strokeWidth > 0) appearance.strokeWidth = strokeWidth;
  const opacity = finiteNumber(data.opacity, finiteNumber(style.opacity, 1));
  if (opacity !== 1) appearance.opacity = opacity;
  if (typeof style.strokeDasharray === 'string') {
    appearance.strokeDasharray = style.strokeDasharray;
  }
  if (typeof data.dashPattern === 'string') appearance.dashPattern = data.dashPattern;
  if (typeof edge.markerStart === 'string' || isJsonObject(edge.markerStart)) {
    appearance.markerStart = cloneJsonValue(edge.markerStart);
  }
  if (typeof edge.markerEnd === 'string' || isJsonObject(edge.markerEnd)) {
    appearance.markerEnd = cloneJsonValue(edge.markerEnd);
  }
  if (typeof edge.animated === 'boolean') appearance.animated = edge.animated;
  return appearance;
}

const CONNECTOR_SEMANTIC_FIELDS = [
  'condition',
  'archProtocol',
  'archPort',
  'archDirection',
  'classRelation',
  'classRelationLabel',
  'erRelation',
  'erRelationLabel',
  'seqMessageKind',
] as const;

function connectorSemantics(data: JsonObject): JsonObject {
  const semantics: Record<string, JsonValue> = {};
  for (const field of CONNECTOR_SEMANTIC_FIELDS) {
    const value = data[field];
    if (typeof value === 'string') semantics[field] = value;
  }
  if (typeof data.seqMessageOrder === 'number' && Number.isFinite(data.seqMessageOrder)) {
    semantics.seqMessageOrder = Math.max(0, Math.floor(data.seqMessageOrder));
  }
  if (isJsonObject(data.seqFragment)) semantics.seqFragment = cloneJsonValue(data.seqFragment);
  return semantics;
}

function projectConnector(value: JsonValue): SceneConnector {
  const edge = requireRecord(value, 'Legacy edge');
  const data = isJsonObject(edge.data) ? cloneJsonValue(edge.data) : {};
  const label = typeof edge.label === 'string' ? edge.label : null;
  return {
    id: requireString(edge.id, 'Legacy edge id'),
    source: {
      nodeId: requireString(edge.source, 'Legacy edge source'),
      portId: optionalString(edge.sourceHandle),
      anchor: null,
    },
    target: {
      nodeId: requireString(edge.target, 'Legacy edge target'),
      portId: optionalString(edge.targetHandle),
      anchor: null,
    },
    route: routeIntent(data),
    waypoints: projectWaypoints(data),
    labels: label
      ? [
          {
            id: `${String(edge.id)}:label`,
            text: label,
            pathRatio: finiteNumber(data.labelPosition, 0.5),
            offset: createPoint2d(
              finiteNumber(data.labelOffsetX, 0),
              finiteNumber(data.labelOffsetY, 0)
            ),
            metadata: {},
          },
        ]
      : [],
    appearance: connectorAppearance(edge, data),
    semantics: connectorSemantics(data),
    metadata: {},
    extensions: {},
  };
}

function anchorForLegacyHandle(portId: string): ScenePort['anchor'] {
  if (portId === 'top' || portId === 'right' || portId === 'bottom' || portId === 'left') {
    return { kind: 'side', side: portId, ratio: 0.5 };
  }
  return { kind: 'center' };
}

function addReferencedPorts(
  nodes: readonly SceneNode[],
  connectors: readonly SceneConnector[]
): readonly SceneNode[] {
  const portIdsByNode = new Map<string, Set<string>>();
  for (const connector of connectors) {
    for (const endpoint of [connector.source, connector.target]) {
      if (endpoint.portId === null) continue;
      const portIds = portIdsByNode.get(endpoint.nodeId) ?? new Set<string>();
      portIds.add(endpoint.portId);
      portIdsByNode.set(endpoint.nodeId, portIds);
    }
  }

  return nodes.map((node) => {
    const portIds = portIdsByNode.get(node.id);
    if (!portIds) return node;
    return {
      ...node,
      ports: [...portIds].map((portId) => ({
        id: portId,
        anchor: anchorForLegacyHandle(portId),
        accepts: [],
        metadata: {},
      })),
    };
  });
}

export function projectLegacyDocument(
  value: unknown,
  options: LegacyProjectionOptions
): SceneDocumentV1 {
  if (!isJsonObject(value)) throw new TypeError('Legacy document must contain JSON values only.');
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new TypeError('Legacy document must contain nodes and edges arrays.');
  }
  const layers = options.layers?.length
    ? options.layers.map((layer) => ({ ...layer }))
    : [createDefaultSceneLayer()];
  const name =
    typeof value.name === 'string' && value.name.length > 0 ? value.name : 'OpenFlowKit Diagram';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : options.now;
  const connectors = value.edges.map(projectConnector);
  const nodes = addReferencedPorts(value.nodes.map(projectNode), connectors);
  return {
    format: SCENE_DOCUMENT_FORMAT,
    schemaVersion: SCENE_DOCUMENT_VERSION,
    id: options.documentId,
    name,
    createdAt,
    updatedAt: options.now,
    pages: [
      {
        id: options.pageId,
        name: options.pageName ?? name,
        diagramKind: typeof value.diagramType === 'string' ? value.diagramType : 'flowchart',
        layers,
        nodes,
        connectors,
        metadata: {},
        extensions: options.pageExtensions ? cloneJsonValue(options.pageExtensions) : {},
      },
    ],
    metadata: {},
    extensions: { [LEGACY_SNAPSHOT_KEY]: cloneJsonValue(value) },
  };
}

export function restoreLegacyDocumentSnapshot(document: SceneDocumentV1): JsonObject | null {
  const snapshot = document.extensions[LEGACY_SNAPSHOT_KEY];
  return isJsonObject(snapshot) ? cloneJsonValue(snapshot) : null;
}
