import { boundsFromPoints, createBounds2d } from '../geometry/bounds';
import { requireFiniteNumber } from '../geometry/finite';
import type { Bounds2d } from '../geometry/types';
import { DEFAULT_SCENE_LAYER_ID } from '../document/defaults';
import type { SceneConnector, SceneNode, ScenePage } from '../document/types';
import { validateSceneDocumentV1 } from '../document/validation';
import type { IndexedSceneObject, SceneIndex, SceneObjectKind } from './types';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from './worldGeometry';

const DEFAULT_CELL_SIZE = 256;
const MAX_CELLS_PER_OBJECT = 4_096;
const CONTAINER_KINDS = new Set(['group', 'section', 'swimlane']);

function objectKey(kind: SceneObjectKind, id: string): string {
  return `${kind}:${id}`;
}

function nodeKind(node: SceneNode): SceneObjectKind {
  return CONTAINER_KINDS.has(node.kind) ? 'container' : 'node';
}

function connectorBounds(
  connector: SceneConnector,
  nodesById: ReadonlyMap<string, SceneNode>,
  worldMatricesByNodeId: SceneIndex['worldMatricesByNodeId']
): Bounds2d {
  const source = nodesById.get(connector.source.nodeId);
  const target = nodesById.get(connector.target.nodeId);
  if (!source || !target) return createBounds2d(0, 0, 0, 0);
  const sourceMatrix = worldMatricesByNodeId.get(source.id);
  const targetMatrix = worldMatricesByNodeId.get(target.id);
  if (!sourceMatrix || !targetMatrix) return createBounds2d(0, 0, 0, 0);
  return (
    boundsFromPoints([
      nodeWorldCenter(source, sourceMatrix),
      ...connector.waypoints,
      nodeWorldCenter(target, targetMatrix),
    ]) ?? createBounds2d(0, 0, 0, 0)
  );
}

function cellRange(bounds: Bounds2d, cellSize: number): readonly [number, number, number, number] {
  return [
    Math.floor(bounds.x / cellSize),
    Math.floor(bounds.y / cellSize),
    Math.floor((bounds.x + bounds.width) / cellSize),
    Math.floor((bounds.y + bounds.height) / cellSize),
  ];
}

function addToCells(
  object: IndexedSceneObject,
  cellSize: number,
  mutableCells: Map<string, string[]>,
  overflowObjectKeys: Set<string>
): void {
  const key = objectKey(object.kind, object.id);
  const [minX, minY, maxX, maxY] = cellRange(object.bounds, cellSize);
  const cellCount = (maxX - minX + 1) * (maxY - minY + 1);
  if (cellCount > MAX_CELLS_PER_OBJECT) {
    overflowObjectKeys.add(key);
    return;
  }
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const cellKey = `${x}:${y}`;
      const keys = mutableCells.get(cellKey) ?? [];
      keys.push(key);
      mutableCells.set(cellKey, keys);
    }
  }
}

function assertPageValid(page: ScenePage): void {
  const shell = {
    format: 'openflowkit.scene',
    schemaVersion: 1,
    id: 'scene-index-validation',
    name: 'Scene index validation',
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    pages: [page],
    metadata: {},
    extensions: {},
  };
  const result = validateSceneDocumentV1(shell);
  if (result.success === false) {
    throw new TypeError(
      `Cannot index invalid scene page: ${result.issues[0].path} ${result.issues[0].message}`
    );
  }
}

export function createSceneIndex(page: ScenePage, cellSize = DEFAULT_CELL_SIZE): SceneIndex {
  assertPageValid(page);
  const safeCellSize = requireFiniteNumber(cellSize, 'sceneIndex.cellSize');
  if (safeCellSize <= 0) throw new RangeError('Scene index cell size must be greater than zero.');

  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const connectorsById = new Map(page.connectors.map((connector) => [connector.id, connector]));
  const worldMatricesByNodeId = buildNodeWorldMatrices(page);
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const objectsByKey = new Map<string, IndexedSceneObject>();
  const childIdsByParentId = new Map<string, string[]>();
  const mutableCells = new Map<string, string[]>();
  const overflowObjectKeys = new Set<string>();

  page.nodes.forEach((node, documentOrder) => {
    const kind = nodeKind(node);
    const layer = layerById.get(node.layerId);
    const object: IndexedSceneObject = {
      id: node.id,
      kind,
      layerId: node.layerId,
      zIndex: node.zIndex,
      documentOrder,
      visible: layer?.visible ?? false,
      bounds: nodeWorldBounds(node, worldMatricesByNodeId.get(node.id)!),
    };
    objectsByKey.set(objectKey(kind, node.id), object);
    addToCells(object, safeCellSize, mutableCells, overflowObjectKeys);
    if (node.parentId !== null) {
      const childIds = childIdsByParentId.get(node.parentId) ?? [];
      childIds.push(node.id);
      childIdsByParentId.set(node.parentId, childIds);
    }
  });

  page.connectors.forEach((connector, documentOrder) => {
    const source = nodesById.get(connector.source.nodeId);
    const target = nodesById.get(connector.target.nodeId);
    const layerId = source?.layerId ?? target?.layerId ?? DEFAULT_SCENE_LAYER_ID;
    const object: IndexedSceneObject = {
      id: connector.id,
      kind: 'connector',
      layerId,
      zIndex: 0,
      documentOrder,
      visible:
        (source ? layerById.get(source.layerId)?.visible === true : false) &&
        (target ? layerById.get(target.layerId)?.visible === true : false),
      bounds: connectorBounds(connector, nodesById, worldMatricesByNodeId),
    };
    objectsByKey.set(objectKey('connector', connector.id), object);
    addToCells(object, safeCellSize, mutableCells, overflowObjectKeys);
  });

  return {
    page,
    cellSize: safeCellSize,
    nodesById,
    connectorsById,
    worldMatricesByNodeId,
    objectsByKey,
    childIdsByParentId,
    cellKeysToObjectKeys: mutableCells,
    overflowObjectKeys,
  };
}

export { cellRange, objectKey };
