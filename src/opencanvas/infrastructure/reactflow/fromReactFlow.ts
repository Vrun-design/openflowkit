import type { FlowEdge, FlowNode } from '@/lib/types';
import { projectLegacyDocument } from '../../domain/document/legacyProjection';
import type { JsonObject } from '../../domain/document/json';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ReactFlowGraph, ReactFlowProjectionContext } from './contracts';
import { normalizeJsonObject } from './jsonNormalization';
import { requireValidSceneDocument } from './validationBoundary';

const TRANSIENT_NODE_FIELDS = ['selected', 'dragging', 'measured', 'positionAbsolute'] as const;
const TRANSIENT_EDGE_FIELDS = ['selected'] as const;

function omitFields(record: JsonObject, fields: readonly string[]): JsonObject {
  const result: Record<string, JsonObject[string]> = { ...record };
  for (const field of fields) delete result[field];
  return result;
}

function normalizeNode(node: FlowNode, index: number): JsonObject {
  return omitFields(normalizeJsonObject(node, `$.nodes[${index}]`), TRANSIENT_NODE_FIELDS);
}

function normalizeEdge(edge: FlowEdge, index: number): JsonObject {
  return omitFields(normalizeJsonObject(edge, `$.edges[${index}]`), TRANSIENT_EDGE_FIELDS);
}

export function projectReactFlowToSceneDocument(
  graph: ReactFlowGraph,
  context: ReactFlowProjectionContext
): SceneDocumentV1 {
  const envelope: Record<string, JsonObject[string]> = {
    version: '1.1',
    name: context.name,
    diagramType: context.diagramType,
    nodes: graph.nodes.map(normalizeNode),
    edges: graph.edges.map(normalizeEdge),
  };
  if (context.createdAt) envelope.createdAt = context.createdAt;

  return requireValidSceneDocument(
    projectLegacyDocument(envelope, {
      documentId: context.documentId,
      pageId: context.pageId,
      pageName: context.pageName,
      now: context.now,
      layers: context.layers,
      pageExtensions: context.pageExtensions,
    })
  );
}
