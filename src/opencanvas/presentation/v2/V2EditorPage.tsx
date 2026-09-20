import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  clearSelection,
  replaceSelection,
  toggleSelection,
} from '../../application/selection/selection';
import { useDocumentSession } from '../../application/session/useDocumentSession';
import type { PixiRendererHost, PixiRendererStatus } from '../../infrastructure/pixi/PixiRendererHost';
import { createV2Repository } from '../../../services/storage/v2/v2Repository';
import { SystemRoot, ToastRegion, type ToastItem } from '../design-system';
import { V2CanvasHost } from './V2CanvasHost';
import { V2Chrome } from './V2Chrome';
import type { V2Tool } from './V2CreationToolbar';
import { V2LoadCenter } from './V2LoadCenter';
import { V2TreePanel } from './V2TreePanel';
import { useV2Appearance } from './useV2Appearance';
import { useV2Autosave } from './useV2Autosave';
import { useV2Camera } from './useV2Camera';
import { useV2DocumentLoad } from './useV2DocumentLoad';
import { useV2EditActions } from './useV2EditActions';
import { useV2Keyboard } from './useV2Keyboard';
import { useV2LabelEditing } from './useV2LabelEditing';
import { useV2Selection } from './useV2Selection';
import { useV2TestApi } from './useV2TestApi';
import type { V2GestureApi } from './useV2Pointer';
import { firstV2Page, mintV2Id } from './v2Document';
import { downloadTextFile } from './v2Export';
import type { ScenePage } from '../../domain/document/types';
import './v2EditorPage.css';

export function V2EditorPage(): React.JSX.Element {
  const { id } = useParams();
  const appearance = useV2Appearance();
  const repository = useMemo(
    () => createV2Repository(typeof window === 'undefined' ? null : window.indexedDB),
    []
  );
  const hostRef = useRef<PixiRendererHost | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const gestureApiRef = useRef<V2GestureApi | null>(null);
  const [tool, setTool] = useState<V2Tool>('select');
  const [spacePan, setSpacePan] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [rendererStatus, setRendererStatus] = useState<PixiRendererStatus>('initializing');

  const toolRef = useRef(tool);
  const spacePanRef = useRef(spacePan);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { spacePanRef.current = spacePan; }, [spacePan]);

  const pushToast = useCallback((toast: ToastItem) => {
    setToasts((current) => [...current.slice(-3), toast]);
  }, []);

  const camera = useV2Camera(hostRef);
  const reloadRef = useRef<() => void>(() => undefined);
  const session = useDocumentSession(useMemo(() => ({
    onStaleRevision: () => {
      // Event context (a second tab won the write race), not render:
      // announce, reset first-open fit, and reload from the repository.
      camera.resetFit();
      setAnnouncement('Another tab changed this document. Reloading.');
      reloadRef.current();
    },
    // camera callbacks are stable and fittedRef persists across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []));
  const selectionApi = useV2Selection();
  const {
    selection, selectionRef, selectedConnectorId, applySelection, applyConnectorSelection,
  } = selectionApi;
  const page = session.document ? firstV2Page(session.document) : null;
  const pageRef = useRef<ScenePage | null>(null);
  const labelEditing = useV2LabelEditing({
    hostRef,
    page,
    camera: camera.camera,
    commit: session.commit,
    announce: setAnnouncement,
    focusCanvas: useCallback(() => sectionRef.current?.focus(), []),
  });
  const { editing, editingRef } = labelEditing;

  useEffect(() => {
    pageRef.current = page;
  });

  const load = useV2DocumentLoad({
    documentId: id,
    repository,
    openDocument: session.openDocument,
    onRecovered: () => pushToast({ id: 'recovered', tone: 'warning', title: 'Recovered from the last good backup.' }),
  });
  useEffect(() => {
    reloadRef.current = load.reload;
  }, [load.reload]);
  const readOnlyRef = useRef(load.readOnly);
  useEffect(() => { readOnlyRef.current = load.readOnly; }, [load.readOnly]);

  const { status: saveStatus, retry: retrySave } = useV2Autosave({
    repository,
    documentId: id ?? null,
    document: session.document,
    revision: session.revision,
    baseRevision: load.baseRevision,
    onConflict: () => setAnnouncement('Another tab saved first. Reload to continue.'),
  });

  useV2TestApi({
    hostRef, selectionRef, toolRef, selectedConnectorId,
    document: session.document, revision: session.revision, saveStatus,
  });

  useEffect(() => {
    camera.fitOnOpen(rendererStatus, session.document, id, session.revision);
  }, [rendererStatus, session.document, session.revision, id, camera]);

  const { openEditor: openLabelEditor } = labelEditing;
  const openEditor = useCallback(
    (nodeId: string) => {
      applyConnectorSelection(null);
      applySelection(replaceSelection([nodeId]));
      openLabelEditor(nodeId);
    },
    [openLabelEditor, applyConnectorSelection, applySelection]
  );

  const editActions = useV2EditActions({
    commit: session.commit,
    pageRef,
    selectionRef,
    selectedConnectorId,
    mintId: mintV2Id,
    readOnly: load.readOnly,
    applySelection,
    applyConnectorSelection,
    announce: setAnnouncement,
  });

  const handleKeyDown = useV2Keyboard({
    toolRef, editingRef,
    onToolChange: setTool,
    onUndo: session.undo, onRedo: session.redo,
    onDelete: editActions.deleteSelection, onDuplicate: editActions.duplicateSelection,
    onEditPrimary: () => {
      const primary = selectionRef.current.primaryNodeId;
      if (primary && !load.readOnly) openEditor(primary);
    },
    onNudge: editActions.nudgeSelection,
    onCancelGesture: () => gestureApiRef.current?.cancelGesture() ?? false,
    onClearSelection: selectionApi.clearAll,
    onSelectAll: () => selectionApi.selectAllNodes(pageRef.current),
    onFitView: camera.fitView,
    onZoomStep: camera.zoomStep,
    onResetZoom: camera.resetZoom,
    onToggleTree: () => setTreeOpen((open) => !open),
    onSpacePan: setSpacePan,
  });

  return (
    <SystemRoot appearance={appearance}>
      <div className="ofk-v2" data-testid="v2-editor" data-tool={tool}>
        {load.phase === 'loading' || !page ? (
          <V2LoadCenter
            phase={load.phase}
            documentId={id}
            corruptIssues={load.corruptIssues}
            loadError={load.loadError}
            onRetry={load.reload}
            onDownloadDiagnostic={() => downloadTextFile(
              `${id ?? 'document'}-diagnostic.json`,
              JSON.stringify(load.corruptIssues, null, 2),
              'application/json'
            )}
          />
        ) : (
          <>
            <V2Chrome
              document={session.document!}
              saveStatus={saveStatus}
              canUndo={session.canUndo} canRedo={session.canRedo}
              readOnly={load.readOnly}
              tool={tool} zoomPercent={camera.zoom} treeOpen={treeOpen}
              onUndo={session.undo} onRedo={session.redo}
              onRetrySave={retrySave} onReload={load.reload} onToast={pushToast}
              onToolChange={setTool}
              onZoomIn={() => camera.zoomStep(1.2)}
              onZoomOut={() => camera.zoomStep(1 / 1.2)}
              onZoomTo={camera.zoomTo}
              onFitView={camera.fitView}
              onToggleTree={() => setTreeOpen((open) => !open)}
            />
            <V2CanvasHost
              page={page} hostRef={hostRef} camera={camera.camera} cameraRef={camera.cameraRef} pageRef={pageRef}
              selectionRef={selectionRef} toolRef={toolRef} spacePanRef={spacePanRef}
              readOnlyRef={readOnlyRef} gestureApiRef={gestureApiRef}
              selection={selection} selectedConnectorId={selectedConnectorId}
              editing={editing}
              commit={session.commit}
              applySelection={applySelection} applyConnectorSelection={applyConnectorSelection}
              updateCamera={camera.updateCamera} openEditor={openEditor} onToolChange={setTool} mintId={mintV2Id}
              onCommitLabel={labelEditing.commitLabel} onCancelEdit={labelEditing.cancelEdit}
              onStatusChange={setRendererStatus}
              onKeyDown={handleKeyDown}
              onKeyUp={(event) => { if (event.key === ' ') setSpacePan(false); }}
              sectionRef={sectionRef}
              backgroundColor={appearance === 'dark' ? 0x191b19 : 0xf7f7f5}
              readOnly={load.readOnly}
              onDuplicate={editActions.duplicateSelection}
              onDelete={editActions.deleteSelection}
            />
            {treeOpen ? (
              <V2TreePanel
                page={page} selection={selection} selectedConnectorId={selectedConnectorId}
                onSelectNode={(nodeId, additive) => {
                  applyConnectorSelection(null);
                  applySelection(additive ? toggleSelection(selection, nodeId) : replaceSelection([nodeId]));
                }}
                onSelectConnector={(connectorId) => {
                  applySelection(clearSelection());
                  applyConnectorSelection(connectorId);
                }}
                onClose={() => setTreeOpen(false)}
              />
            ) : null}
            <ToastRegion
              items={toasts}
              onDismiss={(toastId) => setToasts((current) => current.filter((toast) => toast.id !== toastId))}
            />
            <p className="sr-only" aria-live="polite">{announcement || `Revision ${session.revision}.`}</p>
          </>
        )}
      </div>
    </SystemRoot>
  );
}
