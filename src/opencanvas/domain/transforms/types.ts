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
  /** World line the selection snapped to another object on; only set when `objects` was given. */
  readonly guideX?: number | null;
  readonly guideY?: number | null;
}

export interface MoveTransformOptions {
  readonly gridSize?: number;
  readonly snap?: boolean;
  /** World bounds of non-selected nodes to snap against (after the grid). */
  readonly objects?: readonly Bounds2d[];
  readonly objectThreshold?: number;
}

export interface ResizeTransformInput {
  readonly handle: Exclude<TransformHandle, 'rotate'>;
  readonly pointer: Point2d;
  readonly minimumSize?: number;
  readonly gridSize?: number;
  readonly snap?: boolean;
}
