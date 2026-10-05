import { useCallback, useState, type RefObject } from 'react';
import { clearSelection, type CanvasSelection } from '../../application/selection/selection';
import { worldToScreen } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { createConnectorEditCommand, setPrimaryConnectorLabel } from '../../domain/connectors/editing';
import type { ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';

export interface V2ConnectorLabelEdit {
  readonly connectorId: string;
  readonly bounds: DOMRect;
  readonly value: string;
}

export interface V2ConnectorLabelEditingOptions {
  readonly pageRef: RefObject<ScenePage | null>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly readOnly: boolean;
  readonly selectedConnectorId: string | null;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (ids: readonly string[]) => void;
  readonly focusCanvas: () => void;
  readonly announce: (message: string) => void;
}

/** The in-place editor for a connector's primary label. */
export function useV2ConnectorLabelEditing(options: V2ConnectorLabelEditingOptions) {
  const {
    pageRef, hostRef, cameraRef, readOnly, selectedConnectorId, commit,
    applySelection, applyConnectorSelection, focusCanvas, announce,
  } = options;
  const [editing, setEditing] = useState<V2ConnectorLabelEdit | null>(null);

  const open = useCallback((connectorId: string, at: Point2d) => {
    const connector = pageRef.current?.connectors.find((candidate) => candidate.id === connectorId);
    if (!connector || readOnly) return;
    applySelection(clearSelection());
    applyConnectorSelection([connectorId]);
    // Sits on the existing label when there is one, else at the click; the
    // box scales with zoom like the plate it replaces.
    const { zoom } = cameraRef.current;
    const labelPoint = (connector.labels[0] && hostRef.current?.getConnectorLabelScreenPoint(connectorId))
      ?? { x: at.x, y: at.y - 14 * zoom };
    setEditing({
      connectorId,
      bounds: new DOMRect(labelPoint.x - 20 * zoom, labelPoint.y - 9 * zoom, 40 * zoom, 18 * zoom),
      value: connector.labels[0]?.text ?? '',
    });
    announce('Editing connector label');
  }, [pageRef, hostRef, cameraRef, readOnly, applySelection, applyConnectorSelection, announce]);

  const commitLabel = useCallback((value: string) => {
    const page = pageRef.current;
    const before = page?.connectors.find((candidate) => candidate.id === editing?.connectorId);
    const command = page && before
      ? createConnectorEditCommand(page.id, before, setPrimaryConnectorLabel(before, value), 'Edit label')
      : null;
    if (command) commit(command);
    setEditing(null);
    focusCanvas();
  }, [pageRef, editing, commit, focusCanvas]);

  const cancel = useCallback(() => {
    setEditing(null);
    focusCanvas();
  }, [focusCanvas]);

  /** F2 / Enter on a selected connector: open on its midpoint. */
  const editSelected = useCallback(() => {
    if (!selectedConnectorId) return;
    const samples = hostRef.current?.getConnectorSamples(selectedConnectorId);
    const middle = samples?.length ? samples[Math.floor(samples.length / 2)] : null;
    if (middle) open(selectedConnectorId, worldToScreen(cameraRef.current, middle));
  }, [selectedConnectorId, hostRef, cameraRef, open]);

  return { editing, open, commit: commitLabel, cancel, editSelected };
}
