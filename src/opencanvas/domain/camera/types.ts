export interface CanvasCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface CameraLimits {
  readonly minZoom: number;
  readonly maxZoom: number;
}
