import type { ActiveCanvasApi, CanvasFitOptions, CanvasViewport } from '@/canvas/activeCanvas';
import type { Bounds2d, Point2d, Size2d } from '../domain/geometry/types';
import type { CanvasCamera } from '../domain/camera/types';
import {
  DEFAULT_CAMERA_LIMITS,
  fitCameraToBounds,
  screenToWorld,
  worldToScreen,
  zoomCameraAt,
} from '../domain/camera/camera';
import { CameraMotionController } from './CameraMotionController';

/** React Flow's zoom-button step, kept so both canvases feel the same. */
const ZOOM_STEP = 1.2;

export interface OpenCanvasSurfaceApiDeps {
  readonly getCamera: () => CanvasCamera;
  /** Applies a camera immediately to the renderer and any overlays. */
  readonly applyCamera: (camera: CanvasCamera) => void;
  readonly getViewportSize: () => Size2d;
  /** Top-left of the surface in client coordinates. */
  readonly getViewportOrigin: () => Point2d;
  readonly getContentBounds: () => Bounds2d | null;
  readonly getNodesWorldBounds: (nodeIds: readonly string[]) => Bounds2d | null;
  readonly prefersReducedMotion?: () => boolean;
  readonly motion?: CameraMotionController;
}

function browserPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Builds the renderer-neutral camera contract on top of a mounted OpenCanvas host. */
export function createOpenCanvasSurfaceApi(deps: OpenCanvasSurfaceApiDeps): ActiveCanvasApi & {
  readonly dispose: () => void;
} {
  const motion = deps.motion ?? new CameraMotionController();
  const reduced = deps.prefersReducedMotion ?? browserPrefersReducedMotion;

  // Repeated zoom clicks chain from where the camera is heading, not from
  // whatever frame the animation happens to be on.
  let target: CanvasCamera | null = null;
  const current = (): CanvasCamera => (motion.running && target ? target : deps.getCamera());

  const moveTo = (camera: CanvasCamera, duration?: number): void => {
    target = camera;
    motion.start(deps.getCamera(), camera, deps.applyCamera, {
      durationMs: duration ?? 0,
      reducedMotion: reduced() || !duration,
    });
  };

  const zoomBy = (factor: number, duration?: number): void => {
    const size = deps.getViewportSize();
    const center = { x: size.width / 2, y: size.height / 2 };
    const from = current();
    moveTo(zoomCameraAt(from, center, from.zoom * factor), duration);
  };

  const fitView = (options: CanvasFitOptions = {}): void => {
    const bounds = options.nodes
      ? deps.getNodesWorldBounds(options.nodes.map(({ id }) => id))
      : deps.getContentBounds();
    if (!bounds) return;
    const size = deps.getViewportSize();
    // React Flow padding is a viewport fraction; the camera fit wants pixels.
    const padding = (options.padding ?? 0.1) * Math.min(size.width, size.height) / 2;
    const limits = {
      minZoom: options.minZoom ?? DEFAULT_CAMERA_LIMITS.minZoom,
      maxZoom: options.maxZoom ?? DEFAULT_CAMERA_LIMITS.maxZoom,
    };
    moveTo(fitCameraToBounds(bounds, size, padding, limits), options.duration);
  };

  return {
    fitView,
    zoomIn: (options) => zoomBy(ZOOM_STEP, options?.duration),
    zoomOut: (options) => zoomBy(1 / ZOOM_STEP, options?.duration),
    getViewport: () => current(),
    setViewport: (viewport: CanvasViewport, options) => moveTo(viewport, options?.duration),
    screenToFlowPosition: (position) => {
      const origin = deps.getViewportOrigin();
      return screenToWorld(deps.getCamera(), {
        x: position.x - origin.x,
        y: position.y - origin.y,
      });
    },
    flowToScreenPosition: (position) => {
      const origin = deps.getViewportOrigin();
      const screen = worldToScreen(deps.getCamera(), position);
      return { x: screen.x + origin.x, y: screen.y + origin.y };
    },
    dispose: () => motion.cancel(),
  };
}
