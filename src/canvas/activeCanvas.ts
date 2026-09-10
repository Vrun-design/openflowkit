import { useSyncExternalStore } from 'react';
import { useReactFlow, useViewport } from '@/lib/reactflowCompat';

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface CanvasViewport extends CanvasPoint {
  readonly zoom: number;
}

export interface CanvasFitOptions {
  readonly duration?: number;
  /** Fraction of the viewport kept clear around the content, React Flow style. */
  readonly padding?: number;
  /** Fit only these objects instead of the whole page. */
  readonly nodes?: Array<{ id: string }>;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

export interface CanvasMotionOptions {
  readonly duration?: number;
}

/**
 * Renderer-neutral camera and coordinate contract every piece of editor
 * chrome uses. React Flow provides it by default; a mounted OpenCanvas
 * surface registers its own so toolbar, menus, shortcuts, and insertion
 * act on whichever canvas is actually visible.
 */
export interface ActiveCanvasApi {
  readonly fitView: (options?: CanvasFitOptions) => void;
  readonly zoomIn: (options?: CanvasMotionOptions) => void;
  readonly zoomOut: (options?: CanvasMotionOptions) => void;
  readonly getViewport: () => CanvasViewport;
  readonly setViewport: (viewport: CanvasViewport, options?: CanvasMotionOptions) => void;
  /** Client (window) coordinates to document coordinates. */
  readonly screenToFlowPosition: (position: CanvasPoint) => CanvasPoint;
  /** Document coordinates to client (window) coordinates. */
  readonly flowToScreenPosition: (position: CanvasPoint) => CanvasPoint;
}

interface ActiveCanvasState {
  readonly api: ActiveCanvasApi | null;
  readonly viewport: CanvasViewport | null;
}

let state: ActiveCanvasState = { api: null, viewport: null };
const listeners = new Set<() => void>();

function emit(next: ActiveCanvasState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Registers the visible non-React-Flow canvas; returns its unregister. */
export function registerActiveCanvas(api: ActiveCanvasApi): () => void {
  emit({ api, viewport: api.getViewport() });
  return () => {
    if (state.api === api) emit({ api: null, viewport: null });
  };
}

/** Lets the registered canvas publish camera changes for chrome like zoom readouts. */
export function publishActiveCanvasViewport(viewport: CanvasViewport): void {
  if (state.api) emit({ ...state, viewport });
}

export function getActiveCanvasApi(): ActiveCanvasApi | null {
  return state.api;
}

/** Test-only reset. */
export function resetActiveCanvasForTests(): void {
  emit({ api: null, viewport: null });
}

/** The canvas the user can see: the registered OpenCanvas surface or React Flow. */
export function useActiveCanvas(): ActiveCanvasApi {
  const registered = useSyncExternalStore(subscribe, () => state.api);
  const reactFlow = useReactFlow();
  return registered ?? reactFlow;
}

/** True while a non-React-Flow canvas (OpenCanvas) is the visible one. */
export function useIsOpenCanvasActive(): boolean {
  return useSyncExternalStore(subscribe, () => state.api !== null);
}

/** Live viewport of the visible canvas. */
export function useActiveCanvasViewport(): CanvasViewport {
  const registered = useSyncExternalStore(subscribe, () => state.viewport);
  const reactFlow = useViewport();
  return registered ?? reactFlow;
}
