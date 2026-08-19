import { areStructurallyEqual } from '../../domain/commands/equality';
import type { SceneConnector, SceneDocumentV1 } from '../../domain/document/types';
import type { ReactFlowProjection } from '../../infrastructure/reactflow/contracts';
import { projectSceneDocumentToReactFlow } from '../../infrastructure/reactflow/toReactFlow';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type {
  BatchDocumentCommand,
  DocumentCommand,
  InsertConnectorCommand,
  RemoveConnectorCommand,
  SetConnectorCommand,
} from '../../domain/commands/types';
import {
  ensureNodeSidePort,
  portAcceptsRole,
  type SidePort,
} from '../../domain/connectors/portAuthoring';
import { assertSemanticConnectorConstraint } from '../../domain/structured/diagramValidation';

export interface ProductionConnectorProjection {
  readonly changed: boolean;
  readonly projection: ReactFlowProjection;
}

function requireEndpointPorts(
  document: SceneDocumentV1,
  pageId: string,
  connector: SceneConnector
): void {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  for (const [role, endpoint] of [['source', connector.source], ['target', connector.target]] as const) {
    if (!endpoint.portId) continue;
    const node = page.nodes.find((candidate) => candidate.id === endpoint.nodeId);
    const port = node?.ports.find((candidate) => candidate.id === endpoint.portId);
    if (!port) throw new RangeError(`Connector ${role} port "${endpoint.portId}" was not found.`);
    if (!portAcceptsRole(port, role)) {
      throw new RangeError(`Connector ${role} port "${endpoint.portId}" does not accept ${role}.`);
    }
  }
}

export function createProductionConnector(
  id: string,
  sourceNodeId: string,
  targetNodeId: string
): SceneConnector {
  if (!id || !sourceNodeId || !targetNodeId) {
    throw new TypeError('Connector id and endpoints must not be empty.');
  }
  return {
    id,
    source: { nodeId: sourceNodeId, portId: null, anchor: null },
    target: { nodeId: targetNodeId, portId: null, anchor: null },
    route: { kind: 'orthogonal', ownership: 'automatic' },
    waypoints: [], labels: [], appearance: {}, semantics: {}, metadata: {}, extensions: {},
  };
}

export function buildProductionInsertConnectorCommand(
  document: SceneDocumentV1,
  pageId: string,
  connector: SceneConnector
): InsertConnectorCommand {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  if (page.connectors.some((candidate) => candidate.id === connector.id)) {
    throw new RangeError(`Connector "${connector.id}" already exists.`);
  }
  const nodeIds = new Set(page.nodes.map((node) => node.id));
  if (!nodeIds.has(connector.source.nodeId) || !nodeIds.has(connector.target.nodeId)) {
    throw new RangeError('Connector endpoint references an unknown node.');
  }
  assertSemanticConnectorConstraint(page,
    page.nodes.find(({ id }) => id === connector.source.nodeId)!,
    page.nodes.find(({ id }) => id === connector.target.nodeId)!);
  requireEndpointPorts(document, pageId, connector);
  return {
    kind: 'insert-connector', id: `insert-connector:${connector.id}`, label: 'Create connector',
    pageId, index: page.connectors.length, connector,
  };
}

export function buildProductionPortConnectorCommand(
  document: SceneDocumentV1,
  pageId: string,
  connectorId: string,
  source: { readonly nodeId: string; readonly side: SidePort },
  target: { readonly nodeId: string; readonly side: SidePort }
): DocumentCommand {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const sourceNode = page.nodes.find((node) => node.id === source.nodeId);
  const targetNode = page.nodes.find((node) => node.id === target.nodeId);
  if (!sourceNode || !targetNode) throw new RangeError('Connector endpoint references an unknown node.');
  assertSemanticConnectorConstraint(page, sourceNode, targetNode);
  const preparedSource = ensureNodeSidePort(sourceNode, source.side, 'source');
  const preparedTarget = ensureNodeSidePort(
    sourceNode.id === targetNode.id ? preparedSource.node : targetNode,
    target.side,
    'target'
  );
  const commands: DocumentCommand[] = [];
  if (sourceNode.id === targetNode.id) {
    if (preparedSource.changed || preparedTarget.changed) commands.push({
      kind: 'set-node', id: `add-loop-ports:${sourceNode.id}`, label: 'Add self-loop ports',
      pageId, before: sourceNode, after: preparedTarget.node,
    });
  } else {
    if (preparedSource.changed) commands.push({
      kind: 'set-node', id: `add-port:${sourceNode.id}:${source.side}`, label: 'Add source port',
      pageId, before: sourceNode, after: preparedSource.node,
    });
    if (preparedTarget.changed) commands.push({
      kind: 'set-node', id: `add-port:${targetNode.id}:${target.side}`, label: 'Add target port',
      pageId, before: targetNode, after: preparedTarget.node,
    });
  }
  const connector = createProductionConnector(connectorId, source.nodeId, target.nodeId);
  commands.push({
    kind: 'insert-connector', id: `insert-connector:${connectorId}`, label: 'Create connector',
    pageId, index: page.connectors.length,
    connector: {
      ...connector,
      source: { ...connector.source, portId: preparedSource.port.id },
      target: { ...connector.target, portId: preparedTarget.port.id },
    },
  });
  if (commands.length === 1) return commands[0];
  return {
    kind: 'batch', id: `connect-ports:${connectorId}`, label: 'Connect node ports', commands,
  } satisfies BatchDocumentCommand;
}

export function buildProductionRemoveConnectorCommand(
  document: SceneDocumentV1,
  pageId: string,
  connectorId: string
): RemoveConnectorCommand {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const index = page.connectors.findIndex((connector) => connector.id === connectorId);
  if (index < 0) throw new RangeError(`Connector "${connectorId}" was not found.`);
  return {
    kind: 'remove-connector', id: `remove-connector:${connectorId}`, label: 'Delete connector',
    pageId, index, connector: page.connectors[index],
  };
}

export function buildProductionConnectorCommand(
  document: SceneDocumentV1,
  pageId: string,
  before: SceneConnector,
  after: SceneConnector
): SetConnectorCommand | null {
  if (before.id !== after.id) throw new TypeError('Connector edit cannot change connector id.');
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const current = page.connectors.find((connector) => connector.id === before.id);
  if (!current) throw new RangeError(`Connector "${before.id}" was not found.`);
  if (!areStructurallyEqual(current, before)) {
    throw new Error(`Connector "${before.id}" changed before the edit could commit.`);
  }
  const nodeIds = new Set(page.nodes.map((node) => node.id));
  if (!nodeIds.has(after.source.nodeId) || !nodeIds.has(after.target.nodeId)) {
    throw new RangeError('Connector endpoint references an unknown node.');
  }
  assertSemanticConnectorConstraint(page,
    page.nodes.find(({ id }) => id === after.source.nodeId)!,
    page.nodes.find(({ id }) => id === after.target.nodeId)!);
  requireEndpointPorts(document, pageId, after);
  if (areStructurallyEqual(before, after)) return null;
  return {
    kind: 'set-connector', id: `edit-connector:${before.id}`, label: 'Edit connector',
    pageId, before, after,
  };
}

export function projectProductionConnectorEdit(
  document: SceneDocumentV1,
  pageId: string,
  before: SceneConnector,
  after: SceneConnector,
  updatedAt: string
): ProductionConnectorProjection {
  const command = buildProductionConnectorCommand(document, pageId, before, after);
  if (!command) {
    return { changed: false, projection: projectSceneDocumentToReactFlow(document, pageId) };
  }
  const nextDocument: SceneDocumentV1 = {
    ...applyDocumentCommand(document, command).document, updatedAt,
  };
  return { changed: true, projection: projectSceneDocumentToReactFlow(nextDocument, pageId) };
}
