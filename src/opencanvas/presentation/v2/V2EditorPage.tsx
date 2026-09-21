import { useV2Preferences } from './useV2Preferences';
import { isRolloutFlagEnabled } from '../../../config/rolloutFlags';
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
import { V2AgentPanel } from './V2AgentPanel';
import { useV2Appearance } from './useV2Appearance';
import { useV2Autosave } from './useV2Autosave';
import { useV2Camera } from './useV2Camera';
import { useV2DocumentLoad } from './useV2DocumentLoad';
import { useV2EditActions } from './useV2EditActions';
import { useV2Keyboard } from './useV2Keyboard';
import { useV2LabelEditing, type OpenEditorOptions } from './useV2LabelEditing';
import { useV2Proposal } from './useV2Proposal';
import type { Proposal } from '../../application/ai/proposalSession';
import { useV2Selection } from './useV2Selection';
import { useV2TestApi } from './useV2TestApi';
import type { V2GestureApi } from './useV2Pointer';
import { firstV2Page, mintV2Id } from './v2Document';
import { downloadTextFile } from './v2Export';
import type { ScenePage } from '../../domain/document/types';
import './v2EditorPage.css';

const AI_ENABLED = isRolloutFlagEnabled('v2Ai');

function changeObjectIds(changeId: string, proposal: Proposal | null): readonly string[] {
  const change = proposal?.changes.find(({ id }) => id === changeId);
  if (!change) return [];
  const commands = change.command.kind === 'batch' ? change.command.commands : [change.command];
  return commands.flatMap((command) => {
    switch (command.kind) {
      case 'insert-node': case 'remove-node': return [command.node.id];
      case 'set-node': return [command.after.id];
      case 'insert-connector': case 'remove-connector':
        return [command.connector.source.nodeId, command.connector.target.nodeId].filter((id): id is string => !!id);
      case 'set-connector':
        return [command.after.source.nodeId, command.after.target.nodeId].filter((id): id is string => !!id);
      default: return [];
    }
  });
}

export function V2EditorPage(): React.JSX.Element {
  const { id } = useParams();
  const { preferences, updatePreferences } = useV2Preferences();
  const agentOpen = AI_ENABLED && preferences.agentOpen;
  const toggleAgent = () => { if (AI_ENABLED) updatePreferences({ agentOpen: !preferences.agentOpen }); };
  const appearance = useV2Appearance(preferences.theme);
  const canvasColor = preferences.canvasColor ?? (appearance === 'dark' ? '#191b19' : '#f7f7f5');
  const rendererCanvasColor = Number.parseInt(canvasColor.slice(1), 16);
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

  useEffect(() => {
    const resetInput = () => {
      setSpacePan(false);
      gestureApiRef.current?.cancelGesture();
    };
    window.addEventListener('blur', resetInput);
    return () => window.removeEventListener('blur', resetInput);
  }, []);

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

  const proposal = useV2Proposal({
    document: session.document, revision: session.revision, pageId: page?.id ?? null,
    selectionRef, commit: session.commit, readOnly: load.readOnly,
    announce: setAnnouncement, mintId: mintV2Id,
  });

  useV2TestApi({
    hostRef, selectionRef, toolRef, selectedConnectorId,
    document: session.document, revision: session.revision, saveStatus, proposal,
  });

  useEffect(() => {
    camera.fitOnOpen(rendererStatus, session.document, id, session.revision);
  }, [rendererStatus, session.document, session.revision, id, camera]);

  // Ghost the proposal preview while it is reviewable; clears on apply/discard/stale.
  const ghostPage = proposal.phase === 'ready' && !proposal.stale && proposal.proposal
    ? proposal.proposal.preview.pages[0] : null;
  const highlightedChange = proposal.changes.find(({ id }) => id === proposal.highlightedChangeId);
  const highlightIds = useMemo(() => (highlightedChange ? changeObjectIds(highlightedChange.id, proposal.proposal) : []),
    [highlightedChange, proposal.proposal]);
  useEffect(() => {
    if (rendererStatus !== 'ready') return;
    hostRef.current?.setProposalPreview(ghostPage ? { page: ghostPage, highlightIds } : null);
  }, [ghostPage, highlightIds, rendererStatus]);

  const { openEditor: openLabelEditor } = labelEditing;
  const openEditor = useCallback(
    (nodeId: string, editorOptions?: OpenEditorOptions) => {
      applyConnectorSelection(null);
      applySelection(replaceSelection([nodeId]));
      openLabelEditor(nodeId, editorOptions);
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
    // FigJam/Excalidraw: typing on a single selected shape replaces its label.
    onTypeToEdit: (key) => {
      const { nodeIds, primaryNodeId } = selectionRef.current;
      if (nodeIds.length !== 1 || !primaryNodeId || load.readOnly || toolRef.current !== 'select') return false;
      openEditor(primaryNodeId, { initialValue: key });
      return true;
    },
    onNudge: editActions.nudgeSelection,
    onCancelGesture: () => gestureApiRef.current?.cancelGesture() ?? false,
    // Escape chain tail: selection first, then the open agent panel.
    onClearSelection: () => {
      if (selectionRef.current.nodeIds.length > 0 || selectedConnectorId) selectionApi.clearAll();
      else if (agentOpen) toggleAgent();
    },
    onSelectAll: () => selectionApi.selectAllNodes(pageRef.current),
    onFitView: camera.fitView,
    onZoomStep: camera.zoomStep,
    onResetZoom: camera.resetZoom,
    onToggleTree: () => setTreeOpen((open) => !open),
    onToggleAgent: toggleAgent,
    onSpacePan: setSpacePan,
  });

  return (
    <SystemRoot appearance={appearance}>
      <div className="ofk-v2" data-testid="v2-editor" data-tool={spacePan ? 'hand' : tool}
        style={{ backgroundColor: canvasColor }}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => { if (event.key === ' ') setSpacePan(false); }}>
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
              preferences={preferences} canvasDefaultColor={appearance === 'dark' ? '#191b19' : '#f7f7f5'}
              onPreferencesChange={updatePreferences}
              document={session.document!}
              saveStatus={saveStatus}
              canUndo={session.canUndo} canRedo={session.canRedo}
              readOnly={load.readOnly}
              tool={tool} zoomPercent={camera.zoom} treeOpen={treeOpen}
              agentOpen={AI_ENABLED ? agentOpen : null}
              onUndo={session.undo} onRedo={session.redo}
              onRetrySave={retrySave} onReload={load.reload} onToast={pushToast}
              onRename={(name) => {
                const before = session.document!.name;
                if (name === before) return;
                session.commit({
                  kind: 'set-document-name',
                  id: `rename-document:${session.document!.id}`,
                  label: 'Rename document',
                  before,
                  after: name,
                });
              }}
              onToolChange={setTool}
              onZoomIn={() => camera.zoomStep(1.2)}
              onZoomOut={() => camera.zoomStep(1 / 1.2)}
              onZoomTo={camera.zoomTo}
              onFitView={camera.fitView}
              onToggleTree={() => setTreeOpen((open) => !open)}
              onToggleAgent={toggleAgent}
            />
            <V2CanvasHost
              page={page} hostRef={hostRef} camera={camera.camera} cameraRef={camera.cameraRef} pageRef={pageRef}
              selectionRef={selectionRef} toolRef={toolRef} tool={tool} spacePanRef={spacePanRef}
              readOnlyRef={readOnlyRef} gestureApiRef={gestureApiRef}
              selection={selection} selectedConnectorId={selectedConnectorId}
              editing={editing}
              commit={session.commit}
              applySelection={applySelection} applyConnectorSelection={applyConnectorSelection}
              updateCamera={camera.updateCamera} openEditor={openEditor} onToolChange={setTool} mintId={mintV2Id}
              onCommitLabel={labelEditing.commitLabel} onCancelEdit={labelEditing.cancelEdit}
              onStatusChange={setRendererStatus}
              sectionRef={sectionRef}
              showGrid={preferences.showGrid} snapToGrid={preferences.snapToGrid}
              backgroundColor={rendererCanvasColor}
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
            {agentOpen ? (
              <V2AgentPanel proposal={proposal} currentRevision={session.revision}
                readOnly={load.readOnly} onUndo={session.undo} onClose={toggleAgent} />
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
