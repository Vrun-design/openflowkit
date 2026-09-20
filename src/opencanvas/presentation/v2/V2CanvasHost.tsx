import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { CanvasCamera } from '../../domain/camera/types';
import {
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import { PRODUCTION_RENDERER_FAMILY_FLAGS } from '../../application/renderer/rendererFamilyFlags';
import { panCamera, zoomCameraAt } from '../../domain/camera/camera';
import { detectWebGlCapability } from '../../infrastructure/pixi/capabilities';
import {
  PixiRendererHost,
  type PixiRendererStatus,
} from '../../infrastructure/pixi/PixiRendererHost';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';
import { V2ContextBar, contextBarStyle, sameRect, unionScreenBounds } from './V2ContextBar';
import { useV2Pointer, type V2GestureApi } from './useV2Pointer';
import type { V2Tool } from './V2CreationToolbar';
import './openCanvasTextEditorOverlay.css';

export interface V2EditingState {
  readonly nodeId: string;
  readonly bounds: DOMRect;
  readonly value: string;
}

interface V2CanvasHostProps {
  readonly page: ScenePage;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly camera: CanvasCamera;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly toolRef: RefObject<V2Tool>;
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
  readonly onToolChange: (tool: V2Tool) => void;
  readonly mintId: (prefix: string) => string;
  readonly onCommitLabel: (value: string) => void;
  readonly onCancelEdit: () => void;
  readonly onStatusChange: (status: PixiRendererStatus) => void;
  readonly onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  readonly onKeyUp: (event: ReactKeyboardEvent<HTMLElement>) => void;
  readonly sectionRef: RefObject<HTMLElement | null>;
  /** Numeric canvas-ground color from the same token source as SystemRoot. */
  readonly backgroundColor: number;
  readonly readOnly: boolean;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

export function V2CanvasHost(props: V2CanvasHostProps): React.JSX.Element {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [capability] = useState(detectWebGlCapability);
  const [status, setStatus] = useState<PixiRendererStatus>(
    capability.supported ? 'initializing' : 'unavailable'
  );
  const [mountError, setMountError] = useState<string | null>(null);

  const pointer = useV2Pointer({
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
    onToolChange: props.onToolChange,
    mintId: props.mintId,
  });

  const statusCallbackRef = useRef(props.onStatusChange);
  statusCallbackRef.current = props.onStatusChange;
  useEffect(() => {
    statusCallbackRef.current(status);
  }, [status]);

  useEffect(() => {
    if (!viewport || !capability.supported) return;
    let disposed = false;
    const host = new PixiRendererHost({
      ...PRODUCTION_RENDERER_FAMILY_FLAGS,
      onStatusChange: (next) => {
        if (!disposed) setStatus(next);
      },
    });
    props.hostRef.current = host;
    host.setBackground(props.backgroundColor);
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
    const observer = new ResizeObserver(() => host.resize());
    observer.observe(viewport);
    return () => {
      disposed = true;
      observer.disconnect();
      host.destroy();
      props.hostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

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
    props.hostRef.current?.setSelection(props.selection.nodeIds, props.selection.primaryNodeId);
    props.hostRef.current?.setConnectorSelection(props.selectedConnectorId, null);
  }, [props.selection, props.selectedConnectorId, props.hostRef]);

  // Context bar anchor follows selection, page geometry and camera; the state
  // only changes when the union actually moves.
  const [contextAnchor, setContextAnchor] = useState<DOMRect | null>(null);
  const selectionIds = props.selection.nodeIds;
  useEffect(() => {
    if (selectionIds.length === 0 || props.editing || props.readOnly) {
      setContextAnchor(null);
      return;
    }
    const next = unionScreenBounds(
      selectionIds.map((nodeId) => props.hostRef.current?.getNodeScreenBounds(nodeId))
    );
    setContextAnchor((current) => (current && next && sameRect(current, next) ? current : next));
  }, [selectionIds, props.editing, props.readOnly, props.hostRef, props.camera, props.page]);

  const unavailableReason = mountError ?? capability.reason ?? null;

  // I-12: wheel/trackpad pans; ⌘/Ctrl+wheel (and pinch, which browsers
  // report as ctrlKey) zooms at the pointer — the Figma/tldraw convention.
  function handleWheel(event: ReactWheelEvent<HTMLElement>): void {
    const camera = props.cameraRef.current;
    if (!event.ctrlKey && !event.metaKey) {
      props.updateCamera(panCamera(camera, { x: -event.deltaX, y: -event.deltaY }));
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    props.updateCamera(zoomCameraAt(
      camera,
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
      camera.zoom * Math.exp(-event.deltaY * 0.01)
    ));
  }

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
      onKeyDown={props.onKeyDown}
      onKeyUp={props.onKeyUp}
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
      {props.editing ? (
        <OpenCanvasTextEditorOverlay
          bounds={props.editing.bounds}
          value={props.editing.value}
          onCommit={props.onCommitLabel}
          onCancel={props.onCancelEdit}
        />
      ) : null}
      {contextAnchor ? (
        <V2ContextBar
          selectionCount={props.selection.nodeIds.length}
          style={contextBarStyle(contextAnchor)}
          onEditLabel={() => {
            const primary = props.selection.primaryNodeId;
            if (primary) props.openEditor(primary);
          }}
          onDuplicate={props.onDuplicate}
          onDelete={props.onDelete}
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
