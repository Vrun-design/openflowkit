export interface Point2d {
  readonly x: number;
  readonly y: number;
}

export interface Vector2d {
  readonly x: number;
  readonly y: number;
}

export interface Size2d {
  readonly width: number;
  readonly height: number;
}

export interface Bounds2d extends Point2d, Size2d {}

/**
 * Renderer-neutral affine matrix using the conventional 2D layout:
 *
 * x' = a*x + c*y + tx
 * y' = b*x + d*y + ty
 */
export interface Matrix2d {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly tx: number;
  readonly ty: number;
}

/** Scale is applied first, followed by rotation and translation. */
export interface Transform2d {
  readonly translation: Point2d;
  readonly rotationRadians: number;
  readonly scale: Vector2d;
}
