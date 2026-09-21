import { useV2Preferences } from './useV2Preferences';
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
import { V2ContextMenu, type ContextMenuTarget } from './V2ContextMenu';
import { V2CanvasHost } from './V2CanvasHost';
import { V2Chrome } from './V2Chrome';
import { INITIAL_CODE, V2CanvasWelcome, V2DraftPanel, V2Shortcuts, V2WorkspaceRail, type V2WorkspaceMode } from './V2Workspace';
import type { V2Tool } from './V2CreationToolbar';
import { useV2IconLibrary } from './useV2IconLibrary';
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
import { useV2AgentBridge } from './useV2AgentBridge';
import { useV2AgentHost } from './useV2AgentHost';
import { useV2AiRequest } from './useV2AiRequest';
import { useV2AiSettings } from './useV2AiSettings';
import { useV2Proposal } from './useV2Proposal';
import type { Proposal } from '../../application/ai/proposalSession';
import { useV2Pages } from './useV2Pages';
import { useV2Selection } from './useV2Selection';
import { useV2TestApi } from './useV2TestApi';
import type { V2GestureApi } from './useV2Pointer';
import { worldToScreen } from '../../domain/camera/camera';
import { createConnectorEditCommand, setPrimaryConnectorLabel } from '../../domain/connectors/editing';
import type { Point2d } from '../../domain/geometry/types';
import { isDiagramPalette, type DiagramPaletteName } from '../../domain/nodes/nodePalette';
import { firstV2Page, mintV2Id } from './v2Document';
import { downloadTextFile } from './v2Export';
import type { ScenePage } from '../../domain/document/types';
import { dslFrameRaw } from '../../../dsl/sceneMeta';
import { frameEdited, frameScene } from '../../../dsl/frameScene';
import { compile } from '../../../dsl/compile';
import { parse } from '../../../dsl/parse';
import { serialize } from '../../../dsl/serialize';
import { buildDslPageCommand, nextDslFrameOrigin } from '../../application/dsl/dslPageCommand';
import { elkDslLayoutPort } from '../../../services/dsl/elkLayoutPort';
import { resolveDslIcon } from '../../../services/dsl/iconResolver';
import { V2CodePanel } from './V2CodePanel';
import { looksLikeMermaid, mermaidToDsl } from '../../../services/dsl/mermaidToDsl';
import './v2EditorPage.css';

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
  const [workspaceMode, setWorkspaceMode] = useState<V2WorkspaceMode | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState(INITIAL_CODE);
  const [codeFrameId, setCodeFrameId] = useState<string | null>(null);
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [compileDiagnostics, setCompileDiagnostics] = useState<ReturnType<typeof parse>['diagnostics']>([]);
  const codeAbortRef = useRef<AbortController | null>(null);
  const [slideDraftCount, setSlideDraftCount] = useState(0);
  const agentOpen = workspaceMode === 'assistant';
  const openWorkspace = (mode: V2WorkspaceMode) => {
    setWorkspaceMode(mode);
    setShortcutsOpen(false);
    if (window.innerWidth < 1100) setTreeOpen(false);
  };
  const toggleAgent = () => { if (agentOpen) setWorkspaceMode(null); else openWorkspace('assistant'); };
  const toggleCode = () => { if (workspaceMode === 'code') setWorkspaceMode(null); else { setCodeFrameId(null); openWorkspace('code'); } };
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
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
  const toggleTree = () => {
    setTreeOpen((open) => !open);
    if (window.innerWidth < 1100) { setWorkspaceMode(null); setShortcutsOpen(false); }
  };
  const toggleShortcuts = () => {
    setShortcutsOpen((open) => !open);
    setWorkspaceMode(null);
    if (window.innerWidth < 1100) setTreeOpen(false);
  };
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
  // Pages are documents-in-document: the active page drives the canvas, the
  // context bar and export. Null means "the first page" (single-page default).
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const page = session.document
    ? session.document.pages.find((candidate) => candidate.id === activePageId) ?? firstV2Page(session.document)
    : null;
  const documentId = session.document?.id;
  useEffect(() => { setActivePageId(null); }, [documentId]);
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
  const codeDiagnostics = useMemo(() => {
    // compile() re-parses, so dedupe the live parse pass against the last generate.
    const seen = new Set<string>();
    return [...parse(codeDraft).diagnostics, ...compileDiagnostics].filter((item) => {
      const key = `${item.code}:${item.line}:${item.col}:${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [codeDraft, compileDiagnostics]);
  const mermaidConversion = useMemo(() => (looksLikeMermaid(codeDraft) ? mermaidToDsl(codeDraft) : null), [codeDraft]);
  const convertMermaid = useCallback(() => {
    const conversion = mermaidToDsl(codeDraft);
    if ('error' in conversion) {
      setCompileDiagnostics([{ code: 'E003', severity: 'error', line: 1, col: 1, endCol: 1, message: conversion.error, source: 'parse' }]);
      return;
    }
    setCodeDraft(conversion.dsl);
    setCompileDiagnostics(conversion.diagnostics);
    setAnnouncement(`Mermaid converted${conversion.losses.length ? ` with ${conversion.losses.length} loss notes` : ''}.`);
  }, [codeDraft]);
  const codeCanvasEdited = useMemo(() => {
    if (!page || !codeFrameId) return false;
    const scene = frameScene(page, codeFrameId);
    return scene ? frameEdited(scene) : false;
  }, [page, codeFrameId]);
  const openFrameAsCode = useCallback((frameId: string) => {
    const currentPage = pageRef.current;
    const scene = currentPage ? frameScene(currentPage, frameId) : null;
    if (!currentPage || !scene) return;
    const metadata = dslFrameRaw(scene.frame);
    const edited = frameEdited(scene);
    const source = !edited && typeof metadata.source === 'string'
      ? metadata.source
      : serialize({ frame: scene.frame, nodes: scene.nodes, groups: scene.groups ?? [], connectors: scene.connectors });
    // The picker follows the frame's authored palette so re-theming is explicit.
    const framePalette = isDiagramPalette(metadata.appearance && typeof metadata.appearance === 'object'
      ? (metadata.appearance as { palette?: unknown }).palette : undefined)
      ? (metadata.appearance as { palette: DiagramPaletteName }).palette : null;
    if (framePalette && framePalette !== preferences.diagramPalette) updatePreferences({ diagramPalette: framePalette });
    setCodeDraft(source); setCodeFrameId(frameId); openWorkspace('code'); setContextMenu(null);
  }, [preferences.diagramPalette, updatePreferences]);

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
  const generateCode = useCallback(async () => {
    const currentPage = pageRef.current;
    if (!currentPage || load.readOnly || codeGenerating) return;
    codeAbortRef.current?.abort();
    const controller = new AbortController();
    codeAbortRef.current = controller;
    setCodeGenerating(true);
    try {
      const bound = codeFrameId ? currentPage.nodes.find((node) => node.id === codeFrameId) : undefined;
      const origin = bound?.transform.translation ?? nextDslFrameOrigin(currentPage);
      const compiled = await compile(codeDraft, {
        origin, layout: elkDslLayoutPort, signal: controller.signal, resolveIcon: resolveDslIcon,
        // The panel's palette is a default: an authored `appearance:` line wins.
        appearance: { palette: preferences.diagramPalette },
      });
      setCompileDiagnostics(compiled.diagnostics);
      session.commit(buildDslPageCommand(currentPage, compiled, codeFrameId ?? undefined));
      setCodeFrameId(codeFrameId ?? compiled.frame.id);
      applySelection(replaceSelection([codeFrameId ?? compiled.frame.id]));
      setAnnouncement(`${compiled.nodes.length} nodes generated${compiled.diagnostics.some((item) => item.severity !== 'info') ? ' with diagnostics' : ''}.`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) pushToast({ id: `dsl-${Date.now()}`, tone: 'danger', title: error instanceof Error ? error.message : 'Diagram generation failed.' });
    } finally {
      if (codeAbortRef.current === controller) { codeAbortRef.current = null; setCodeGenerating(false); }
    }
  }, [load.readOnly, codeGenerating, codeFrameId, codeDraft, session, applySelection, pushToast, preferences.diagramPalette]);

  const { status: saveStatus, retry: retrySave } = useV2Autosave({
    repository,
    documentId: id ?? null,
    document: session.document,
    revision: session.revision,
    baseRevision: load.baseRevision,
    onConflict: () => setAnnouncement('Another tab saved first. Reload to continue.'),
  });

  const compileDraft = useCallback(
    (text: string) => compile(text, { origin: { x: 0, y: 0 }, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon }),
    []);
  const proposal = useV2Proposal({
    document: session.document, revision: session.revision, pageId: page?.id ?? null,
    selectionRef, commit: session.commit, readOnly: load.readOnly,
    announce: setAnnouncement, mintId: mintV2Id, compileDsl: compileDraft,
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

  const pages = useV2Pages({
    document: session.document, pageId: page?.id ?? null, readOnly: load.readOnly,
    commit: session.commit, onSelect: setActivePageId, mintId: mintV2Id,
    announce: setAnnouncement,
  });
  // A page switch moves the camera to that page's content; the canvas only ever
  // renders one page, so `fitView` is already page-scoped.
  const fittedPageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!page || rendererStatus !== 'ready') return;
    if (fittedPageRef.current === page.id) return;
    const first = fittedPageRef.current === null;
    fittedPageRef.current = page.id;
    if (!first) camera.fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id, rendererStatus]);

  // Local agent pairing: the ops run here, against this session, through the
  // same registry the MCP server uses. Off until the user connects.
  const agentCapabilities = useV2AgentHost({ fitView: camera.fitView });
  const aiSettings = useV2AiSettings();
  const loadGrammar = useCallback(async () => String(await agentCapabilities.syntax()), [agentCapabilities]);
  const ai = useV2AiRequest({
    settings: aiSettings.settings,
    proposal,
    loadGrammar,
    // The code panel owns the text the user is looking at; when it is bound to a
    // frame the model edits that frame, otherwise it draws a fresh diagram.
    currentDsl: () => (codeFrameId ? codeDraft : undefined),
    frameId: () => codeFrameId ?? undefined,
    announce: setAnnouncement,
  });
  const agentBridge = useV2AgentBridge({
    enabled: preferences.agentBridgeEnabled,
    port: preferences.bridgePort,
    token: preferences.bridgeToken,
    document: session.document,
    pageId: page?.id ?? null,
    revision: session.revision,
    capabilities: agentCapabilities,
    commit: session.commit,
    onActivity: setAnnouncement,
  });

  const { openEditor: openLabelEditor } = labelEditing;
  const openEditor = useCallback(
    (nodeId: string, editorOptions?: OpenEditorOptions) => {
      applyConnectorSelection(null);
      applySelection(replaceSelection([nodeId]));
      openLabelEditor(nodeId, editorOptions);
    },
    [openLabelEditor, applyConnectorSelection, applySelection]
  );

  const [connectorEditing, setConnectorEditing] = useState<{
    connectorId: string; bounds: DOMRect; value: string;
  } | null>(null);
  const openConnectorEditor = useCallback((connectorId: string, at: Point2d) => {
    const connector = pageRef.current?.connectors.find((candidate) => candidate.id === connectorId);
    if (!connector || load.readOnly) return;
    applySelection(clearSelection());
    applyConnectorSelection(connectorId);
    // Sits on the existing label when there is one, else at the click; the
    // box scales with zoom like the plate it replaces.
    const zoom = camera.cameraRef.current.zoom;
    const labelPoint = (connector.labels[0] && hostRef.current?.getConnectorLabelScreenPoint(connectorId))
      ?? { x: at.x, y: at.y - 14 * zoom };
    setConnectorEditing({
      connectorId,
      bounds: new DOMRect(labelPoint.x - 20 * zoom, labelPoint.y - 9 * zoom, 40 * zoom, 18 * zoom),
      value: connector.labels[0]?.text ?? '',
    });
    setAnnouncement('Editing connector label');
  }, [applyConnectorSelection, applySelection, load.readOnly, camera.cameraRef]);
  const commitConnectorLabel = useCallback((value: string) => {
    const currentPage = pageRef.current;
    const before = currentPage?.connectors.find((candidate) => candidate.id === connectorEditing?.connectorId);
    if (currentPage && before) {
      const command = createConnectorEditCommand(
        currentPage.id, before, setPrimaryConnectorLabel(before, value), 'Edit label');
      if (command) session.commit(command);
    }
    setConnectorEditing(null);
    sectionRef.current?.focus();
  }, [connectorEditing, session]);
  const cancelConnectorEdit = useCallback(() => {
    setConnectorEditing(null);
    sectionRef.current?.focus();
  }, []);
  const editSelectedConnectorLabel = useCallback(() => {
    if (!selectedConnectorId) return;
    const samples = hostRef.current?.getConnectorSamples(selectedConnectorId);
    const middle = samples?.length ? samples[Math.floor(samples.length / 2)] : null;
    if (middle) openConnectorEditor(selectedConnectorId, worldToScreen(camera.camera, middle));
  }, [selectedConnectorId, openConnectorEditor, camera.camera]);

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

  const iconLibrary = useV2IconLibrary({
    hostRef, pageRef, commit: session.commit, mintId: mintV2Id, openEditor, readOnly: load.readOnly,
  });

  const handleKeyDown = useV2Keyboard({
    toolRef, editingRef,
    onToolChange: setTool,
    onToggleIcons: iconLibrary.toggle,
    onUndo: session.undo, onRedo: session.redo,
    onDelete: editActions.deleteSelection, onDuplicate: editActions.duplicateSelection,
    onReorder: editActions.reorderSelection, onToggleLock: editActions.toggleLock,
    onGroup: editActions.groupSelection, onUngroup: editActions.ungroupSelection,
    onWrapInSection: editActions.wrapInSection,
    onCut: editActions.cutSelection, onCopy: editActions.copySelection,
    onPaste: () => { void editActions.pasteClipboard(); },
    onCopyStyle: editActions.copyStyle, onPasteStyle: editActions.pasteStyle,
    onAlign: editActions.alignSelection, onDistribute: editActions.distributeSelection,
    onFlip: editActions.flipSelection,
    onZoomToSelection: () => camera.fitView(selectionRef.current.nodeIds.length ? selectionRef.current.nodeIds : undefined),
    onTextStyle: editActions.toggleTextStyle,
    onEditPrimary: () => {
      if (load.readOnly) return;
      const primary = selectionRef.current.primaryNodeId;
      if (primary) {
        openEditor(primary);
        return;
      }
      editSelectedConnectorLabel();
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
      else { setWorkspaceMode(null); setShortcutsOpen(false); setTreeOpen(false); }
    },
    onSelectAll: () => selectionApi.selectAllNodes(pageRef.current),
    onFitView: () => camera.fitView(),
    onZoomStep: camera.zoomStep,
    onResetZoom: camera.resetZoom,
    onToggleTree: toggleTree,
    onToggleAgent: toggleAgent,
    onToggleCode: toggleCode,
    onSpacePan: setSpacePan,
  });

  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <div className="ofk-v2" data-testid="v2-editor" data-tool={spacePan ? 'hand' : tool}
        style={{ backgroundColor: canvasColor }}
        data-workspace-open={workspaceMode !== null || shortcutsOpen}
        data-tree-open={treeOpen}
        onKeyDown={(event) => {
          if (event.key === '?' && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]'))) {
            event.preventDefault(); toggleShortcuts();
          } else handleKeyDown(event);
        }}
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
              pages={pages}
              pageId={page.id}
              selectedNodeIds={selection.nodeIds}
              bridge={{ status: agentBridge.status, detail: agentBridge.detail,
                port: preferences.bridgePort, token: preferences.bridgeToken,
                onPortChange: (bridgePort) => updatePreferences({ bridgePort }),
                onTokenChange: (bridgeToken) => updatePreferences({ bridgeToken }),
                onToggle: (connect) => updatePreferences({ agentBridgeEnabled: connect }) }}
              saveStatus={saveStatus}
              canUndo={session.canUndo} canRedo={session.canRedo}
              readOnly={load.readOnly}
              tool={tool} zoomPercent={camera.zoom} treeOpen={treeOpen}
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
              iconsOpen={iconLibrary.open} onIconsOpenChange={iconLibrary.setOpen} onInsertIcon={iconLibrary.insertIcon}
              onZoomIn={() => camera.zoomStep(1.2)}
              onZoomOut={() => camera.zoomStep(1 / 1.2)}
              onZoomTo={camera.zoomTo}
              onFitView={camera.fitView}
              onToggleTree={toggleTree}
            />
            <V2CanvasHost
              page={page} hostRef={hostRef} camera={camera.camera} cameraRef={camera.cameraRef} pageRef={pageRef}
              selectionRef={selectionRef} toolRef={toolRef} tool={tool} spacePanRef={spacePanRef}
              readOnlyRef={readOnlyRef} gestureApiRef={gestureApiRef}
              selection={selection} selectedConnectorId={selectedConnectorId}
              editing={editing}
              commit={session.commit}
              applySelection={applySelection} applyConnectorSelection={applyConnectorSelection}
              updateCamera={camera.updateCamera} openEditor={openEditor} openConnectorEditor={openConnectorEditor} onToolChange={setTool} mintId={mintV2Id}
              onCommitLabel={labelEditing.commitLabel} onCancelEdit={labelEditing.cancelEdit}
              connectorEditing={connectorEditing}
              onCommitConnectorLabel={commitConnectorLabel} onCancelConnectorEdit={cancelConnectorEdit}
              onStatusChange={setRendererStatus}
              sectionRef={sectionRef}
              showGrid={preferences.showGrid} snapToGrid={preferences.snapToGrid}
              backgroundColor={rendererCanvasColor}
              readOnly={load.readOnly}
              onContextMenu={setContextMenu}
            />
            <V2ContextMenu target={contextMenu} page={page} selectionCount={selection.nodeIds.length} selectedNodeId={selection.primaryNodeId}
              readOnly={load.readOnly} actions={editActions} commit={session.commit}
              onEditLabel={() => {
                const primary = selectionRef.current.primaryNodeId;
                if (primary) openEditor(primary); else editSelectedConnectorLabel();
              }}
              onEditAsCode={openFrameAsCode}
              onSelectAll={() => selectionApi.selectAllNodes(pageRef.current)}
              onZoomToFit={() => camera.fitView()}
              onZoomToSelection={() => camera.fitView(selectionRef.current.nodeIds)}
              onZoomTo100={camera.resetZoom}
              showGrid={preferences.showGrid} snapToGrid={preferences.snapToGrid}
              onToggleGrid={() => updatePreferences({ showGrid: !preferences.showGrid })}
              onToggleSnap={() => updatePreferences({ snapToGrid: !preferences.snapToGrid })}
              onClose={() => { setContextMenu(null); sectionRef.current?.focus(); }}
            />
            <V2WorkspaceRail mode={workspaceMode}
              onChange={(mode) => { if (workspaceMode === mode) setWorkspaceMode(null); else openWorkspace(mode); }}
              onShortcuts={toggleShortcuts} />
            {page.nodes.length === 0 && page.connectors.length === 0 && !load.readOnly && rendererStatus === 'ready' ? <V2CanvasWelcome onOpen={openWorkspace} /> : null}
            {workspaceMode === 'code' ? <V2CodePanel code={codeDraft} palette={preferences.diagramPalette}
              onPaletteChange={(diagramPalette) => updatePreferences({ diagramPalette })}
              onCodeChange={(value) => { setCodeDraft(value); setCompileDiagnostics([]); }}
              diagnostics={codeDiagnostics} generating={codeGenerating} canvasEdited={codeCanvasEdited}
              {...(mermaidConversion ? { onConvertMermaid: convertMermaid } : {})}
              onGenerate={() => { void generateCode(); }} onClose={() => { codeAbortRef.current?.abort(); setWorkspaceMode(null); }} /> : null}
            {workspaceMode === 'slides' ? <V2DraftPanel mode={workspaceMode}
              code={codeDraft} onCodeChange={setCodeDraft} slides={slideDraftCount}
              onAddSlide={() => setSlideDraftCount((count) => count + 1)} onClose={() => setWorkspaceMode(null)} /> : null}
            {shortcutsOpen ? <V2Shortcuts onClose={() => setShortcutsOpen(false)} /> : null}
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
              <V2AgentPanel proposal={proposal} ai={ai} aiSettings={aiSettings}
                currentRevision={session.revision}
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
