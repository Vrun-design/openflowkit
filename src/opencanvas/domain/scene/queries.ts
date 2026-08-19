import { intersectsBounds, isBounds2d } from '../geometry/bounds';
import type { Bounds2d } from '../geometry/types';
import type { IndexedSceneObject, SceneIndex, SceneObjectKind, SceneQueryOptions } from './types';
import { cellRange, objectKey } from './spatialIndex';

const KIND_ORDER: Record<SceneObjectKind, number> = {
  container: 0,
  connector: 1,
  node: 2,
};

function compareSceneObjects(
  left: IndexedSceneObject,
  right: IndexedSceneObject,
  layerOrder: ReadonlyMap<string, number>
): number {
  return (
    (layerOrder.get(left.layerId) ?? Number.MAX_SAFE_INTEGER) -
      (layerOrder.get(right.layerId) ?? Number.MAX_SAFE_INTEGER) ||
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    left.zIndex - right.zIndex ||
    left.documentOrder - right.documentOrder ||
    left.id.localeCompare(right.id)
  );
}

export function getIndexedSceneObject(
  index: SceneIndex,
  kind: SceneObjectKind,
  id: string
): IndexedSceneObject | null {
  return index.objectsByKey.get(objectKey(kind, id)) ?? null;
}

export function querySceneBounds(
  index: SceneIndex,
  bounds: Bounds2d,
  options: SceneQueryOptions = {}
): readonly IndexedSceneObject[] {
  if (!isBounds2d(bounds))
    throw new RangeError('Scene query bounds must be finite and non-negative.');
  const [minX, minY, maxX, maxY] = cellRange(bounds, index.cellSize);
  const candidateKeys = new Set(index.overflowObjectKeys);
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (const key of index.cellKeysToObjectKeys.get(`${x}:${y}`) ?? []) candidateKeys.add(key);
    }
  }
  const layerOrder = new Map(index.page.layers.map((layer, position) => [layer.id, position]));
  return [...candidateKeys]
    .map((key) => index.objectsByKey.get(key))
    .filter((object): object is IndexedSceneObject => Boolean(object))
    .filter((object) => options.includeHidden === true || object.visible)
    .filter((object) => !options.kinds || options.kinds.has(object.kind))
    .filter((object) => intersectsBounds(object.bounds, bounds))
    .sort((left, right) => compareSceneObjects(left, right, layerOrder));
}

export function getDescendantNodeIds(index: SceneIndex, parentId: string): readonly string[] {
  const descendants: string[] = [];
  const pending = [...(index.childIdsByParentId.get(parentId) ?? [])];
  while (pending.length > 0) {
    const id = pending.shift()!;
    descendants.push(id);
    pending.push(...(index.childIdsByParentId.get(id) ?? []));
  }
  return descendants;
}
