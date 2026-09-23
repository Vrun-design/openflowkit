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
import { Panel, SystemRoot, ToastRegion, type ToastItem } from '../design-system';
import { V2ContextMenu, type ContextMenuTarget } from './V2ContextMenu';
import { V2CanvasHost } from './V2CanvasHost';
import { V2Chrome } from './V2Chrome';
import { V2AgentConnect } from './V2AgentConnect';
import { INITIAL_CODE, V2CanvasWelcome, V2DraftPanel, V2Shortcuts, V2WorkspaceRail, type V2WorkspaceMode } from './V2Workspace';
import type { V2Tool } from './V2CreationToolbar';
import { DEFAULT_TOOL_CONFIG, type V2ChartKind, type V2ConnectorTool, type V2ToolConfig } from './v2ToolCatalog';
import { createChartNode, DEFAULT_CHART_SIZE } from '../../domain/nodes/chartNode';
import { DEFAULT_QUADRANT } from '../../domain/nodes/chartNodePresentation';
import type { ShapeKind } from '../../domain/nodes/shapeNode';
import { useV2IconLibrary } from './useV2IconLibrary';
import { useV2MediaInsert } from './useV2MediaInsert';
import { IMAGE_URL_PATTERN } from './useV2MediaInsert';
import { isImageFile } from '../../../services/storage/assets';
import { V2LoadCenter } from './V2LoadCenter';
import { V2TreePanel } from './V2TreePanel';
import { V2ChartDataPanel } from './V2ChartDataPanel';
import { V2MotionExport } from './V2MotionExport';
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
import { firstV2Page, mintV2Id, rememberLastDocument } from './v2Document';
import { downloadTextFile } from './v2Export';
import type { ScenePage } from '../../domain/document/types';
import { dslFrameRaw } from '../../../dsl/sceneMeta';
import { frameEdited, frameScene } from '../../../dsl/frameScene';
import { compile, compileWorkspace, type CompileWorkspaceResult } from '../../../dsl/compile';
import { parse } from '../../../dsl/parse';
import { serialize } from '../../../dsl/serialize';
import { writeAnimateBlock } from '../../../dsl/animate';
import { buildDslPageCommand, nextDslFrameOrigin } from '../../application/dsl/dslPageCommand';
import { elkDslLayoutPort } from '../../../services/dsl/elkLayoutPort';
import { resolveDslIcon } from '../../../services/dsl/iconResolver';
import { V2CodePanel } from './V2CodePanel';
import { V2ModelPanel } from './V2ModelPanel';
import { V2FlowPanel } from './V2FlowPanel';
import { useV2Architecture } from './useV2Architecture';
import { useV2ArchitectureActions } from './useV2ArchitectureActions';
import { useV2FlowPlayback } from './useV2FlowPlayback';
import { useV2WorkspaceFolder } from './useV2WorkspaceFolder';
import { applySnapsToWorkspace, type WorkspaceSnap } from '../../../services/workspace/workspaceFolder';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import { buildArchRelationCommands, buildWorkspacePagesCommand } from '../../application/dsl/architectureCommands';
import { buildDeleteSelectionCommand, buildDuplicateSelectionCommand, buildToggleLockCommand } from '../../domain/commands/sceneEdits';
import { buildConnectorObjectAction } from '../../application/active-document/connectorActions';
import type { DocumentCommand } from '../../domain/commands/types';
import { archViewIdOfPage, placedElementId } from '../../../dsl/model/model';
import { isEditableTarget } from './pointerOperations';
import { looksLikeMermaid, mermaidToDsl } from '../../../services/dsl/mermaidToDsl';
import { buildAutoIconsOffCommand, hasAutoIcon, hasIcon } from '../../application/dsl/iconCommands';
import { diagramIconsOn, iconToggleFrame, useV2IconActions } from './useV2IconActions';
import { looksLikeStructurizr, structurizrToDsl } from '../../../services/dsl/structurizrToDsl';
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
  useEffect(() => { if (id) rememberLastDocument(id); }, [id]);
  const { preferences, updatePreferences } = useV2Preferences();
  const [workspaceMode, setWorkspaceMode] = useState<V2WorkspaceMode | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState(INITIAL_CODE);
  const [codeFrameId, setCodeFrameId] = useState<string | null>(null);
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [compileDiagnostics, setCompileDiagnostics] = useState<ReturnType<typeof parse>['diagnostics']>([]);
  const codeAbortRef = useRef<AbortController | null>(null);
  const iconToastFramesRef = useRef(new Set<string>());
  const [slideDraftCount, setSlideDraftCount] = useState(0);
  // The data panel is pinned to one chart: opening it never covers the canvas
  // on a plain select, and it stays while you click around. Double-click, the
  // context bar's Data button, or inserting a chart opens it. It docks in the
  // same right-hand slot as the workspace panels, so only one of them is open.
  const [chartPanelId, setChartPanelId] = useState<string | null>(null);
  // Animation export docks in the LEFT slot, beside the tree: a preview, a
  // transport, ten settings and the step chips never fitted a popover, and the
  // right slot holds the code panel the chips write into — both stay visible.
  const [motionOpen, setMotionOpen] = useState(false);
  const agentOpen = workspaceMode === 'assistant';
  const openWorkspace = (mode: V2WorkspaceMode) => {
    setWorkspaceMode(mode);
    setShortcutsOpen(false);
    setChartPanelId(null);
    if (window.innerWidth < 1100) { setTreeOpen(false); setMotionOpen(false); }
  };
  // One panel per slot: the tree and the animation panel share the left one.
  const openMotion = () => {
    setTreeOpen(false);
    setMotionOpen(true);
  };
  const toggleAgent = () => { if (agentOpen) setWorkspaceMode(null); else openWorkspace('assistant'); };
  const toggleModel = () => { if (workspaceMode === 'model') setWorkspaceMode(null); else openWorkspace('model'); };
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
  // Which variant a flyout tool draws with; its grid marks the last pick.
  const [toolConfig, setToolConfig] = useState<V2ToolConfig>(DEFAULT_TOOL_CONFIG);
  const [spacePan, setSpacePan] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
  const toggleTree = () => {
    setTreeOpen((open) => !open);
    setMotionOpen(false);
    if (window.innerWidth < 1100) { setWorkspaceMode(null); setShortcutsOpen(false); }
  };
  const toggleShortcuts = () => {
    setShortcutsOpen((open) => !open);
    setWorkspaceMode(null);
    setChartPanelId(null);
    if (window.innerWidth < 1100) setTreeOpen(false);
  };
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [rendererStatus, setRendererStatus] = useState<PixiRendererStatus>('initializing');

  const toolRef = useRef(tool);
  const toolConfigRef = useRef(toolConfig);
  const spacePanRef = useRef(spacePan);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { toolConfigRef.current = toolConfig; }, [toolConfig]);
  useEffect(() => { spacePanRef.current = spacePan; }, [spacePan]);

  const pickShape = useCallback((shape: ShapeKind) => {
    setToolConfig((config) => ({ ...config, shape }));
    setTool('shape');
  }, []);
  const pickConnector = useCallback((connector: V2ConnectorTool) => {
    setToolConfig((config) => ({ ...config, connector }));
    setTool('connector');
  }, []);

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
    selection, selectionRef, selectedConnectorId, selectedConnectorIds, selectedConnectorIdsRef,
    applySelection, applyConnectorSelection,
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
  const [pendingView, setPendingView] = useState<string | null>(null);
  const architecture = useV2Architecture(session.document, page);
  const architectureActionsRef = useRef<ReturnType<typeof useV2ArchitectureActions> | null>(null);
  const labelEditing = useV2LabelEditing({
    hostRef,
    page,
    camera: camera.camera,
    commit: session.commit,
    announce: setAnnouncement,
    focusCanvas: useCallback(() => sectionRef.current?.focus(), []),
    onRenamePlacedElement: (nodeId, label) => {
      const node = page?.nodes.find((candidate) => candidate.id === nodeId);
      const elementId = node ? placedElementId(node) : null;
      if (!elementId) return false;
      architectureActionsRef.current?.editElement(elementId, { name: label });
      return true;
    },
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
  // Foreign text in the panel: Mermaid or Structurizr DSL converts in place.
  const foreignSyntax = useMemo(() => (
    looksLikeMermaid(codeDraft) ? { label: 'Mermaid', convert: mermaidToDsl }
      : looksLikeStructurizr(codeDraft) ? { label: 'Structurizr', convert: structurizrToDsl }
        : null
  ), [codeDraft]);
  const convertForeign = useCallback(() => {
    if (!foreignSyntax) return;
    const conversion = foreignSyntax.convert(codeDraft);
    if ('error' in conversion) {
      setCompileDiagnostics([{ code: 'E003', severity: 'error', line: 1, col: 1, endCol: 1, message: conversion.error, source: 'parse' }]);
      return;
    }
    setCodeDraft(conversion.dsl);
    setCompileDiagnostics(conversion.diagnostics);
    setAnnouncement(`${foreignSyntax.label} converted${conversion.losses.length ? ` with ${conversion.losses.length} loss notes` : ''}.`);
  }, [codeDraft, foreignSyntax]);
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
  const generateCode = useCallback(async (overrideText?: string, snaps?: Readonly<Record<string, WorkspaceSnap>>) => {
    const currentPage = pageRef.current;
    if (!currentPage || load.readOnly || codeGenerating) return;
    codeAbortRef.current?.abort();
    const controller = new AbortController();
    codeAbortRef.current = controller;
    setCodeGenerating(true);
    try {
      const bound = codeFrameId ? currentPage.nodes.find((node) => node.id === codeFrameId) : undefined;
      const origin = bound?.transform.translation ?? nextDslFrameOrigin(currentPage);
      const compiledWorkspace = await compileWorkspace(overrideText ?? codeDraft, {
        origin, layout: elkDslLayoutPort, signal: controller.signal, resolveIcon: resolveDslIcon,
        // Panel defaults: an authored `appearance:` or `icons:` line wins.
        appearance: { palette: preferences.diagramPalette }, autoIcons: preferences.autoIcons,
      });
      // Saved layout overrides win over ELK for the elements they name.
      const workspace = snaps ? applySnapsToWorkspace(compiledWorkspace, snaps) : compiledWorkspace;
      const primary = workspace.views[0]!.result;
      setCompileDiagnostics(primary.diagnostics);
      if (workspace.views.length > 1) {
        // A C4 workspace: one page per view, all pages in one undo step. The
        // view we land on is applied once the committed document arrives.
        const command = buildWorkspacePagesCommand(session.document!, workspace, {
          mintId: mintV2Id,
          ...(codeFrameId ? { replaceFrameId: codeFrameId } : {}),
        });
        if (command) session.commit(command);
        setCodeFrameId(null);
        setPendingView(workspace.views[0]!.viewId);
        setAnnouncement(`Generated ${workspace.views.length} views. Every element is shared across them.`);
      } else {
        const command = buildDslPageCommand(currentPage, primary, codeFrameId ?? undefined);
        if (command) session.commit(command);
        const frameId = codeFrameId ?? primary.frame.id;
        // Say once per diagram what the compiler added, with the way out beside it.
        const inferred = primary.nodes.filter(hasAutoIcon).length;
        if (inferred && !iconToastFramesRef.current.has(frameId)) {
          iconToastFramesRef.current.add(frameId);
          const toastId = `auto-icons-${frameId}`;
          pushToast({
            id: toastId, tone: 'info',
            title: `${inferred} ${inferred === 1 ? 'icon' : 'icons'} added from labels.`,
            description: 'Right-click a node to remove one, or turn this off in Settings.',
            action: { label: 'Remove all', onClick: () => {
              setToasts((current) => current.filter((toast) => toast.id !== toastId));
              const latest = pageRef.current;
              const off = latest ? buildAutoIconsOffCommand(latest, frameId) : null;
              if (off) session.commit(off);
            } },
          });
        }
        setCodeFrameId(frameId);
        applySelection(replaceSelection([codeFrameId ?? primary.frame.id]));
        setAnnouncement(`${primary.nodes.length} nodes generated${primary.diagnostics.some((item) => item.severity !== 'info') ? ' with diagnostics' : ''}.`);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) pushToast({ id: `dsl-${Date.now()}`, tone: 'danger', title: error instanceof Error ? error.message : 'Diagram generation failed.' });
    } finally {
      if (codeAbortRef.current === controller) { codeAbortRef.current = null; setCodeGenerating(false); }
    }
  }, [load.readOnly, codeGenerating, codeFrameId, codeDraft, session, applySelection, pushToast, preferences.diagramPalette, preferences.autoIcons]);

  const { status: saveStatus, retry: retrySave } = useV2Autosave({
    repository,
    documentId: id ?? null,
    document: session.document,
    revision: session.revision,
    baseRevision: load.baseRevision,
    onConflict: () => setAnnouncement('Another tab saved first. Reload to continue.'),
  });

  const compileDraft = useCallback(
    (text: string) => compile(text, { origin: { x: 0, y: 0 }, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon, autoIcons: preferences.autoIcons }),
    [preferences.autoIcons]);
  const compileAny = useCallback(
    (text: string): Promise<CompileWorkspaceResult> => compileWorkspace(text, {
      origin: { x: 0, y: 0 }, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon,
      appearance: { palette: preferences.diagramPalette }, autoIcons: preferences.autoIcons,
    }),
    [preferences.diagramPalette, preferences.autoIcons]);
  const proposal = useV2Proposal({
    document: session.document, revision: session.revision, pageId: page?.id ?? null,
    commit: session.commit, readOnly: load.readOnly,
    announce: setAnnouncement, compileDsl: compileDraft,
  });

  useV2TestApi({
    hostRef, selectionRef, toolRef, selectedConnectorIds,
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

  // Drawing a connector between two model objects records the relation too:
  // one batch, one undo step, and Generate brings it back.
  const extendConnectorCommand = useCallback((command: DocumentCommand, fromNodeId: string, toNodeId: string): DocumentCommand => {
    const currentPage = pageRef.current;
    if (!currentPage || !architecture.model) return command;
    const elementOf = (nodeId: string) => {
      const node = currentPage.nodes.find((candidate) => candidate.id === nodeId);
      return node ? placedElementId(node) : null;
    };
    const from = elementOf(fromNodeId);
    const to = elementOf(toNodeId);
    if (!from || !to || from === to || !session.document) return command;
    const relation = buildArchRelationCommands(session.document, from, to, undefined, { exceptPageId: currentPage.id });
    if (!relation) return command;
    // The drawn connector keeps its minted id (selection follows it) but
    // records which relation it is, so flows and the panel can find it.
    const linked: DocumentCommand = command.kind === 'insert-connector' ? {
      ...command,
      connector: {
        ...command.connector,
        metadata: { ...command.connector.metadata, model: { relationId: relation.relation.id } },
      },
    } : command;
    // Model pages first (they replace the page), then the connector insert:
    // inserting into a page whose `before` snapshot is stale would fail.
    return {
      kind: 'batch',
      id: 'connector-with-relation',
      label: 'Connect elements',
      commands: [...relation.commands, linked],
    };
  }, [architecture, session.document]);

  const architectureActions = useV2ArchitectureActions(
    { architecture, document: session.document, pageRef, readOnly: load.readOnly, mintId: mintV2Id },
    {
      glideToNodes: camera.glideToNodes,
      openPage: setActivePageId,
      selectNodes: (nodeIds) => { applyConnectorSelection([]); applySelection(replaceSelection(nodeIds)); },
      commit: session.commit,
      announce: setAnnouncement,
      compileWorkspace: compileAny,
      compileSequence: compileAny,
    },
  );
  architectureActionsRef.current = architectureActions;
  const workspaceFolder = useV2WorkspaceFolder({
    onLoad: (dsl, snaps) => { setCodeDraft(dsl); void generateCode(dsl, snaps); },
    onToast: (title, tone) => pushToast({ id: `workspace-${Date.now()}`, tone, title }),
  });
  // Committing a view writes the DSL + snaps back to the open folder. The
  // folder is the git-facing artifact; IndexedDB stays the app's storage.
  useEffect(() => {
    if (!workspaceFolder.folder || !session.document || load.readOnly) return;
    const dsl = architecture.model ? architectureWorkspaceText(architecture.model) : null;
    if (!dsl) return;
    const timer = window.setTimeout(() => { void workspaceFolder.save(dsl, session.document!); }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.revision, workspaceFolder.folder, architecture.model, load.readOnly]);
  // A workspace generate commits pages for views that may not exist yet; land
  // on the requested view as soon as the committed document arrives.
  useEffect(() => {
    if (!pendingView || !session.document) return;
    const target = session.document.pages.find((candidate) => archViewIdOfPage(candidate) === pendingView);
    if (target) { setActivePageId(target.id); setPendingView(null); }
  }, [pendingView, session.document]);
  const playback = useV2FlowPlayback({
    model: architecture.model,
    document: session.document,
    page,
    glideToNodes: camera.glideToNodes,
    onOpenPage: setActivePageId,
  });
  const placedElementIds = useMemo(() => new Set(
    (page?.nodes ?? []).flatMap((node) => {
      const elementId = placedElementId(node);
      return elementId ? [elementId] : [];
    }),
  ), [page]);
  const compileAt = useCallback((text: string, origin: Point2d) => compile(text, {
    origin, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon,
    appearance: { palette: preferences.diagramPalette }, autoIcons: preferences.autoIcons,
  }), [preferences.diagramPalette, preferences.autoIcons]);
  const iconActions = useV2IconActions({
    pageRef, readOnly: load.readOnly, commit: session.commit, announce: setAnnouncement,
    compileAt, editElement: architectureActions.editElement,
  });
  const selectedNode = selection.primaryNodeId && page
    ? page.nodes.find((node) => node.id === selection.primaryNodeId)
    : undefined;
  const chartPanelNode = page && chartPanelId
    ? page.nodes.find((node) => node.id === chartPanelId && node.kind === 'chart') ?? null
    : null;
  const openChartData = useCallback((nodeId: string): boolean => {
    const node = pageRef.current?.nodes.find((candidate) => candidate.id === nodeId);
    if (node?.kind !== 'chart') return false;
    setChartPanelId(nodeId);
    setWorkspaceMode(null);
    setShortcutsOpen(false);
    return true;
  }, []);
  const selectedElementId = selectedNode ? placedElementId(selectedNode) : null;
  const perspectiveFocus = useMemo(
    () => (playback.flow ? null : architectureActions.perspectiveFocus(preferences.perspectiveTags)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [architectureActions, playback.flow, preferences.perspectiveTags, page],
  );
  // One spotlight source: flow playback wins while it is open, then tags.
  useEffect(() => {
    if (rendererStatus !== 'ready') return;
    hostRef.current?.setFocus(playback.focus ?? perspectiveFocus);
  }, [playback.focus, perspectiveFocus, rendererStatus]);

  // Local agent pairing: the ops run here, against this session, through the
  // same registry the MCP server uses. Off until the user connects.
  const agentCapabilities = useV2AgentHost({ fitView: camera.fitView, autoIcons: preferences.autoIcons });
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
      applyConnectorSelection([]);
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
    applyConnectorSelection([connectorId]);
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
    selectedConnectorIds,
    mintId: mintV2Id,
    readOnly: load.readOnly,
    applySelection,
    applyConnectorSelection,
    announce: setAnnouncement,
  });

  const iconLibrary = useV2IconLibrary({
    hostRef, pageRef, commit: session.commit, mintId: mintV2Id, openEditor, readOnly: load.readOnly,
  });

  // The icon library hosts emoji on their own tab; I and E open it there.
  const [librarySection, setLibrarySection] = useState<'icons' | 'emoji'>('icons');
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const media = useV2MediaInsert({
    pageRef, commit: session.commit, applySelection, applyConnectorSelection,
    announce: setAnnouncement, mintId: mintV2Id, readOnlyRef,
    centreWorld: () => {
      const bounds = sectionRef.current?.getBoundingClientRect();
      return hostRef.current && bounds
        ? hostRef.current.screenToWorld({ x: bounds.width / 2, y: bounds.height / 2 })
        : { x: 0, y: 0 };
    },
  });
  const pickImageFile = () => imageInputRef.current?.click();
  const onImageChosen = (file: File | undefined) => { if (file) void media.insertImageFile(file); };
  const imageFiles = (list: DataTransfer | null): File[] =>
    Array.from(list?.files ?? []).filter(isImageFile);
  const pointFromEvent = (event: { clientX: number; clientY: number }) => {
    const bounds = sectionRef.current?.getBoundingClientRect();
    return bounds && hostRef.current
      ? hostRef.current.screenToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
      : undefined;
  };
  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    const files = imageFiles(event.dataTransfer);
    if (files.length === 0) return;
    event.preventDefault();
    const at = pointFromEvent(event);
    for (const file of files) void media.insertImageFile(file, at);
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    const files = imageFiles(event.clipboardData);
    if (files.length > 0) {
      event.preventDefault();
      for (const file of files) void media.insertImageFile(file);
      return;
    }
    const text = event.clipboardData.getData('text/plain').trim();
    if (IMAGE_URL_PATTERN.test(text)) {
      event.preventDefault();
      media.insertImageUrl(text);
    }
  };
  const pickChart = (chart: V2ChartKind) => {
    const page = pageRef.current;
    if (!page) return;
    const centre = media.centreWorld();
    const size = DEFAULT_CHART_SIZE;
    const node = createChartNode(page, {
      id: mintV2Id('node'), chart, size,
      at: { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
      ...(chart === 'pie' || chart === 'donut' || chart === 'radar' || chart === 'heatmap'
        ? { data: { categories: ['A', 'B', 'C', 'D', 'E'], series: [{ name: 'Series 1', values: [4, 8, 6, 9, 3] }] } }
        : {}),
      ...(chart === 'quadrant' ? { quadrant: DEFAULT_QUADRANT } : {}),
    });
    session.commit({
      kind: 'insert-node', id: `create-node:${node.id}`, label: 'Add chart',
      pageId: page.id, index: page.nodes.length, node,
    });
    applyConnectorSelection([]);
    applySelection(replaceSelection([node.id]));
    setChartPanelId(node.id);
    setWorkspaceMode(null);
    setShortcutsOpen(false);
    setAnnouncement('Chart added.');
  };
  const pickEmoji = (glyph: string) => {
    media.insertEmoji(glyph);
    const recent = [glyph, ...preferences.recentEmoji.filter((entry) => entry !== glyph)].slice(0, 24);
    updatePreferences({ recentEmoji: recent });
    iconLibrary.setOpen(false);
  };

  const handleKeyDown = useV2Keyboard({
    toolRef, editingRef,
    onToolChange: setTool,
    onToggleIcons: () => {
      setLibrarySection('icons');
      iconLibrary.toggle();
    },
    onToggleEmoji: () => {
      setLibrarySection('emoji');
      iconLibrary.setOpen(true);
    },
    onInsertImage: pickImageFile,
    onUndo: session.undo, onRedo: session.redo,
    // On a C4 view Delete unplaces; the model keeps the element.
    onDelete: () => {
      const nodeIds = selectionRef.current.nodeIds;
      if (architectureActions.unplaceSelection(nodeIds)) return;
      editActions.deleteSelection();
    },
    onRemoveFromModel: () => {
      const elementId = selectedElementId;
      if (!elementId) return;
      architectureActions.removeElement(elementId);
    },
    onDuplicate: editActions.duplicateSelection,
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
    onEditPrimary: (source) => {
      if (load.readOnly) return;
      const primary = selectionRef.current.primaryNodeId;
      if (primary) {
        // Enter on a model object with children drills into its view; F2 or
        // ⌘Enter edits the label instead.
        if (source === 'enter' && selectedElementId && architectureActions.drillInto(selectedElementId)) return;
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
    onCommitGesture: () => gestureApiRef.current?.commitGesture() ?? false,
    onEscapePanel: () => {
      if (!chartPanelId) return false;
      setChartPanelId(null);
      sectionRef.current?.focus({ preventScroll: true });
      return true;
    },
    // Escape chain tail: selection first, then the open agent panel.
    onClearSelection: () => {
      if (selectionRef.current.nodeIds.length > 0 || selectedConnectorIds.length > 0) selectionApi.clearAll();
      else { setWorkspaceMode(null); setShortcutsOpen(false); setTreeOpen(false); }
    },
    onSelectAll: () => selectionApi.selectAll(pageRef.current),
    onFitView: () => camera.fitView(),
    onZoomStep: camera.zoomStep,
    onResetZoom: camera.resetZoom,
    onToggleTree: toggleTree,
    onToggleAgent: toggleAgent,
    onToggleCode: toggleCode,
    onToggleModel: toggleModel,
    onSpacePan: setSpacePan,
  });

  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <div className="ofk-v2" data-testid="v2-editor" data-tool={spacePan ? 'hand' : tool}
        style={{ backgroundColor: canvasColor }}
        data-workspace-open={workspaceMode !== null || shortcutsOpen || chartPanelNode !== null}
        data-left-open={treeOpen || motionOpen}
        data-left-panel={motionOpen ? 'motion' : undefined}
        onKeyDown={(event) => {
          if (playback.flow && !isEditableTarget(event.target)) {
            if (event.key === 'ArrowRight' || event.key === ' ') { playback.next(); event.preventDefault(); return; }
            if (event.key === 'ArrowLeft') { playback.prev(); event.preventDefault(); return; }
            if (event.key === 'Escape') { playback.close(); event.preventDefault(); return; }
          }
          if (event.key === '?' && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, [contenteditable="true"]'))) {
            event.preventDefault(); toggleShortcuts();
          } else handleKeyDown(event);
        }}
        onKeyUp={(event) => { if (event.key === ' ') setSpacePan(false); }}
        onDragOver={(event) => { if (imageFiles(event.dataTransfer).length > 0) event.preventDefault(); }}
        onDrop={handleDrop}
        onPaste={handlePaste}>
        <input ref={imageInputRef} type="file" hidden
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
          onChange={(event) => { onImageChosen(event.target.files?.[0]); event.target.value = ''; }} />
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
              bridge={{ status: agentBridge.status, onOpen: () => openWorkspace('agent') }}
              saveStatus={saveStatus}
              canUndo={session.canUndo} canRedo={session.canRedo}
              readOnly={load.readOnly}
              tool={tool} zoomPercent={camera.zoom} treeOpen={treeOpen}
              onUndo={session.undo} onRedo={session.redo}
              onRetrySave={retrySave} onReload={load.reload} onToast={pushToast}
              workspace={{
                name: workspaceFolder.folder?.name ?? null,
                onOpenFolder: () => { void workspaceFolder.openFolder(); },
                onCloseFolder: workspaceFolder.closeFolder,
              }}
              breadcrumb={architecture.breadcrumb}
              onCrumb={(crumb) => architectureActions.openCrumb(crumb)}
              onOpenAnimation={openMotion}
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
              toolConfig={toolConfig}
              onPickShape={pickShape}
              onPickConnector={pickConnector}
              iconsOpen={iconLibrary.open} onIconsOpenChange={iconLibrary.setOpen} onInsertIcon={iconLibrary.insertIcon}
              onInsertImage={pickImageFile} onPickEmoji={pickEmoji}
              recentEmoji={preferences.recentEmoji} librarySection={librarySection}
              onPickChart={pickChart}
              onZoomIn={() => camera.zoomStep(1.2)}
              onZoomOut={() => camera.zoomStep(1 / 1.2)}
              onZoomTo={camera.zoomTo}
              onFitView={camera.fitView}
              onToggleTree={toggleTree}
            />
            <V2CanvasHost
              page={page} hostRef={hostRef} camera={camera.camera} cameraRef={camera.cameraRef} pageRef={pageRef}
              selectionRef={selectionRef} selectedConnectorIdsRef={selectedConnectorIdsRef} toolRef={toolRef} tool={tool} spacePanRef={spacePanRef}
              toolConfigRef={toolConfigRef} onOpenChartData={openChartData}
              onRemoveIcons={() => iconActions.removeIcons(selectionRef.current.nodeIds)}
              readOnlyRef={readOnlyRef} gestureApiRef={gestureApiRef}
              selection={selection} selectedConnectorId={selectedConnectorId} selectedConnectorIds={selectedConnectorIds}
              editing={editing}
              commit={session.commit}
              applySelection={applySelection} applyConnectorSelection={applyConnectorSelection}
              updateCamera={camera.updateCamera} openEditor={openEditor} openConnectorEditor={openConnectorEditor} onToolChange={setTool} mintId={mintV2Id}
              extendConnectorCommand={extendConnectorCommand}
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
              // Only worked out while the menu is open: both walk the page.
              iconCount={contextMenu ? page.nodes.filter((node) => selection.nodeIds.includes(node.id) && hasIcon(node)).length : 0}
              onRemoveIcons={() => iconActions.removeIcons(selectionRef.current.nodeIds)}
              diagramIcons={contextMenu && selection.nodeIds.length === 1 && iconToggleFrame(page, selection.nodeIds[0]!)
                ? { on: diagramIconsOn(page, selection.nodeIds[0]!) } : null}
              onToggleDiagramIcons={() => {
                const frameId = selectionRef.current.nodeIds[0];
                if (frameId) void iconActions.setDiagramIcons(frameId, !diagramIconsOn(page, frameId));
              }}
              modelElement={selectedElementId && selectedNode ? {
                id: selectedElementId,
                name: selectedNode.content.label as string ?? selectedElementId,
                childView: Boolean(architecture.childViewOf(selectedElementId)
                  && architecture.pageForView(architecture.childViewOf(selectedElementId)!.id)),
              } : null}
              onDrillInto={() => { if (selectedElementId) architectureActions.drillInto(selectedElementId); }}
              onUnplace={() => architectureActions.unplaceSelection(selectionRef.current.nodeIds)}
              onRemoveElement={() => { if (selectedElementId) architectureActions.removeElement(selectedElementId); }}
              onSelectAll={() => selectionApi.selectAll(pageRef.current)}
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
              onShortcuts={toggleShortcuts} agentConnected={agentBridge.status === 'connected'} />
            {page.nodes.length === 0 && page.connectors.length === 0 && !load.readOnly && rendererStatus === 'ready' ? <V2CanvasWelcome onOpen={openWorkspace} /> : null}
            {workspaceMode === 'code' ? <V2CodePanel code={codeDraft} palette={preferences.diagramPalette}
              onPaletteChange={(diagramPalette) => updatePreferences({ diagramPalette })}
              onCodeChange={(value) => { setCodeDraft(value); setCompileDiagnostics([]); }}
              diagnostics={codeDiagnostics} generating={codeGenerating} canvasEdited={codeCanvasEdited}
              {...(foreignSyntax ? { convertFrom: { label: foreignSyntax.label, convert: convertForeign } } : {})}
              onGenerate={() => { void generateCode(); }} onClose={() => { codeAbortRef.current?.abort(); setWorkspaceMode(null); }} /> : null}
            {workspaceMode === 'agent' ? <V2AgentConnect status={agentBridge.status} detail={agentBridge.detail}
              port={preferences.bridgePort} token={preferences.bridgeToken}
              onPortChange={(bridgePort) => updatePreferences({ bridgePort })}
              onTokenChange={(bridgeToken) => updatePreferences({ bridgeToken })}
              onToggle={(connect) => updatePreferences({ agentBridgeEnabled: connect })}
              onClose={() => setWorkspaceMode(null)} /> : null}
            {workspaceMode === 'slides' ? <V2DraftPanel mode={workspaceMode}
              code={codeDraft} onCodeChange={setCodeDraft} slides={slideDraftCount}
              onAddSlide={() => setSlideDraftCount((count) => count + 1)} onClose={() => setWorkspaceMode(null)} /> : null}
            {workspaceMode === 'model' ? (
              <V2ModelPanel
                onOpenCode={() => openWorkspace('code')}
                architecture={architecture}
                documentPages={session.document!.pages.map((candidate) => ({ id: candidate.id, name: candidate.name }))}
                selectedElementId={selectedElementId}
                placedElementIds={placedElementIds}
                perspectiveTags={preferences.perspectiveTags}
                onPerspectiveChange={(tags) => updatePreferences({ perspectiveTags: [...tags] })}
                onNavigate={(crumb) => architectureActions.openCrumb(crumb)}
                onDrillInto={architectureActions.drillInto}
                onSelectElement={(elementId) => {
                  const node = page.nodes.find((candidate) => placedElementId(candidate) === elementId);
                  if (node) {
                    applyConnectorSelection([]);
                    applySelection(replaceSelection([node.id]));
                    camera.glideToNodes([node.id]);
                    return;
                  }
                  const target = architecture.pageForElement(elementId);
                  if (target) { setActivePageId(target.id); setAnnouncement('Opened the view that shows this element.'); }
                  else setAnnouncement('This element is not placed in any view yet.');
                }}
                onEditElement={architectureActions.editElement}
                onRemoveElement={architectureActions.removeElement}
                onPlayFlow={playback.open}
                onClose={() => setWorkspaceMode(null)}
                readOnly={load.readOnly}
                adrs={workspaceFolder.adrs}
              />
            ) : null}
            {playback.flow ? (
              <V2FlowPanel
                playback={playback}
                onClose={playback.close}
                onCopy={(kind) => {
                  if (kind === 'sequence') { void architectureActions.openFlowAsSequence(playback.flow!); return; }
                  const text = playback.exportText(kind);
                  if (!text) return;
                  void navigator.clipboard?.writeText(text).then(
                    () => pushToast({ id: `flow-${kind}`, tone: 'success', title: `${kind === 'mermaid' ? 'Mermaid' : 'PlantUML'} copied to the clipboard.` }),
                    () => pushToast({ id: `flow-${kind}`, tone: 'danger', title: 'Clipboard unavailable.' }),
                  );
                }}
              />
            ) : null}
            {shortcutsOpen ? <V2Shortcuts onClose={() => setShortcutsOpen(false)} /> : null}
            {motionOpen ? (
              <Panel title="Animation export" side="start" className="ofk-motion-panel ofk-v2-layers-panel"
                onClose={() => setMotionOpen(false)}>
                <V2MotionExport document={session.document!} pageId={page.id}
                  onToast={(title, tone) => pushToast({ id: `motion-${Date.now()}`, tone, title })}
                  codeText={codeDraft}
                  onAnimateBlock={(block) => {
                    // The chips write the text hub; the code panel opens on the
                    // other side so the user sees where the block went.
                    setCodeDraft((draft) => writeAnimateBlock(draft, block));
                    setCodeFrameId(null);
                    setWorkspaceMode((mode) => mode ?? 'code');
                  }} />
              </Panel>
            ) : null}
            {chartPanelNode ? (
              <V2ChartDataPanel key={chartPanelNode.id} node={chartPanelNode} pageId={page.id}
                commit={session.commit} onClose={() => setChartPanelId(null)} />
            ) : null}
            {treeOpen ? (
              <V2TreePanel
                key={page.id}
                page={page} selection={selection} selectedConnectorIds={selectedConnectorIds}
                readOnly={load.readOnly}
                onObjectAction={(nodeId, action) => {
                  if (load.readOnly) return;
                  const node = page.nodes.find((item) => item.id === nodeId);
                  if (!node) return;
                  if (action === 'lock') session.commit(buildToggleLockCommand(page, [nodeId]));
                  if (action === 'hide') session.commit({
                    kind: 'set-node', id: `visibility:${nodeId}`, label: node.content.sectionHidden ? 'Show object' : 'Hide object',
                    pageId: page.id, before: node,
                    after: { ...node, content: { ...node.content, sectionHidden: !node.content.sectionHidden } },
                  });
                  if (action === 'duplicate') {
                    const command = buildDuplicateSelectionCommand(page, [nodeId], page.connectors.map((item) => item.id), mintV2Id);
                    session.commit(command);
                    applyConnectorSelection([]);
                    applySelection(replaceSelection(command.commands.flatMap((item) => item.kind === 'insert-node' ? [item.node.id] : [])));
                  }
                  if (action === 'delete') {
                    if (!architectureActions.unplaceSelection([nodeId])) session.commit(buildDeleteSelectionCommand(page, [nodeId], []));
                    applySelection(clearSelection());
                  }
                }}
                onConnectorMenu={(connectorId, x, y) => {
                  applySelection(clearSelection());
                  applyConnectorSelection([connectorId]);
                  setContextMenu({ kind: 'connector', id: connectorId, x, y });
                }}
                onConnectorAction={(connectorId, action) => {
                  if (load.readOnly) return;
                  const command = buildConnectorObjectAction(page, connectorId, action, mintV2Id);
                  if (!command) return;
                  session.commit(command);
                  applySelection(clearSelection());
                  applyConnectorSelection(command.kind === 'insert-connector' ? [command.connector.id] : []);
                }}
                onSelectNode={(nodeId, additive) => {
                  applyConnectorSelection([]);
                  applySelection(additive ? toggleSelection(selection, nodeId) : replaceSelection([nodeId]));
                }}
                onSelectConnector={(connectorId) => {
                  applySelection(clearSelection());
                  applyConnectorSelection([connectorId]);
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
