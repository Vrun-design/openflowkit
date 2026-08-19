import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
import { PixiCanvasTools, PixiConnectorEditBar, type CanvasMode } from './PixiSpikeControls';
import { PixiNodeLayoutBar } from './PixiNodeLayoutBar';
import type { NodeContentLayoutV1 } from '../domain/node-layout/types';

interface PixiSpikeViewportProps {
  readonly mode: CanvasMode;
  readonly unavailableReason: string | null;
  readonly editorBounds: DOMRect | null;
  readonly primaryNodeId: string | null;
  readonly announcement: string;
  readonly selectionStatus: string;
  readonly selectedConnectorId: string | null;
  readonly activeConnectorHandle: ConnectorEditHandle | null;
  readonly nodeLayout: NodeContentLayoutV1 | null;
  readonly nodeLayoutEnabled: boolean;
  readonly onChangeNodeLayout: (layout: NodeContentLayoutV1, label: string) => void;
  readonly onModeChange: (mode: CanvasMode) => void;
  readonly onZoomOut: () => void;
  readonly onZoomIn: () => void;
  readonly onFitView: () => void;
  readonly onCloseEditor: () => void;
  readonly onAddConnectorWaypoint: () => void;
  readonly onRemoveConnectorWaypoint: () => void;
  readonly onResetConnectorRoute: () => void;
  readonly onPointerDown: React.PointerEventHandler<HTMLElement>;
  readonly onPointerMove: React.PointerEventHandler<HTMLElement>;
  readonly onPointerUp: React.PointerEventHandler<HTMLElement>;
  readonly onPointerCancel: React.PointerEventHandler<HTMLElement>;
  readonly onDoubleClick: React.MouseEventHandler<HTMLElement>;
  readonly onWheel: React.WheelEventHandler<HTMLElement>;
  readonly onKeyDown: React.KeyboardEventHandler<HTMLElement>;
}

export const PixiSpikeViewport = forwardRef<HTMLElement, PixiSpikeViewportProps>(
  function PixiSpikeViewport(props, ref): React.JSX.Element {
    return (
      <section
        ref={ref}
        className={`pixi-spike__viewport pixi-spike__viewport--${props.mode}`}
        data-testid="pixi-spike-viewport"
        tabIndex={0}
        aria-label="OpenCanvas diagram. Drag nodes, transform handles, or connector handles. Press E to select the next connector, Insert to add a bend, Delete to remove a selected bend, R to reset its route, arrow keys to nudge, and Command or Control Z to undo."
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
        onPointerCancel={props.onPointerCancel}
        onDoubleClick={props.onDoubleClick}
        onWheel={props.onWheel}
        onKeyDown={props.onKeyDown}
      >
        <PixiCanvasTools
          mode={props.mode}
          onModeChange={props.onModeChange}
          onZoomOut={props.onZoomOut}
          onZoomIn={props.onZoomIn}
          onFitView={props.onFitView}
        />
        {props.selectedConnectorId ? (
          <PixiConnectorEditBar
            connectorId={props.selectedConnectorId}
            activeHandle={props.activeConnectorHandle}
            onAddWaypoint={props.onAddConnectorWaypoint}
            onRemoveWaypoint={props.onRemoveConnectorWaypoint}
            onResetRoute={props.onResetConnectorRoute}
          />
        ) : null}
        {props.nodeLayoutEnabled && props.primaryNodeId && props.nodeLayout ? (
          <PixiNodeLayoutBar
            nodeId={props.primaryNodeId}
            layout={props.nodeLayout}
            onChange={props.onChangeNodeLayout}
          />
        ) : null}
        {props.unavailableReason ? (
          <div className="pixi-spike__fallback" role="alert">
            <span className="pixi-spike__fallback-icon" aria-hidden="true">
              !
            </span>
            <h2>WebGL renderer unavailable</h2>
            <p>{props.unavailableReason} Your existing React Flow workspace remains available.</p>
            <Link to="/canvas">Open current canvas</Link>
          </div>
        ) : null}
        {props.editorBounds && props.primaryNodeId ? (
          <input
            className="pixi-spike__editor"
            style={{
              left: props.editorBounds.x,
              top: props.editorBounds.y,
              width: props.editorBounds.width,
              height: props.editorBounds.height,
            }}
            defaultValue={props.primaryNodeId.replace('node-', 'Service ')}
            aria-label="Edit selected node label"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Enter') props.onCloseEditor();
            }}
            onBlur={props.onCloseEditor}
          />
        ) : null}
        <p className="sr-only" aria-live="polite">
          {props.announcement}
        </p>
        <p className="pixi-spike__selection-count">{props.selectionStatus}</p>
        <p className="pixi-spike__hint">
          {props.selectedConnectorId
            ? 'Drag route anatomy · Insert adds bend · R resets · E cycles routes'
            : 'Drag to move · handles resize/rotate · Alt free · arrows nudge'}
        </p>
      </section>
    );
  }
);
