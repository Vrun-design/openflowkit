import type { FlowEdge, FlowNode } from '@/lib/types';
import { DEFAULT_SCENE_LAYER_ID } from '../../domain/document/defaults';
import {
  projectLegacyDocument,
  restoreLegacyDocumentSnapshot,
} from '../../domain/document/legacyProjection';
import {
  cloneJsonValue,
  isJsonObject,
  type JsonObject,
  type JsonValue,
} from '../../domain/document/json';
import type {
  ConnectorRouteIntent,
  SceneConnector,
  SceneDocumentV1,
  SceneNode,
  ScenePage,
} from '../../domain/document/types';
import type { ReactFlowProjection } from './contracts';
import { requireValidSceneDocument } from './validationBoundary';

function jsonEquals(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((value, index) => jsonEquals(value, right[index]))
    );
  }
  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => key in right && jsonEquals(left[key], right[key]))
    );
  }
  return false;
}

function recordsById(value: JsonValue | undefined): Map<string, JsonObject> {
  if (!Array.isArray(value)) return new Map();
  return new Map(
    value
      .filter(isJsonObject)
      .filter((record) => typeof record.id === 'string')
      .map((record) => [record.id as string, record])
  );
}

function mutableRecord(value: JsonValue | undefined): Record<string, JsonValue> {
  return isJsonObject(value) ? { ...cloneJsonValue(value) } : {};
}

function setOptionalString(
  record: Record<string, JsonValue>,
  key: string,
  value: string | null
): void {
  if (value === null) delete record[key];
  else record[key] = value;
}

function writeDimension(
  record: Record<string, JsonValue>,
  data: Record<string, JsonValue>,
  key: 'width' | 'height',
  value: number
): void {
  if (typeof record[key] === 'number') {
    record[key] = value;
    return;
  }
  const style = mutableRecord(record.style);
  if (typeof style[key] === 'number') {
    style[key] = value;
    record.style = style;
    return;
  }
  if (typeof data[key] === 'number') {
    data[key] = value;
    return;
  }
  style[key] = value;
  record.style = style;
}

function createNewNode(node: SceneNode): Record<string, JsonValue> {
  const data: Record<string, JsonValue> = { ...cloneJsonValue(node.content) };
  if (node.layerId !== DEFAULT_SCENE_LAYER_ID) data.layerId = node.layerId;
  if (node.transform.rotationRadians !== 0) {
    data.rotation = (node.transform.rotationRadians * 180) / Math.PI;
  }
  const record: Record<string, JsonValue> = {
    id: node.id,
    type: node.kind,
    position: { x: node.transform.translation.x, y: node.transform.translation.y },
    data,
  };
  if (node.parentId !== null) record.parentId = node.parentId;
  if (node.zIndex !== 0) record.zIndex = node.zIndex;
  if (node.size.width !== 0 || node.size.height !== 0) {
    record.style = { width: node.size.width, height: node.size.height };
  }
  return record;
}

function projectNode(
  node: SceneNode,
  baseline: SceneNode | undefined,
  original: JsonObject | undefined
): JsonObject {
  if (!baseline || !original) return createNewNode(node);
  const record = mutableRecord(original);
  if (node.kind !== baseline.kind) record.type = node.kind;
  if (!jsonEquals(node.transform.translation, baseline.transform.translation)) {
    record.position = { x: node.transform.translation.x, y: node.transform.translation.y };
  }
  if (node.parentId !== baseline.parentId) setOptionalString(record, 'parentId', node.parentId);
  if (node.zIndex !== baseline.zIndex) {
    if (node.zIndex === 0) delete record.zIndex;
    else record.zIndex = node.zIndex;
  }

  const contentChanged = !jsonEquals(node.content, baseline.content);
  const data = contentChanged
    ? mutableRecord(node.content)
    : mutableRecord(isJsonObject(record.data) ? record.data : {});
  if (node.layerId !== baseline.layerId) data.layerId = node.layerId;
  if (node.transform.rotationRadians !== baseline.transform.rotationRadians) {
    data.rotation = (node.transform.rotationRadians * 180) / Math.PI;
  }
  if (node.size.width !== baseline.size.width)
    writeDimension(record, data, 'width', node.size.width);
  if (node.size.height !== baseline.size.height)
    writeDimension(record, data, 'height', node.size.height);
  if (
    contentChanged ||
    node.layerId !== baseline.layerId ||
    node.transform.rotationRadians !== baseline.transform.rotationRadians ||
    node.size.width !== baseline.size.width ||
    node.size.height !== baseline.size.height
  ) {
    record.data = data;
  }
  return record;
}

function legacyCurve(route: ConnectorRouteIntent): string {
  if (route.kind === 'orthogonal') return 'smoothstep';
  if (route.kind === 'direct' || route.kind === 'polyline') return 'linear';
  return 'basis';
}

function legacyRoutingMode(route: ConnectorRouteIntent): string {
  if (route.ownership === 'imported-fixed') return 'import-fixed';
  if (route.ownership === 'manual' || route.ownership === 'hybrid') return 'manual';
  return 'auto';
}

function createNewConnector(connector: SceneConnector): Record<string, JsonValue> {
  const data: Record<string, JsonValue> = {
    routingMode: legacyRoutingMode(connector.route),
    curve: legacyCurve(connector.route),
  };
  if (connector.waypoints.length > 0) {
    data.waypoints = connector.waypoints.map((point) => ({ x: point.x, y: point.y }));
  }
  const label = connector.labels[0];
  if (label) {
    data.labelPosition = label.pathRatio;
    data.labelOffsetX = label.offset.x;
    data.labelOffsetY = label.offset.y;
  }
  const record: Record<string, JsonValue> = {
    id: connector.id,
    source: connector.source.nodeId,
    target: connector.target.nodeId,
    data,
  };
  if (connector.source.portId !== null) record.sourceHandle = connector.source.portId;
  if (connector.target.portId !== null) record.targetHandle = connector.target.portId;
  if (label) record.label = label.text;
  return record;
}

function projectConnector(
  connector: SceneConnector,
  baseline: SceneConnector | undefined,
  original: JsonObject | undefined
): JsonObject {
  if (!baseline || !original) return createNewConnector(connector);
  const record = mutableRecord(original);
  if (connector.source.nodeId !== baseline.source.nodeId) record.source = connector.source.nodeId;
  if (connector.target.nodeId !== baseline.target.nodeId) record.target = connector.target.nodeId;
  if (connector.source.portId !== baseline.source.portId) {
    setOptionalString(record, 'sourceHandle', connector.source.portId);
  }
  if (connector.target.portId !== baseline.target.portId) {
    setOptionalString(record, 'targetHandle', connector.target.portId);
  }

  const data = mutableRecord(record.data);
  let dataChanged = false;
  if (!jsonEquals(connector.route, baseline.route)) {
    data.routingMode = legacyRoutingMode(connector.route);
    data.curve = legacyCurve(connector.route);
    dataChanged = true;
  }
  if (!jsonEquals(connector.waypoints, baseline.waypoints)) {
    if (connector.waypoints.length === 0) delete data.waypoints;
    else data.waypoints = connector.waypoints.map((point) => ({ x: point.x, y: point.y }));
    dataChanged = true;
  }
  if (!jsonEquals(connector.labels, baseline.labels)) {
    const label = connector.labels[0];
    if (!label) {
      delete record.label;
      delete data.labelPosition;
      delete data.labelOffsetX;
      delete data.labelOffsetY;
    } else {
      record.label = label.text;
      data.labelPosition = label.pathRatio;
      data.labelOffsetX = label.offset.x;
      data.labelOffsetY = label.offset.y;
    }
    dataChanged = true;
  }
  if (dataChanged) record.data = data;
  return record;
}

function selectPage(document: SceneDocumentV1, pageId?: string): ScenePage {
  const page = pageId
    ? document.pages.find((candidate) => candidate.id === pageId)
    : document.pages[0];
  if (!page) throw new RangeError(`OpenCanvas page "${pageId ?? '(first)'}" was not found.`);
  return page;
}

export function projectSceneDocumentToReactFlow(
  document: SceneDocumentV1,
  pageId?: string
): ReactFlowProjection {
  const validDocument = requireValidSceneDocument(document);
  const page = selectPage(validDocument, pageId);
  const snapshot = restoreLegacyDocumentSnapshot(validDocument);
  const baselineDocument = snapshot
    ? projectLegacyDocument(snapshot, {
        documentId: validDocument.id,
        pageId: page.id,
        now: validDocument.updatedAt,
        layers: page.layers,
      })
    : null;
  const baselinePage = baselineDocument?.pages[0];
  const baselineNodes = new Map(baselinePage?.nodes.map((node) => [node.id, node]) ?? []);
  const baselineConnectors = new Map(
    baselinePage?.connectors.map((connector) => [connector.id, connector]) ?? []
  );
  const originalNodes = recordsById(snapshot?.nodes);
  const originalEdges = recordsById(snapshot?.edges);

  const nodes = page.nodes.map((node) =>
    projectNode(node, baselineNodes.get(node.id), originalNodes.get(node.id))
  );
  const edges = page.connectors.map((connector) =>
    projectConnector(
      connector,
      baselineConnectors.get(connector.id),
      originalEdges.get(connector.id)
    )
  );
  const envelope = snapshot ? mutableRecord(snapshot) : {};
  if (!baselineDocument || validDocument.name !== baselineDocument.name) {
    envelope.name = validDocument.name;
  }
  if (!baselineDocument || validDocument.createdAt !== baselineDocument.createdAt) {
    envelope.createdAt = validDocument.createdAt;
  }
  if (!baselinePage || page.diagramKind !== baselinePage.diagramKind) {
    envelope.diagramType = page.diagramKind;
  }
  envelope.nodes = nodes;
  envelope.edges = edges;

  return {
    nodes: nodes as unknown as FlowNode[],
    edges: edges as unknown as FlowEdge[],
    envelope,
    diagramType: page.diagramKind,
    layers: page.layers,
    pageExtensions: page.extensions,
  };
}
