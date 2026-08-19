import type { Bounds2d, Matrix2d } from '../geometry/types';
import type { SceneConnector, SceneNode, ScenePage } from '../document/types';

export type SceneObjectKind = 'container' | 'connector' | 'node';

export interface IndexedSceneObject {
  readonly id: string;
  readonly kind: SceneObjectKind;
  readonly layerId: string;
  readonly zIndex: number;
  readonly documentOrder: number;
  readonly visible: boolean;
  readonly bounds: Bounds2d;
}

export interface SceneIndex {
  readonly page: ScenePage;
  readonly cellSize: number;
  readonly nodesById: ReadonlyMap<string, SceneNode>;
  readonly connectorsById: ReadonlyMap<string, SceneConnector>;
  readonly worldMatricesByNodeId: ReadonlyMap<string, Matrix2d>;
  readonly objectsByKey: ReadonlyMap<string, IndexedSceneObject>;
  readonly childIdsByParentId: ReadonlyMap<string, readonly string[]>;
  readonly cellKeysToObjectKeys: ReadonlyMap<string, readonly string[]>;
  readonly overflowObjectKeys: ReadonlySet<string>;
}

export interface SceneQueryOptions {
  readonly includeHidden?: boolean;
  readonly kinds?: ReadonlySet<SceneObjectKind>;
}
