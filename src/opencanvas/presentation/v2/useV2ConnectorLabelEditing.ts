import { isJsonObject } from '../../domain/document/json';
import { archModelOfPage } from '../../../dsl/model/model';
import { buildArchRelationCommands } from '../../application/dsl/architectureCommands';
import { useCallback, useState, type RefObject } from 'react';
import { clearSelection, type CanvasSelection } from '../../application/selection/selection';
import { worldToScreen } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { createConnectorEditCommand, setPrimaryConnectorLabel } from '../../domain/connectors/editing';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';

export interface V2ConnectorLabelEdit {
  readonly connectorId: string;
  readonly bounds: DOMRect;
  readonly value: string;
}

export interface V2ConnectorLabelEditingOptions {
  readonly document: SceneDocumentV1 | null;
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
    document, pageRef, hostRef, cameraRef, readOnly, selectedConnectorId, commit,
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
    const relationId = isJsonObject(connector.metadata.model) ? connector.metadata.model.relationId : undefined;
    // The page's own model: another model on another page may hold a relation with this id.
    const relation = (pageRef.current ? archModelOfPage(pageRef.current) : null)?.relations.find((entry) => entry.id === relationId);
    setEditing({
      connectorId,
      bounds: new DOMRect(labelPoint.x - 20 * zoom, labelPoint.y - 9 * zoom, 40 * zoom, 18 * zoom),
      value: relation ? relation.label ?? '' : connector.labels[0]?.text ?? '',
    });
    announce('Editing connector label');
  }, [pageRef, hostRef, cameraRef, readOnly, applySelection, applyConnectorSelection, announce]);

  const commitLabel = useCallback((value: string) => {
    const page = pageRef.current;
    const before = page?.connectors.find((candidate) => candidate.id === editing?.connectorId);
    const relationId = isJsonObject(before?.metadata.model) ? before.metadata.model.relationId : undefined;
    const relation = (page ? archModelOfPage(page) : null)?.relations.find((entry) => entry.id === relationId);
    if (document && relation) {
      const edit = buildArchRelationCommands(document, relation.from, relation.to, value, {relationId: relation.id});
      if (edit) commit({kind: 'batch', id: 'edit-model-relation', label: 'Edit relationship', commands: edit.commands});
    } else {
      const command = page && before
        ? createConnectorEditCommand(page.id, before, setPrimaryConnectorLabel(before, value), 'Edit label')
        : null;
      if (command) commit(command);
    }
    setEditing(null);
    focusCanvas();
  }, [document, pageRef, editing, commit, focusCanvas]);

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
