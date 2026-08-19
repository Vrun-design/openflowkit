import { createDefaultSceneLayer } from '../../domain/document/defaults';
import {
  SCENE_DOCUMENT_FORMAT,
  SCENE_DOCUMENT_VERSION,
  type SceneConnector,
  type SceneDocumentV1,
  type SceneLayer,
  type SceneNode,
} from '../../domain/document/types';

export function createTestNode(id: string, overrides: Partial<SceneNode> = {}): SceneNode {
  return {
    id,
    kind: 'process',
    parentId: null,
    layerId: 'default',
    zIndex: 0,
    transform: {
      translation: { x: 0, y: 0 },
      rotationRadians: 0,
      scale: { x: 1, y: 1 },
    },
    size: { width: 100, height: 50 },
    content: { label: id },
    appearance: {},
    ports: [],
    metadata: {},
    extensions: {},
    ...overrides,
  };
}

export function createTestConnector(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  overrides: Partial<SceneConnector> = {}
): SceneConnector {
  return {
    id,
    source: { nodeId: sourceNodeId, portId: null, anchor: null },
    target: { nodeId: targetNodeId, portId: null, anchor: null },
    route: { kind: 'direct', ownership: 'automatic' },
    waypoints: [],
    labels: [],
    appearance: {},
    semantics: {},
    metadata: {},
    extensions: {},
    ...overrides,
  };
}

export interface TestDocumentOptions {
  readonly nodes?: readonly SceneNode[];
  readonly connectors?: readonly SceneConnector[];
  readonly layers?: readonly SceneLayer[];
}

export function createTestDocument(options: TestDocumentOptions = {}): SceneDocumentV1 {
  return {
    format: SCENE_DOCUMENT_FORMAT,
    schemaVersion: SCENE_DOCUMENT_VERSION,
    id: 'document-1',
    name: 'Test document',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        diagramKind: 'flowchart',
        layers: options.layers ?? [createDefaultSceneLayer()],
        nodes: options.nodes ?? [],
        connectors: options.connectors ?? [],
        metadata: {},
        extensions: {},
      },
    ],
    metadata: {},
    extensions: {},
  };
}
