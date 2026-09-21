import { createTransformSnapshot } from '../../domain/transforms/transformSelection';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import type { CanvasCamera } from '../../domain/camera/types';
import {
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import { worldToScreen, panCamera, zoomCameraAt, normalizeWheelDelta } from '../../domain/camera/camera';
import { detectWebGlCapability } from '../../infrastructure/pixi/capabilities';
import {
  PixiRendererHost,
  type PixiRendererStatus,
} from '../../infrastructure/pixi/PixiRendererHost';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';
import { resolveNodeStyle } from '../../domain/nodes/nodeStyle';
import { resolveConnectorLabelStyle } from '../../domain/connectors/labelStyle';
import { V2ContextBar, contextBarStyle, sameRect, unionScreenBounds } from './V2ContextBar';
import type { ContextMenuTarget } from './V2ContextMenu';
import { useV2Pointer, type StylePresets, type V2GestureApi } from './useV2Pointer';
import { connectorAppearanceWithPatch } from '../../domain/commands/styleConnectors';
import type { V2Tool } from './V2CreationToolbar';
import './openCanvasTextEditorOverlay.css';

export interface V2EditingState {
  readonly nodeId: string;
  readonly bounds: DOMRect;
  readonly value: string;
  readonly isNew: boolean;
  /** Type-to-edit seeds the value: caret goes after it instead of selecting all. */
  readonly caretAtEnd: boolean;
}

interface V2CanvasHostProps {
  readonly page: ScenePage;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly camera: CanvasCamera;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly toolRef: RefObject<V2Tool>;
  readonly tool: V2Tool;
  readonly spacePanRef: RefObject<boolean>;
  readonly readOnlyRef: RefObject<boolean>;
  readonly gestureApiRef: RefObject<V2GestureApi | null>;
  readonly selection: CanvasSelection;
  readonly selectedConnectorId: string | null;
  readonly editing: V2EditingState | null;
  readonly children?: ReactNode;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorId: string | null) => void;
  readonly updateCamera: (camera: CanvasCamera) => void;
  readonly openEditor: (nodeId: string) => void;
  readonly openConnectorEditor: (connectorId: string, at: Point2d) => void;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly mintId: (prefix: string) => string;
  readonly onCommitLabel: (value: string) => void;
  readonly onCancelEdit: () => void;
  readonly connectorEditing: { readonly connectorId: string; readonly bounds: DOMRect; readonly value: string } | null;
  readonly onCommitConnectorLabel: (value: string) => void;
  readonly onCancelConnectorEdit: () => void;
  readonly onStatusChange: (status: PixiRendererStatus) => void;
  readonly sectionRef: RefObject<HTMLElement | null>;
  /** Numeric canvas-ground color from the same token source as SystemRoot. */
  readonly backgroundColor: number;
  readonly readOnly: boolean;
  readonly snapToGrid: boolean;
  readonly showGrid: boolean;
  /** Right-click: the host has already selected the target; the page shows the menu. */
  readonly onContextMenu: (target: ContextMenuTarget) => void;
}

export function V2CanvasHost(props: V2CanvasHostProps): React.JSX.Element {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [capability] = useState(detectWebGlCapability);
  const [status, setStatus] = useState<PixiRendererStatus>(
    capability.supported ? 'initializing' : 'unavailable'
  );
  const [mountError, setMountError] = useState<string | null>(null);

  // No React state per move: the renderer preview goes through refs, and the
  // context bar follows the drag by direct DOM writes. React re-renders only
  // on operation end (commit/selection/camera), when contextAnchor settles.
  const previewFrameRef = useRef<number | null>(null);
  const pendingPreviewRef = useRef<DOMRect | null>(null);
  // Safari trackpad pinch: gesturestart anchors, gesturechange scales from it.
  const pinchRef = useRef<{ zoom: number; anchor: Point2d } | null>(null);
  useEffect(() => () => {
    if (previewFrameRef.current !== null) cancelAnimationFrame(previewFrameRef.current);
  }, []);
  // Latest React-rendered bar anchor; the drag-follow path restores exactly
  // this on operation end when no re-render follows (anchor truly unchanged).
  const anchorForRestoreRef = useRef<DOMRect | null>(null);
  // Sticky defaults live with the host for the session: what you last styled
  // is what the next shape/text/connector gets.
  const stylePresetsRef = useRef<StylePresets>({ shape: {}, text: {}, connector: {} });
  const pointer = useV2Pointer({
    stylePresetsRef,
    hostRef: props.hostRef,
    cameraRef: props.cameraRef,
    pageRef: props.pageRef,
    selectionRef: props.selectionRef,
    toolRef: props.toolRef,
    spacePanRef: props.spacePanRef,
    readOnlyRef: props.readOnlyRef,
    gestureApiRef: props.gestureApiRef,
    commit: props.commit,
    applySelection: props.applySelection,
    applyConnectorSelection: props.applyConnectorSelection,
    updateCamera: props.updateCamera,
    openEditor: props.openEditor,
    openConnectorEditor: props.openConnectorEditor,
    onToolChange: props.onToolChange,
    mintId: props.mintId,
    snapToGrid: props.snapToGrid,
    // Renderer preview is immediate; the context bar follows the drag by
    // direct DOM writes (no setState per move), restored to the React anchor
    // on operation end.
    onTransformPreview: (result) => {
      const bar = props.sectionRef.current?.querySelector<HTMLElement>('[data-context-bar]');
      if (!result) {
        if (previewFrameRef.current !== null) cancelAnimationFrame(previewFrameRef.current);
        previewFrameRef.current = null;
        pendingPreviewRef.current = null;
        if (bar && anchorForRestoreRef.current) {
          const restore = contextBarStyle(anchorForRestoreRef.current);
          if (restore.left !== undefined) bar.style.left = `${restore.left}px`;
          if (restore.top !== undefined) bar.style.top = `${restore.top}px`;
        }
        return;
      }
      const camera = props.cameraRef.current;
      const point = worldToScreen(camera, result.bounds);
      pendingPreviewRef.current = new DOMRect(point.x, point.y,
        result.bounds.width * camera.zoom, result.bounds.height * camera.zoom);
      if (previewFrameRef.current !== null || !bar) return;
      previewFrameRef.current = requestAnimationFrame(() => {
        previewFrameRef.current = null;
        const pending = pendingPreviewRef.current;
        pendingPreviewRef.current = null;
        if (!pending) return;
        const follow = contextBarStyle(pending);
        if (follow.left !== undefined) bar.style.left = `${follow.left}px`;
        if (follow.top !== undefined) bar.style.top = `${follow.top}px`;
      });
    },
  });

  const { cancelGesture } = pointer;
  useEffect(() => {
    cancelGesture();
    const canvas = viewport?.querySelector('canvas');
    if (canvas) canvas.style.cursor = '';
  }, [props.page, props.tool, viewport, cancelGesture]);

  // Browser zoom never leaks from the editor: plain wheel over the canvas
  // pans, ⌘/Ctrl+wheel (pinch) anywhere in the editor is ours, and Safari's
  // proprietary gesture events (trackpad pinch) zoom at the pointer too.
  const { sectionRef, cameraRef, updateCamera } = props;
  useEffect(() => {
    const root = sectionRef.current?.closest<HTMLElement>('.ofk-v2');
    if (!root) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.target instanceof HTMLCanvasElement) event.preventDefault();
    };
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      const gesture = event as unknown as { scale?: unknown; clientX?: unknown; clientY?: unknown };
      const bounds = sectionRef.current?.getBoundingClientRect();
      const anchor = bounds && Number.isFinite(gesture.clientX) && Number.isFinite(gesture.clientY)
        ? { x: (gesture.clientX as number) - bounds.left, y: (gesture.clientY as number) - bounds.top }
        : { x: bounds ? bounds.width / 2 : 0, y: bounds ? bounds.height / 2 : 0 };
      pinchRef.current = { zoom: cameraRef.current.zoom, anchor };
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const started = pinchRef.current;
      const scale = (event as unknown as { scale?: unknown }).scale;
      if (!started || typeof scale !== 'number' || !(scale > 0)) return;
      updateCamera(zoomCameraAt(cameraRef.current, started.anchor, started.zoom * scale));
    };
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      pinchRef.current = null;
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('gesturestart', onGestureStart);
    root.addEventListener('gesturechange', onGestureChange);
    root.addEventListener('gestureend', onGestureEnd);
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('gesturestart', onGestureStart);
      root.removeEventListener('gesturechange', onGestureChange);
      root.removeEventListener('gestureend', onGestureEnd);
    };
  }, [sectionRef, cameraRef, updateCamera]);

  const statusCallbackRef = useRef(props.onStatusChange);
  statusCallbackRef.current = props.onStatusChange;
  useEffect(() => {
    statusCallbackRef.current(status);
  }, [status]);

  useEffect(() => {
    if (!viewport || !capability.supported) return;
    let disposed = false;
    const host = new PixiRendererHost({
      liveTransformPreview: true,
      onStatusChange: (next) => {
        if (!disposed) setStatus(next);
      },
    });
    props.hostRef.current = host;
    host.setBackground(props.backgroundColor);
    host.setDotGrid(props.showGrid);
    host.setCamera(props.cameraRef.current);
    void host
      .mount(viewport)
      .then(() => {
        if (disposed) return;
        const page = props.pageRef.current;
        if (page) host.setPage(page);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setMountError(error instanceof Error ? error.message : 'PixiJS could not start.');
        setStatus('unavailable');
      });
    const observer = new ResizeObserver(() => {
      host.resize();
      setViewportSize(host.getViewportSize());
    });
    observer.observe(viewport);
    return () => {
      disposed = true;
      observer.disconnect();
      host.destroy();
      props.hostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  useEffect(() => { props.hostRef.current?.setDotGrid(props.showGrid); }, [props.showGrid, props.hostRef]);

  useEffect(() => {
    props.hostRef.current?.setBackground(props.backgroundColor);
  }, [props.backgroundColor, props.hostRef]);

  useEffect(() => {
    props.hostRef.current?.setPage(props.page);
    const available = new Set(props.page.nodes.map((node) => node.id));
    const kept = props.selectionRef.current.nodeIds.filter((id) => available.has(id));
    if (kept.length !== props.selectionRef.current.nodeIds.length) {
      props.applySelection(replaceSelection(kept));
    }
    if (
      props.selectedConnectorId &&
      !props.page.connectors.some((connector) => connector.id === props.selectedConnectorId)
    ) {
      props.applyConnectorSelection(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.page]);

  useEffect(() => {
    props.hostRef.current?.setEditingNode(props.editing?.nodeId ?? null);
  }, [props.editing, props.hostRef, props.page, status]);

  useEffect(() => {
    props.hostRef.current?.setEditingConnector(props.connectorEditing?.connectorId ?? null);
  }, [props.connectorEditing, props.hostRef, props.page, status]);

  useEffect(() => {
    props.hostRef.current?.setSelection(props.selection.nodeIds, props.selection.primaryNodeId);
    props.hostRef.current?.setConnectorSelection(props.selectedConnectorId, null);
  }, [props.selection, props.selectedConnectorId, props.hostRef, props.page, status]);

  // Context bar anchor follows selection, page geometry and camera; the state
  // only changes when the union actually moves. A selected connector anchors
  // to its midpoint instead.
  const [contextAnchor, setContextAnchor] = useState<DOMRect | null>(null);
  const selectionIds = props.selection.nodeIds;
  const selectedConnectorId = props.selectedConnectorId;
  useEffect(() => {
    if (props.editing || props.readOnly
      || (selectionIds.length === 0 && !selectedConnectorId)) {
      setContextAnchor(null);
      anchorForRestoreRef.current = null;
      return;
    }
    if (selectionIds.length > 0) {
      const next = unionScreenBounds(
        selectionIds.map((nodeId) => props.hostRef.current?.getNodeScreenBounds(nodeId))
      );
      if (next) anchorForRestoreRef.current = next;
      setContextAnchor((current) => (current && next && sameRect(current, next) ? current : next));
      return;
    }
    const samples = selectedConnectorId
      ? props.hostRef.current?.getConnectorSamples(selectedConnectorId)
      : null;
    const middle = samples?.length
      ? worldToScreen(props.camera, samples[Math.floor(samples.length / 2)])
      : null;
    const next = middle ? new DOMRect(middle.x, middle.y, 1, 1) : null;
    if (next) anchorForRestoreRef.current = next;
    setContextAnchor((current) => (current && next && sameRect(current, next) ? current : next));
  }, [selectionIds, selectedConnectorId, props.editing, props.readOnly, props.hostRef,
    props.camera, props.page, viewportSize]);

  const unavailableReason = mountError ?? capability.reason ?? null;

  // I-12: wheel/trackpad pans; ⌘/Ctrl+wheel (and pinch, which browsers
  // report as ctrlKey) zooms at the pointer — the Figma/tldraw convention.
  function handleWheel(event: ReactWheelEvent<HTMLElement>): void {
    const camera = props.cameraRef.current;
    if (!event.ctrlKey && !event.metaKey) {
      if (event.target instanceof HTMLCanvasElement) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const delta = normalizeWheelDelta(event, { width: bounds.width, height: bounds.height });
        props.updateCamera(panCamera(camera, { x: -delta.x, y: -delta.y }));
      }
      return;
    }
    // Pinch/⌘-wheel zooms from anywhere over the canvas area, including the
    // floating context bar; the browser-zoom listener above already swallowed it.

    const bounds = event.currentTarget.getBoundingClientRect();
    props.updateCamera(zoomCameraAt(
      camera,
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      camera.zoom * Math.exp(-event.deltaY * 0.01)
    ));
  }

  const editingNode = props.editing && props.page.nodes.find((node) => node.id === props.editing?.nodeId);
  const editingStyle = editingNode ? resolveNodeStyle(editingNode) : null;
  const editingConnector = props.connectorEditing
    && props.page.connectors.find((connector) => connector.id === props.connectorEditing?.connectorId);
  const connectorEditingStyle = editingConnector ? resolveConnectorLabelStyle(editingConnector) : null;

  return (
    <section
      ref={props.sectionRef}
      className="ofk-v2-canvas"
      data-testid="v2-canvas"
      tabIndex={0}
      aria-label="Diagram canvas. Press V to select, R for rectangle, O for ellipse, A for connector, T for text. Double-click or press Enter to edit a label."
      onPointerDown={pointer.handlePointerDown}
      onPointerMove={pointer.handlePointerMove}
      onPointerUp={pointer.handlePointerUp}
      onPointerCancel={pointer.handlePointerCancel}
      onDoubleClick={pointer.handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={(event) => {
        const host = props.hostRef.current;
        if (!host || props.editing || props.connectorEditing) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const at = { x: event.clientX, y: event.clientY };
        const nodeId = host.pickNode(point);
        if (nodeId) {
          if (!props.selection.nodeIds.includes(nodeId)) {
            props.applyConnectorSelection(null);
            props.applySelection(replaceSelection([nodeId]));
          }
          props.onContextMenu({ kind: 'nodes', ...at });
          return;
        }
        const connectorId = host.pickConnector(point);
        if (connectorId) {
          props.applySelection(clearSelection());
          props.applyConnectorSelection(connectorId);
          props.onContextMenu({ kind: 'connector', id: connectorId, ...at });
          return;
        }
        props.onContextMenu({ kind: 'canvas', ...at });
      }}
    >
      <div ref={setViewport} className="ofk-v2-viewport" data-testid="v2-viewport" />
      {unavailableReason ? (
        <div className="ofk-v2-fallback" role="alert">
          <h2>WebGL renderer unavailable</h2>
          <p>
            {unavailableReason} Your existing workspace remains available.
          </p>
          <Link to="/canvas">Open current canvas</Link>
        </div>
      ) : null}
      {props.editing && editingStyle ? (
        <OpenCanvasTextEditorOverlay
          bounds={props.editing.bounds}
          value={props.editing.value}
          style={editingStyle}
          zoom={props.camera.zoom}
          selectAll={!props.editing.caretAtEnd}
          onCommit={props.onCommitLabel}
          onCancel={props.onCancelEdit}
        />
      ) : null}
      {props.connectorEditing && connectorEditingStyle && !props.editing ? (
        <OpenCanvasTextEditorOverlay
          bounds={props.connectorEditing.bounds}
          value={props.connectorEditing.value}
          label="Edit connector label"
          zoom={props.camera.zoom}
          style={connectorEditingStyle}
          plate
          onCommit={props.onCommitConnectorLabel}
          onCancel={props.onCancelConnectorEdit}
        />
      ) : null}
      {contextAnchor ? (
        <V2ContextBar
          page={props.page}
          nodeIds={props.selection.nodeIds}
          connectorId={props.selectedConnectorId}
          commit={props.commit}
          onStylePreview={(patch) => {
            if (!patch) { props.hostRef.current?.setTransformPreview(null); return; }
            const snapshot = createTransformSnapshot(props.page, props.selection.nodeIds);
            props.hostRef.current?.setTransformPreview(patch ? {
              nodes: snapshot.nodes.map((node) => ({ ...node, appearance: { ...node.appearance, ...patch } })),
              bounds: snapshot.bounds, snappedX: false, snappedY: false,
            } : null);
          }}
          style={contextBarStyle(contextAnchor)}
          onNodeStyleCommitted={(patch) => {
            const kind = props.selection.nodeIds.every((id) => props.page.nodes.find((node) => node.id === id)?.kind === 'text') ? 'text' : 'shape';
            stylePresetsRef.current[kind] = { ...stylePresetsRef.current[kind], ...patch };
          }}
          onConnectorStyleCommitted={(patch) => {
            stylePresetsRef.current.connector = connectorAppearanceWithPatch(stylePresetsRef.current.connector, patch);
          }}
          onOpenMenu={(x, y) => props.onContextMenu(props.selectedConnectorId
            ? { kind: 'connector', id: props.selectedConnectorId, x, y }
            : { kind: 'nodes', x, y })}
        />
      ) : null}
      {props.children}
      <p className="sr-only" aria-live="polite">
        {props.selection.nodeIds.length === 0 && !props.selectedConnectorId
          ? 'Nothing selected.'
          : props.selectedConnectorId
            ? `Connector ${props.selectedConnectorId} selected.`
            : `${props.selection.nodeIds.length} shapes selected.`}
      </p>
    </section>
  );
}
