import { createDefaultSceneLayer, createDefaultRouteIntent } from '../../domain/document/defaults';
import type { JsonObject } from '../../domain/document/json';
import { SCENE_DOCUMENT_FORMAT, SCENE_DOCUMENT_VERSION, type SceneDocumentV1 } from '../../domain/document/types';
import { validateSceneDocumentV1 } from '../../domain/document/validation';

const MAX_CANONICAL_JSON_BYTES = 10 * 1024 * 1024;

export interface CanonicalImportResult {
  readonly document: SceneDocumentV1;
  readonly sourceVersion: number;
  readonly migrations: readonly string[];
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Canonical JSON root must be an object.');
  return value as Record<string, unknown>;
}

function jsonObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function migrateV0(source: Record<string, unknown>): Record<string, unknown> {
  const pages = Array.isArray(source.pages) ? source.pages.map((rawPage) => {
    const page = record(rawPage);
    const layers = Array.isArray(page.layers) && page.layers.length > 0
      ? page.layers : [createDefaultSceneLayer()];
    const nodes = Array.isArray(page.nodes) ? page.nodes.map((rawNode) => {
      const node = record(rawNode);
      return { ...node, parentId: typeof node.parentId === 'string' ? node.parentId : null,
        layerId: typeof node.layerId === 'string' ? node.layerId : 'default',
        zIndex: typeof node.zIndex === 'number' ? node.zIndex : 0,
        content: jsonObject(node.content), appearance: jsonObject(node.appearance),
        ports: Array.isArray(node.ports) ? node.ports : [], metadata: jsonObject(node.metadata),
        extensions: jsonObject(node.extensions) };
    }) : [];
    const connectors = Array.isArray(page.connectors) ? page.connectors.map((rawConnector) => {
      const connector = record(rawConnector);
      const endpoint = (raw: unknown) => {
        const value = record(raw);
        return { nodeId: value.nodeId, portId: typeof value.portId === 'string' ? value.portId : null,
          anchor: value.anchor ?? null };
      };
      return { ...connector, source: endpoint(connector.source), target: endpoint(connector.target),
        route: connector.route ?? createDefaultRouteIntent(),
        waypoints: Array.isArray(connector.waypoints) ? connector.waypoints : [],
        labels: Array.isArray(connector.labels) ? connector.labels : [],
        appearance: jsonObject(connector.appearance), semantics: jsonObject(connector.semantics),
        metadata: jsonObject(connector.metadata), extensions: jsonObject(connector.extensions) };
    }) : [];
    return { ...page, diagramKind: typeof page.diagramKind === 'string' ? page.diagramKind : 'flowchart',
      layers, nodes, connectors, metadata: jsonObject(page.metadata), extensions: jsonObject(page.extensions) };
  }) : [];
  return { ...source, format: SCENE_DOCUMENT_FORMAT, schemaVersion: SCENE_DOCUMENT_VERSION,
    metadata: jsonObject(source.metadata), extensions: jsonObject(source.extensions), pages };
}

export function importCanonicalJson(source: string | unknown): CanonicalImportResult {
  if (typeof source === 'string' && new TextEncoder().encode(source).byteLength > MAX_CANONICAL_JSON_BYTES) {
    throw new TypeError('Canonical JSON exceeds the 10 MB safety limit.');
  }
  const parsed = typeof source === 'string' ? JSON.parse(source) as unknown : structuredClone(source);
  const root = record(parsed);
  if (root.format !== SCENE_DOCUMENT_FORMAT) throw new TypeError(`Expected canonical format "${SCENE_DOCUMENT_FORMAT}".`);
  const version = root.schemaVersion;
  if (!Number.isSafeInteger(version) || (version as number) < 0) throw new TypeError('Canonical schema version is invalid.');
  if ((version as number) > SCENE_DOCUMENT_VERSION) throw new TypeError(`Canonical schema version ${version} is newer than supported version ${SCENE_DOCUMENT_VERSION}.`);
  const migrations: string[] = [];
  let candidate = root;
  if (version === 0) {
    candidate = migrateV0(root);
    migrations.push('v0-to-v1-default-portable-fields');
  }
  const validation = validateSceneDocumentV1(candidate);
  if (validation.success === false) {
    const first = validation.issues[0];
    throw new TypeError(`Canonical document is invalid at ${first.path}: ${first.message}`);
  }
  return { document: structuredClone(validation.document), sourceVersion: version as number, migrations };
}

export function serializeCanonicalJson(document: SceneDocumentV1): string {
  const validation = validateSceneDocumentV1(document);
  if (validation.success === false) throw new TypeError('Cannot serialize an invalid canonical document.');
  return JSON.stringify(document, null, 2) + '\n';
}
