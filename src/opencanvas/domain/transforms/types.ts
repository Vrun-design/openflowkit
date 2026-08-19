import type { Bounds2d, Point2d } from '../geometry/types';
import type { SceneNode } from '../document/types';

export type TransformHandle =
  | 'north-west'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'rotate';

export interface TransformSnapshot {
  readonly bounds: Bounds2d;
  readonly nodes: readonly SceneNode[];
}

export interface TransformResult {
  readonly nodes: readonly SceneNode[];
  readonly bounds: Bounds2d;
  readonly snappedX: boolean;
  readonly snappedY: boolean;
}

export interface ResizeTransformInput {
  readonly handle: Exclude<TransformHandle, 'rotate'>;
  readonly pointer: Point2d;
  readonly minimumSize?: number;
  readonly gridSize?: number;
  readonly snap?: boolean;
}
