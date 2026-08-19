import React from 'react';
import {
  Focus,
  Hand,
  MousePointer2,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
import type { PixiRendererStatus } from '../infrastructure/pixi/PixiRendererHost';

export type CanvasMode = 'select' | 'pan';

interface PixiSpikeToolbarProps {
  readonly webGlVersion: number;
  readonly nodeCount: number;
  readonly fixtureSizes: readonly number[];
  readonly status: PixiRendererStatus;
  readonly zoom: number;
  readonly onLoadFixture: (count: number) => void;
  readonly onFitView: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly connectorModelEnabled: boolean;
}

export function PixiSpikeToolbar(props: PixiSpikeToolbarProps): React.JSX.Element {
  return (
    <header className="pixi-spike__toolbar">
      <div className="pixi-spike__identity">
        <span className="pixi-spike__mark" aria-hidden="true" />
        <div>
          <h1>OpenCanvas renderer lab</h1>
          <p>
            PixiJS · WebGL {props.webGlVersion || 'unavailable'} ·{' '}
            {props.connectorModelEnabled ? 'canonical connectors' : 'legacy connectors'}
          </p>
        </div>
      </div>
      <div className="pixi-spike__controls" aria-label="Renderer controls">
        <div className="pixi-spike__segmented" aria-label="Fixture size">
          {props.fixtureSizes.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={props.nodeCount === count}
              onClick={() => props.onLoadFixture(count)}
            >
              {count.toLocaleString()} nodes
            </button>
          ))}
        </div>
        <button type="button" className="pixi-spike__button" onClick={props.onFitView}>
          Fit
        </button>
        <div className="pixi-spike__history" aria-label="Transform history">
          <button
            type="button"
            aria-label="Undo transform (Command or Control Z)"
            disabled={!props.canUndo}
            onClick={props.onUndo}
          >
            <Undo2 aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Redo transform (Command or Control Shift Z)"
            disabled={!props.canRedo}
            onClick={props.onRedo}
          >
            <Redo2 aria-hidden="true" />
          </button>
        </div>
        <output
          className={`pixi-spike__status pixi-spike__status--${props.status}`}
          aria-live="polite"
        >
          {props.status.replace('-', ' ')} · {Math.round(props.zoom * 100)}%
        </output>
      </div>
    </header>
  );
}

interface PixiCanvasToolsProps {
  readonly mode: CanvasMode;
  readonly onModeChange: (mode: CanvasMode) => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFitView: () => void;
}

export function PixiCanvasTools(props: PixiCanvasToolsProps): React.JSX.Element {
  return (
    <div className="pixi-spike__canvas-tools" aria-label="Canvas tools">
      <div className="pixi-spike__tool-group">
        <button
          type="button"
          aria-label="Select mode (V)"
          aria-pressed={props.mode === 'select'}
          onClick={() => props.onModeChange('select')}
        >
          <MousePointer2 aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Pan mode (H)"
          aria-pressed={props.mode === 'pan'}
          onClick={() => props.onModeChange('pan')}
        >
          <Hand aria-hidden="true" />
        </button>
      </div>
      <div className="pixi-spike__tool-group">
        <button type="button" aria-label="Zoom out" onClick={props.onZoomOut}>
          <ZoomOut aria-hidden="true" />
        </button>
        <button type="button" aria-label="Fit diagram" onClick={props.onFitView}>
          <Focus aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom in" onClick={props.onZoomIn}>
          <ZoomIn aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface PixiConnectorEditBarProps {
  readonly connectorId: string;
  readonly activeHandle: ConnectorEditHandle | null;
  readonly onAddWaypoint: () => void;
  readonly onRemoveWaypoint: () => void;
  readonly onResetRoute: () => void;
}

export function PixiConnectorEditBar(props: PixiConnectorEditBarProps): React.JSX.Element {
  const canRemove = props.activeHandle?.kind === 'waypoint';
  return (
    <div
      className="pixi-spike__connector-bar"
      aria-label={`Edit ${props.connectorId}`}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <span>{props.connectorId.replace('connector-', 'Route ')}</span>
      <button type="button" onClick={props.onAddWaypoint}>
        <Plus aria-hidden="true" /> Add bend
      </button>
      <button type="button" disabled={!canRemove} onClick={props.onRemoveWaypoint}>
        <Trash2 aria-hidden="true" /> Remove
      </button>
      <button type="button" onClick={props.onResetRoute}>
        <RotateCcw aria-hidden="true" /> Reset route
      </button>
    </div>
  );
}
