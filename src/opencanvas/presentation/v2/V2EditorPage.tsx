import { C4_STARTER } from '../../../agent/starterTemplates';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { clearSelection, replaceSelection, toggleSelection } from '../../application/selection/selection';
import { useDocumentSession } from '../../application/session/useDocumentSession';
import type { PixiRendererHost, PixiRendererStatus } from '../../infrastructure/pixi/PixiRendererHost';
import { createV2Repository } from '../../../services/storage/v2/v2Repository';
import { isImageFile } from '../../../services/storage/assets';
import { looksLikeMermaid } from '../../../services/dsl/mermaidToDsl';
import { elkDslLayoutPort } from '../../../services/elk-layout/runtime';
import { resolveDslIcon } from '../../../services/dsl/iconResolver';
import { findStarterTemplate } from '../../../agent/starterTemplates';
import { compileSource } from '../../../agent/compileSource';
import { compile, compileWorkspace, type CompileWorkspaceResult } from '../../../dsl/compile';
import { dslFrames } from '../../../dsl/frameScene';
import { dslFrameMeta } from '../../../dsl/sceneMeta';
import { dslFamilyDirection } from '../../../dsl/vocabulary';
import type { LandingDirection } from '../../domain/camera/readableLanding';
import { shortcutGroups } from './v2Shortcuts';
import { writeAnimateBlock } from '../../../dsl/animate';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import { archFrameOf, placedElementId } from '../../../dsl/model/model';
import { selectedFrameIds } from '../../application/ai/assistantContext';
import { buildConnectorObjectAction } from '../../application/active-document/connectorActions';
import { buildArchRelationCommands } from '../../application/dsl/architectureCommands';
import { hasIcon } from '../../application/dsl/iconCommands';
import { buildDeleteSelectionCommand, buildDuplicateSelectionCommand, buildToggleLockCommand } from '../../domain/commands/sceneEdits';
import type { DocumentCommand } from '../../domain/commands/types';
import { commandTouchesPage } from '../../domain/commands/pageTouch';
import type { ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import { EmptyState, Button, ErrorState, Panel, SystemRoot, ToastRegion, type ToastItem } from '../design-system';
import { V2StateHero } from './V2StateHero';
import { V2AgentConnect } from './V2AgentConnect';
import { V2AgentPanel } from './V2AgentPanel';
import { V2CanvasHost } from './V2CanvasHost';
import { V2ChartDataPanel } from './V2ChartDataPanel';
import { V2Chrome } from './V2Chrome';
import { V2CodePanel } from './V2CodePanel';
import { V2ContextMenu, type ContextMenuTarget } from './V2ContextMenu';
import type { V2Tool } from './V2CreationToolbar';
import { V2ExportMenu } from './V2ExportMenu';
import { V2FeatureTip } from './V2FeatureTip';
import { V2FindBar } from './V2FindBar';
import { V2FlowPanel } from './V2FlowPanel';
import { V2LoadCenter } from './V2LoadCenter';
import { V2ModelPanel } from './V2ModelPanel';
import { V2InspectPanel } from './V2InspectPanel';
import { inspectSelection } from '../../domain/scene/inspect';
import { V2MotionExport } from './V2MotionExport';
import { V2TreePanel } from './V2TreePanel';
import { V2CanvasWelcome, V2Shortcuts, V2ShareBar, V2WorkspaceRail } from './V2Workspace';
import { isEditableTarget } from './pointerOperations';
import { useV2AgentBridge } from './useV2AgentBridge';
import { useV2AgentHost } from './useV2AgentHost';
import { useV2AiSettings } from './useV2AiSettings';
import { useV2Appearance } from './useV2Appearance';
import { useV2Architecture } from './useV2Architecture';
import { useV2ArchitectureActions } from './useV2ArchitectureActions';
import { useV2Assistant } from './useV2Assistant';
import { useV2Autosave } from './useV2Autosave';
import { useV2Camera } from './useV2Camera';
import { useV2CodeWorkspace } from './useV2CodeWorkspace';
import { useV2ConnectorLabelEditing } from './useV2ConnectorLabelEditing';
import { useV2DocumentLoad } from './useV2DocumentLoad';
import { useV2EditActions } from './useV2EditActions';
import { useV2EditorNotices } from './useV2EditorNotices';
import { useV2FeatureTips } from './useV2FeatureTips';
import { useV2Find } from './useV2Find';
import { useV2FlowPlayback } from './useV2FlowPlayback';
import { diagramIconsOn, iconToggleFrame, useV2IconActions } from './useV2IconActions';
import { useV2IconLibrary } from './useV2IconLibrary';
import { useV2Inserts } from './useV2Inserts';
import { useV2Keyboard } from './useV2Keyboard';
import { useV2LabelEditing, type OpenEditorOptions } from './useV2LabelEditing';
import { useV2MapMode } from './map/useV2MapMode';
import { buildPinPageCommand } from '../../application/map/pinPage';
import { useV2RepoDocument, useV2RepoPanel } from './useV2RepoDocument';
import { BadRepoAddress, V2RepoMapOverlay } from './map/V2RepoMapState';
import { V2MapStart } from './map/V2MapStart';
import { IMAGE_URL_PATTERN, useV2MediaInsert } from './useV2MediaInsert';
import { useV2Pages } from './useV2Pages';
import { useV2Panels } from './useV2Panels';
import type { V2GestureApi } from './v2PointerGestures';
import { useV2Preferences } from './useV2Preferences';
import { useV2Proposal } from './useV2Proposal';
import { useV2ProposalPreview } from './useV2ProposalPreview';
import { useV2Selection } from './useV2Selection';
import { useV2TestApi } from './useV2TestApi';
import { useV2WorkspaceFolder } from './useV2WorkspaceFolder';
import { firstV2Page, isV2StartIntent, mintV2Id, rememberLastDocument } from './v2Document';
import { downloadTextFile, type V2ExportScope } from './v2Export';
import type { V2TipId } from './v2FeatureTips';
import { scheduleV2Thumbnail } from './v2Thumbnail';
import { DEFAULT_TOOL_CONFIG, type V2ConnectorTool, type V2ToolConfig } from './v2ToolCatalog';
import type { ShapeKind } from '../../domain/nodes/shapeNode';
import { TURNSTILE_SITE_KEY } from '../../../services/share/turnstile';
import type { SceneDocumentV1 } from '../../domain/document/types';
import './v2EditorPage.css';

const imageFiles = (list: DataTransfer | null): File[] => Array.from(list?.files ?? []).filter(isImageFile);

/** A shared link opens here: the decrypted document, read-only, never stored; `onEdit` saves a local copy. */
export interface V2SharedView { readonly document: SceneDocumentV1; readonly onEdit: () => Promise<void> }

export function V2EditorPage({ shared }: { readonly shared?: V2SharedView } = {}): React.JSX.Element {
  // Under /s/:id the route's id is the share's, not a stored document's.
  const routeId = useParams().id;
  const id = shared ? undefined : routeId;
  // Fit-once needs a stable key; a shared document has no stored id.
  const fitKey = id ?? (shared ? `shared:${shared.document.id}` : undefined);
  useEffect(() => { if (id) rememberLastDocument(id); }, [id]);
  const { preferences, updatePreferences } = useV2Preferences();
  const panels = useV2Panels();
  const appearance = useV2Appearance(preferences.theme);
  const canvasDefaultColor = appearance === 'dark' ? '#191b19' : '#f7f7f5';
  const canvasColor = preferences.canvasColor ?? canvasDefaultColor;
  const repository = useMemo(
    () => createV2Repository(typeof window === 'undefined' ? null : window.indexedDB),
    []
  );
  const hostRef = useRef<PixiRendererHost | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const gestureApiRef = useRef<V2GestureApi | null>(null);
  const focusCanvas = useCallback(() => sectionRef.current?.focus(), []);
  // Shortcuts listen on the editor, so with focus on <body> (a fresh load, a panel that closed with no opener to
  // return to, a click on bare chrome) every key went nowhere. Hand those keys to the canvas.
  useEffect(() => {
    const forward = (event: KeyboardEvent) => {
      const canvas = sectionRef.current;
      if (event.target !== document.body || !canvas) return;
      const copy = new KeyboardEvent('keydown', event);
      canvas.dispatchEvent(copy);
      if (copy.defaultPrevented) event.preventDefault();
    };
    document.addEventListener('keydown', forward);
    return () => document.removeEventListener('keydown', forward);
  }, []);
  const [tool, setTool] = useState<V2Tool>('select');
  // Which variant a flyout tool draws with; its grid marks the last pick.
  const [toolConfig, setToolConfig] = useState<V2ToolConfig>(DEFAULT_TOOL_CONFIG);
  const [spacePan, setSpacePan] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
  // Export is one panel with two doors: the canvas menu (Page) and an element's
  // context menu (Selection + its subtree). One instance, so both share state.
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<V2ExportScope>('page');
  const [exportPoint, setExportPoint] = useState<{ readonly x: number; readonly y: number } | null>(null);
  const exportPointRef = useRef<HTMLDivElement | null>(null);
  const exportAnchorRef = useRef<HTMLElement | null>(null);
  // Which door opened it: the bar at the right edge opens toward the inside, Share shows only the link.
  const [exportDoor, setExportDoor] = useState<'menu' | 'menu-share' | 'bar-export' | 'bar-share'>('menu');
  const openExport = (anchor: HTMLElement | null, scope: V2ExportScope, door: typeof exportDoor = 'menu') => {
    exportAnchorRef.current = anchor;
    setExportScope(scope);
    setExportDoor(door);
    setExportOpen(true);
  };
  const toggleBarPanel = (anchor: HTMLElement, door: 'bar-export' | 'bar-share') => {
    if (exportOpen && exportDoor === door) setExportOpen(false);
    else openExport(anchor, 'page', door);
  };
  const canShare = !shared && Boolean(TURNSTILE_SITE_KEY);
  // The context menu is still open here; the panel takes over its click point.
  const openElementExport = () => {
    const point = contextMenu;
    if (!point || point.kind === 'canvas') return;
    setExportPoint({ x: point.x, y: point.y });
    openExport(exportPointRef.current, 'selection');
  };
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [rendererStatus, setRendererStatus] = useState<PixiRendererStatus>('initializing');
  const rendererReady = rendererStatus === 'ready';

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
  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);
  useV2EditorNotices(pushToast);
  const navigate = useNavigate();

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
  useEffect(() => {
    pageRef.current = page;
  });
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const architecture = useV2Architecture(session.document, page);
  const notify = (message: string) => { setAnnouncement(message); pushToast({ id: `map-${Date.now()}`, tone: 'info', title: message }); };
  const location = useLocation();
  const startIntent = isV2StartIntent(location.state) ? location.state : null;
  const repo = useV2RepoDocument(session.document, startIntent);
  // Only the repo's own map page is locked and drawn as a map; its other pages are ordinary Canvas pages.
  const repoPage = repo.lockedPageId !== null && page?.id === repo.lockedPageId;
  // "This is the repo page", not "this is a repo document": a page added to a repo document is an ordinary one.
  const repoSource = repoPage ? repo.source : null;
  // Every write goes through here: one that touches the repo's own page (an agent addressing it, a proposal applied after the reader
  // left it) or any write to a document whose lock is broken is refused, with no undo entry.
  const lockRef = useRef({ id: repo.lockedPageId, broken: repo.broken });
  useEffect(() => { lockRef.current = { id: repo.lockedPageId, broken: repo.broken }; });
  const sessionCommit = session.commit;
  const commit = useCallback((command: DocumentCommand) => {
    const { id, broken } = lockRef.current;
    if (broken || (id !== null && commandTouchesPage(command, id))) { setAnnouncement('The repo map is read-only'); return; }
    sessionCommit(command);
  }, [sessionCommit]);
  const load = useV2DocumentLoad({
    documentId: id,
    initialize: repo.initialize,
    repository,
    fixed: shared?.document,
    openDocument: session.openDocument,
    onRecovered: () => pushToast({ id: 'recovered', tone: 'warning', title: 'Recovered from the last good backup.' }),
  });
  // Map mode: a lens on the page's model. The canvas draws `viewPage`; commands, undo and autosave still see `page`.
  const docReadOnly = load.readOnly || repo.broken || repoPage;
  const { openWorkspace } = panels;
  const code = useV2CodeWorkspace({
    document: session.document, page, pageRef, hostRef, readOnly: docReadOnly,
    palette: preferences.diagramPalette, autoIcons: preferences.autoIcons,
    onPaletteChange: useCallback((diagramPalette) => updatePreferences({ diagramPalette }), [updatePreferences]),
    commit: commit, applySelection, fitView: camera.fitView,
    openPanel: useCallback(() => openWorkspace('code'), [openWorkspace]),
    onViews: setPendingPageId, pushToast, dismissToast, announce: setAnnouncement,
  });
  const toggleCode = () => { if (panels.workspace === 'code') panels.closeWorkspace(); else code.openNew(); };
  // Map's start screen is for a document that is editable and has no model on any page (a model page elsewhere keeps the old rule).
  const modelled = useMemo(() => session.document?.pages.some((candidate) => archFrameOf(candidate) !== null) ?? false, [session.document]);
  // A model being written (the start screen's action) keeps Map on until its page is the one on screen (generating, then the page switch pending).
  const startable = !load.readOnly && !shared && repo.lockedPageId === null && (!modelled || code.generating || pendingPageId !== null);
  const pinRef = useRef<() => void>(() => undefined);
  // Map cannot edit the drawing: a blocked edit explains why (set below, once the selection is known).
  const explainMapRef = useRef<() => void>(() => undefined);
  const map = useV2MapMode({
    onPin: () => pinRef.current(),
    onBlockedEdit: () => explainMapRef.current(),
    panelsKey: [panels.workspace, panels.shortcutsOpen, panels.chartId, panels.treeOpen, panels.motionOpen].join(),
    selectedIds: () => selectionRef.current.nodeIds,
    glide: camera.animateTo,
    page, documentId: session.document?.id, repo: repoSource ? { model: repo.state.model } : null, startable, palette: preferences.diagramPalette, autoIcons: preferences.autoIcons, hostRef,
    cameraRef: camera.cameraRef, updateCamera: camera.updateCamera, fitView: camera.fitView, onToolChange: setTool,
    primaryId: () => selectionRef.current.primaryNodeId,
    select: (id) => { applyConnectorSelection([]); applySelection(replaceSelection([id])); },
    clearSelection: () => selectionApi.clearAll(),
    selectedNodeId: selection.nodeIds.length === 1 && selectedConnectorIds.length === 0 ? selection.nodeIds[0]! : null,
    selectedConnectorId: selection.nodeIds.length === 0 ? selectedConnectorId : null,
    cancelTransient: () => {
      if (gestureApiRef.current?.cancelGesture()) return true;
      if (escapePanel()) return true;
      if (toolRef.current === 'select') return false;
      setTool('select');
      return true;
    },
    closeChart: () => panels.closeChart(),
    notify,
  });
  // Choosing a Create tool on Map's start screen goes back to Canvas with it armed.
  const leaveStart = <A extends unknown[], R>(action: (...args: A) => R) => (...args: A): R => {
    if (map.start) map.choose('canvas');
    return action(...args);
  };
  const viewPage = map.mapPage ?? page;
  // Export, like the canvas, takes what is on screen: in Map mode the map's scene stands in for the page.
  const exportDocument = useMemo(() => {
    const document = session.document;
    if (!document || !page || !map.mapPage || map.start) return document;
    return { ...document, pages: document.pages.map((candidate) => (candidate.id === page.id ? { ...map.mapPage!, id: page.id } : candidate)) };
  }, [session.document, page, map.mapPage, map.start]);
  const undo = () => {
    const undone = session.canUndo;
    session.undo();
    if (undone && map.active) notify('Undid last change');
  };
  const escapePanel = () => {
    if (!panels.chartId) return false;
    panels.closeChart();
    sectionRef.current?.focus({ preventScroll: true });
    return true;
  };
  const architectureActionsRef = useRef<ReturnType<typeof useV2ArchitectureActions> | null>(null);
  const labelEditing = useV2LabelEditing({
    hostRef,
    page,
    camera: camera.camera,
    commit: commit,
    announce: setAnnouncement,
    focusCanvas,
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
    reloadRef.current = load.reload;
  }, [load.reload]);
  const readOnlyRef = useRef(load.readOnly);
  // Map mode is read-only for geometry: its box ids are the Canvas page's node ids, so any edit that got through
  // would land on the Canvas node of the same id.
  // Pin as page: the map as drawn now becomes a plain Canvas page, one undo step. It adds a page, not a model edit,
  // the repo map's own page is read-only, but pinning only adds a page, so it is offered there; a shared view (load.readOnly) is not.
  const pinnable = !load.readOnly && map.active && map.mapPage !== null && map.mapPage.nodes.length > 0;
  pinRef.current = () => {
    const document = session.document;
    const mapPage = map.mapPage;
    if (!pinnable || !document || !mapPage) return;
    const open = map.state().open;
    const single = open.length === 1 && map.model ? map.model.nodes[open[0]!]?.name : undefined;
    const pageId = mintV2Id('page');
    commit(buildPinPageCommand(document, mapPage, { pageId, name: `${single ?? document.name} (pinned)` }));
    setActivePageId(pageId);
    map.setMode('canvas');
    setAnnouncement('Map copied to a new Canvas page to edit as a drawing');
  };
  const editLocked = docReadOnly || map.active;
  useEffect(() => { readOnlyRef.current = editLocked; }, [editLocked]);

  // The viewer's way in to editing (document bar) is a local, editable copy.
  useEffect(() => {
    if (!shared || load.phase !== 'ready') return;
    pushToast({ id: 'shared-view', tone: 'info', title: 'Shared diagram, read-only.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opened link
  }, [load.phase, shared?.document]);


  // Home hands a new diagram what to start with; run it once the empty document is open.
  useEffect(() => {
    if (!startIntent || load.phase !== 'ready' || !page) return;
    navigate(location.pathname, { replace: true, state: null });
    if ('start' in startIntent) openWorkspace(startIntent.start);
    else if ('source' in startIntent) code.startFrom(startIntent.source);
    else if ('template' in startIntent) { // a repoMap intent needs nothing here: the document was born with its source
      const template = findStarterTemplate(startIntent.template);
      if (template) code.startFrom(template.dsl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per intent
  }, [startIntent, load.phase, page === null]);

  const { status: saveStatus, retry: retrySave } = useV2Autosave({
    repository,
    documentId: id ?? null,
    document: session.document,
    revision: session.revision,
    baseRevision: load.baseRevision,
    onConflict: () => setAnnouncement('Another tab saved first. Reload to continue.'),
    onSaved: (saved) => { if (id) scheduleV2Thumbnail(repository, id, saved); },
  });

  // What the assistant writes: DSL, or Mermaid, Structurizr or D2, read as the code panel and the MCP tools read them.
  const compileDraft = useCallback(
    (text: string) => compileSource(text, { origin: { x: 0, y: 0 }, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon, autoIcons: preferences.autoIcons }),
    [preferences.autoIcons]);
  const compileAny = useCallback(
    (text: string): Promise<CompileWorkspaceResult> => compileWorkspace(text, {
      origin: { x: 0, y: 0 }, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon,
      appearance: { palette: preferences.diagramPalette }, autoIcons: preferences.autoIcons,
    }),
    [preferences.diagramPalette, preferences.autoIcons]);
  const proposal = useV2Proposal({
    document: session.document, revision: session.revision, pageId: page?.id ?? null,
    commit: commit, readOnly: docReadOnly,
    announce: setAnnouncement, compileDsl: compileDraft,
  });

  useV2TestApi({
    hostRef, selectionRef, toolRef, selectedConnectorIds,
    document: session.document, revision: session.revision, saveStatus, proposal, mapState: map.state, mapMotion: map.motionStats, mapOpen: map.openBoxes,
  });

  // ponytail: direction of the page's last diagram — a reply with mixed directions lands on the last one.
  const landingDirection = (): LandingDirection => {
    const last = pageRef.current ? dslFrames(pageRef.current).at(-1) : undefined;
    const meta = last ? dslFrameMeta(last) : null;
    return (meta?.direction as LandingDirection | undefined) ?? (meta ? dslFamilyDirection(meta.family) : 'down');
  };
  useEffect(() => {
    camera.fitOnOpen(rendererStatus, session.document, fitKey, session.revision, landingDirection());
  }, [rendererStatus, session.document, session.revision, fitKey, camera]);

  const ghostPage = useV2ProposalPreview(proposal, hostRef, rendererReady, camera.revealBounds);

  const pages = useV2Pages({
    document: session.document, pageId: page?.id ?? null, readOnly: load.readOnly || repo.broken, lockedPageId: repo.lockedPageId,
    commit: commit, onSelect: setActivePageId, mintId: mintV2Id,
    announce: setAnnouncement,
  });
  // A page switch lands on that page's content, readable (never below the label floor);
  // the canvas only ever renders one page, so the landing is already page-scoped.
  const fittedPageRef = useRef<string | null>(null);
  // A new document opens through fitOnOpen, not as a page switch.
  useEffect(() => { fittedPageRef.current = null; }, [fitKey]);
  useEffect(() => {
    if (!page || !rendererReady) return;
    if (fittedPageRef.current === page.id) return;
    const first = fittedPageRef.current === null;
    fittedPageRef.current = page.id;
    if (!first && !map.active) camera.landReadable(landingDirection());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id, rendererReady]);

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
    const relation = buildArchRelationCommands(session.document, from, to, undefined, { exceptPageId: currentPage.id, create: true });
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
    { architecture, document: session.document, pageRef, readOnly: docReadOnly, mintId: mintV2Id },
    {
      glideToNodes: camera.glideToNodes,
      openPage: setActivePageId,
      selectNodes: (nodeIds) => { applyConnectorSelection([]); applySelection(replaceSelection(nodeIds)); },
      commit: commit,
      announce: setAnnouncement,
      compileWorkspace: compileAny,
      compileSequence: compileAny,
      openInMap: map.enterMapAt,
    },
  );
  architectureActionsRef.current = architectureActions;
  const workspaceFolder = useV2WorkspaceFolder({
    onLoad: (dsl, snaps) => { code.setDraft(dsl); void code.generate(dsl, snaps); },
    onToast: (title, tone) => pushToast({ id: `workspace-${Date.now()}`, tone, title }),
  });
  // Committing a view writes the DSL + snaps back to the open folder. The
  // folder is the git-facing artifact; IndexedDB stays the app's storage.
  useEffect(() => {
    if (!workspaceFolder.folder || !session.document || docReadOnly) return;
    const dsl = architecture.model ? architectureWorkspaceText(architecture.model) : null;
    if (!dsl) return;
    const timer = window.setTimeout(() => { void workspaceFolder.save(dsl, session.document!); }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.revision, workspaceFolder.folder, architecture.model, docReadOnly]);
  // A workspace generate commits pages that may not exist yet; land on the
  // requested one as soon as the committed document arrives.
  useEffect(() => {
    if (!pendingPageId || !session.document?.pages.some((candidate) => candidate.id === pendingPageId)) return;
    setActivePageId(pendingPageId);
    setPendingPageId(null);
  }, [pendingPageId, session.document]);
  const playback = useV2FlowPlayback({
    model: architecture.model,
    document: session.document,
    page,
    glideToNodes: camera.glideToNodes,
    onOpenPage: setActivePageId,
  });
  const placedElementIds = useMemo(() => new Set(
    (viewPage?.nodes ?? []).flatMap((node) => {
      const elementId = placedElementId(node);
      return elementId ? [elementId] : [];
    }),
  ), [viewPage]);
  const canvasElementIds = useMemo(() => new Set((page?.nodes ?? []).flatMap((node) => {
    const elementId = placedElementId(node);
    return elementId ? [elementId] : [];
  })), [page]);
  const showOnCanvas = (elementId: string) => map.choose('canvas', elementId);
  // "Edit in model": the model panel opens on the element's card with its name ready to type.
  const [renameRequest, setRenameRequest] = useState<{ readonly id: string } | null>(null);
  const editInModel = (elementId: string) => { setRenameRequest({ id: elementId }); openWorkspace('model'); };
  // Spent once the panel closes: reopening it from the rail is not another rename.
  useEffect(() => { if (panels.workspace !== 'model') setRenameRequest(null); }, [panels.workspace]);
  // A double-click on a Map box: the drawing cannot change, so the box opens where it can (a repo box has only details).
  const editBox = (id: string) => {
    const box = map.mapPage?.nodes.find((node) => node.id === id);
    const elementId = box ? placedElementId(box) : null;
    if (elementId && !docReadOnly) editInModel(elementId); else openWorkspace('model');
  };
  // Once per visit to Map: the first edit that cannot happen says why, and where it can.
  // Map's start screen writes a model: its panel opens once the model is there, never on an empty "create one" state.
  const [modelPanelOnStart, setModelPanelOnStart] = useState(false);
  useEffect(() => {
    if (modelPanelOnStart && architecture.model) { setModelPanelOnStart(false); openWorkspace('model'); }
  }, [modelPanelOnStart, architecture.model, openWorkspace]);
  const explainedMap = useRef(false);
  useEffect(() => { if (!map.active) explainedMap.current = false; }, [map.active]);
  const compileAt = useCallback((text: string, origin: Point2d) => compile(text, {
    origin, layout: elkDslLayoutPort, resolveIcon: resolveDslIcon,
    appearance: { palette: preferences.diagramPalette }, autoIcons: preferences.autoIcons,
  }), [preferences.diagramPalette, preferences.autoIcons]);
  const iconActions = useV2IconActions({
    pageRef, readOnly: editLocked, commit: commit, announce: setAnnouncement,
    compileAt, document: session.document, setModelIcons: architectureActions.setModelIcons,
  });
  const selectedNode = selection.primaryNodeId && viewPage
    ? viewPage.nodes.find((node) => node.id === selection.primaryNodeId)
    : undefined;
  const chartPanelNode = page && panels.chartId
    ? page.nodes.find((node) => node.id === panels.chartId && node.kind === 'chart') ?? null
    : null;
  const { openChart } = panels;
  const openChartData = useCallback((nodeId: string): boolean => {
    if (pageRef.current?.nodes.find((candidate) => candidate.id === nodeId)?.kind !== 'chart') return false;
    openChart(nodeId);
    return true;
  }, [openChart]);
  const selectedElementId = selectedNode ? placedElementId(selectedNode) : null;
  explainMapRef.current = () => {
    if (explainedMap.current || load.readOnly) return;
    explainedMap.current = true;
    const elementId = !docReadOnly ? selectedElementId : null;
    const copy = pinnable ? { action: { label: 'Edit as drawing', onClick: () => pinRef.current() } } : {};
    pushToast(repoSource
      ? { id: 'map-read-only', tone: 'info', title: 'This map is read from the code.', description: 'To move boxes and draw, use Edit as drawing.', ...copy }
      : { id: 'map-read-only', tone: 'info', title: 'Map lays itself out.',
        description: 'Edit boxes in the model panel, or use Edit as drawing to move them.',
        ...(elementId ? { action: { label: 'Edit in model', onClick: () => editInModel(elementId) } } : copy) });
  };
  // The deeper view of the selected element, when its page exists.
  const deeperView = selectedElementId ? architecture.childViewOf(selectedElementId) : null;
  const zoomInto = deeperView && architecture.pageForView(deeperView.id) && selectedElementId
    ? { name: deeperView.name, open: () => { architectureActions.drillToMap(selectedElementId); } } : null;
  const repoPanel = useV2RepoPanel({
    source: repoSource, map, selectedConnectorId,
    selectedBoxId: selection.nodeIds.length === 1 ? selection.nodeIds[0]! : null,
    selectArrow: (key) => { applySelection(replaceSelection([])); applyConnectorSelection([key]); },
  });
  // A Map arrow stands for every relation between the two boxes and their insides; the Model panel lists them.
  const c4Arrow = useMemo(() => {
    const connector = map.active && !repoSource && selectedConnectorId ? viewPage?.connectors.find((c) => c.id === selectedConnectorId) : undefined;
    const meta = connector?.metadata.map as { relations?: string[]; both?: boolean } | undefined;
    const relations = meta?.relations;
    return connector?.source.nodeId && connector.target.nodeId && relations
      ? { from: connector.source.nodeId, to: connector.target.nodeId, relationIds: relations, both: meta?.both === true } : null;
  }, [map.active, repoSource, selectedConnectorId, viewPage]);
  const mapArrow = repoPanel.arrow ?? c4Arrow;
  useEffect(() => { if (mapArrow) openWorkspace('model'); }, [mapArrow, openWorkspace]);
  const perspectiveFocus = useMemo(
    () => (playback.flow ? null : architectureActions.perspectiveFocus(preferences.perspectiveTags)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [architectureActions, playback.flow, preferences.perspectiveTags, page],
  );
  // One spotlight source: flow playback wins while it is open, then tags. Map mode has its own, from its selection.
  useEffect(() => {
    if (rendererReady && !map.active) hostRef.current?.setFocus(playback.focus ?? perspectiveFocus);
  }, [playback.focus, perspectiveFocus, rendererReady, map.active]);

  // Local agent pairing: the ops run here, against this session, through the
  // same registry the MCP server uses. Off until the user connects.
  const agentCapabilities = useV2AgentHost({ fitView: camera.fitView, autoIcons: preferences.autoIcons });
  const aiSettings = useV2AiSettings();
  const loadGrammar = useCallback(async () => String(await agentCapabilities.syntax()), [agentCapabilities]);
  const assistant = useV2Assistant({
    documentId: id ?? null, page, selectedIds: selection.nodeIds,
    settings: aiSettings.settings, proposal, loadGrammar,
    tools: { document: session.document, capabilities: agentCapabilities, compile: compileDraft },
    undo: session.undo, announce: setAnnouncement,
    // The committed page arrives next frame; land on it once it has.
    // The committed page arrives next frame; land on what was drawn (a removal leaves the camera alone).
    onApplied: (nodeIds) => requestAnimationFrame(() => {
      if (!nodeIds.length || !camera.landReadable(landingDirection(), nodeIds)) return;
      const fit = shortcutGroups().flatMap(({ rows }) => rows).find(({ label }) => label === 'Zoom to fit')?.keys;
      pushToast({ id: `ai-landing-${Date.now()}`, tone: 'info', title: `Zoomed in to read. Press ${fit} to see it all.` });
    }),
  });
  const diagramCount = useMemo(() => (page ? dslFrames(page).length : 0), [page]);
  const selectedDiagramCount = useMemo(() => (page ? selectedFrameIds(page, selection.nodeIds).length : 0), [page, selection.nodeIds]);
  const agentBridge = useV2AgentBridge({
    enabled: preferences.agentBridgeEnabled, readOnly: load.readOnly || repo.broken, lockedPageId: repo.lockedPageId,
    port: preferences.bridgePort,
    token: preferences.bridgeToken,
    document: session.document,
    pageId: page?.id ?? null,
    revision: session.revision,
    capabilities: agentCapabilities,
    commit: commit,
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
  const connectorLabel = useV2ConnectorLabelEditing({
    document: session.document,
    pageRef, hostRef, cameraRef: camera.cameraRef, readOnly: editLocked, selectedConnectorId,
    commit: commit, applySelection, applyConnectorSelection, focusCanvas, announce: setAnnouncement,
  });

  const editActions = useV2EditActions({
    commit: commit,
    pageRef,
    selectionRef,
    selectedConnectorIds,
    mintId: mintV2Id,
    readOnly: editLocked,
    applySelection,
    applyConnectorSelection,
    announce: setAnnouncement,
  });

  const iconLibrary = useV2IconLibrary({
    hostRef, pageRef, commit: commit, mintId: mintV2Id, openEditor, readOnly: editLocked,
  });

  // The icon library hosts emoji on their own tab; I and E open it there.
  const [librarySection, setLibrarySection] = useState<'icons' | 'emoji'>('icons');
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const media = useV2MediaInsert({
    pageRef, commit: commit, applySelection, applyConnectorSelection,
    announce: setAnnouncement, mintId: mintV2Id, readOnlyRef,
    centreWorld: () => {
      const bounds = sectionRef.current?.getBoundingClientRect();
      return hostRef.current && bounds
        ? hostRef.current.screenToWorld({ x: bounds.width / 2, y: bounds.height / 2 })
        : { x: 0, y: 0 };
    },
  });
  const inserts = useV2Inserts({
    pageRef, readOnlyRef, selectionRef, commit: commit, applySelection, applyConnectorSelection,
    centreWorld: media.centreWorld, setTool, openEditor, openChart, announce: setAnnouncement,
  });
  const pickImageFile = () => imageInputRef.current?.click();
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
  const pastedMermaidRef = useRef('');
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
    } else if (looksLikeMermaid(text)) {
      // Mermaid on the canvas has nowhere to go; point at the panel that draws it.
      pastedMermaidRef.current = text;
      tips.offer('mermaid');
    }
  };
  const [moreOpen, setMoreOpen] = useState(false);
  const pickEmoji = (glyph: string) => {
    media.insertEmoji(glyph);
    const recent = [glyph, ...preferences.recentEmoji.filter((entry) => entry !== glyph)].slice(0, 24);
    updatePreferences({ recentEmoji: recent });
    iconLibrary.setOpen(false);
  };

  const find = useV2Find({
    page: viewPage, selectionRef, selectedConnectorIdsRef, cameraRef: camera.cameraRef,
    applySelection, applyConnectorSelection,
    glideToNodes: camera.glideToNodes, animateTo: camera.animateTo, focusCanvas,
    ...(map.findSource && repoPanel.drawn ? { source: map.findSource } : {}),
  });

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
    onInsertFrame: () => inserts.insertFrame('frame'),
    onInsertSticky: inserts.insertSticky,
    onToggleMore: () => setMoreOpen((open) => !open),
    // A Canvas edit undone from the map would otherwise vanish unseen.
    onUndo: undo,
    onRedo: session.redo,
    // On a C4 view Delete unplaces; the model keeps the element.
    onDelete: () => {
      if (editLocked) return;
      if (architectureActions.unplaceSelection(selectionRef.current.nodeIds)) return;
      editActions.deleteSelection();
    },
    // A model edit, not a drawing edit: Map allows it, as its panel does.
    onRemoveFromModel: () => {
      if (!docReadOnly && selectedElementId) architectureActions.removeElement(selectedElementId);
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
      const primary = selectionRef.current.primaryNodeId;
      // Enter on a model object with a deeper view opens it in Map (or its view page), even read-only;
      // F2 or ⌘Enter edits the label instead.
      if (primary && source === 'enter' && selectedElementId && architectureActions.drillToMap(selectedElementId)) return;
      if (editLocked) return;
      if (primary) {
        openEditor(primary);
        return;
      }
      connectorLabel.editSelected();
    },
    // FigJam/Excalidraw: typing on a single selected shape replaces its label.
    onTypeToEdit: (key) => {
      const { nodeIds, primaryNodeId } = selectionRef.current;
      if (nodeIds.length !== 1 || !primaryNodeId || editLocked || toolRef.current !== 'select') return false;
      openEditor(primaryNodeId, { initialValue: key });
      return true;
    },
    onNudge: editActions.nudgeSelection,
    onCancelGesture: () => gestureApiRef.current?.cancelGesture() ?? false,
    onEscapePanel: escapePanel,
    // Escape chain tail: selection first, then the open panels.
    onClearSelection: () => {
      if (selectionRef.current.nodeIds.length > 0 || selectedConnectorIds.length > 0) selectionApi.clearAll();
      else panels.closeDocked();
    },
    onSelectAll: () => selectionApi.selectAll(viewPage),
    onFitView: () => camera.fitView(),
    onZoomStep: camera.zoomStep,
    onResetZoom: camera.resetZoom,
    onToggleTree: panels.toggleTree,
    onToggleAgent: () => panels.toggleWorkspace('assistant'),
    onToggleCode: toggleCode,
    onToggleModel: () => panels.toggleWorkspace('model'),
    onToggleInspect: () => panels.toggleWorkspace('inspect'),
    onToggleMap: map.toggle,
    onFind: find.show,
    onSpacePan: setSpacePan,
  });

  const tips = useV2FeatureTips({
    page, readOnly: editLocked, rendererReady, selectedCount: selection.nodeIds.length,
    aiConfigured: aiSettings.configured, workspace: panels.workspace, motionOpen: panels.motionOpen,
    // Typing a label is not the moment: the tip waits, so the Escape that ends editing cannot eat it.
    blocked: panels.workspace !== null || panels.motionOpen || panels.treeOpen || panels.shortcutsOpen
      || exportOpen || contextMenu !== null || editing !== null || connectorLabel.editing !== null,
    announce: setAnnouncement,
  });
  const runTip = (tip: V2TipId) => {
    tips.dismiss();
    if (tip === 'code') code.openNew();
    if (tip === 'mermaid') { code.writeNew(() => pastedMermaidRef.current); openWorkspace('code'); }
    if (tip === 'assistant') openWorkspace('assistant');
    if (tip === 'motion') panels.openMotion();
  };

  /** The layers tree's row actions; each is one undo step. */
  const runObjectAction = (nodeId: string, action: 'lock' | 'hide' | 'duplicate' | 'delete') => {
    const node = page?.nodes.find((item) => item.id === nodeId);
    if (editLocked || !page || !node) return;
    if (action === 'lock') commit(buildToggleLockCommand(page, [nodeId]));
    if (action === 'hide') commit({
      kind: 'set-node', id: `visibility:${nodeId}`, label: node.content.sectionHidden ? 'Show object' : 'Hide object',
      pageId: page.id, before: node,
      after: { ...node, content: { ...node.content, sectionHidden: !node.content.sectionHidden } },
    });
    if (action === 'duplicate') {
      const command = buildDuplicateSelectionCommand(page, [nodeId], page.connectors.map((item) => item.id), mintV2Id);
      commit(command);
      applyConnectorSelection([]);
      applySelection(replaceSelection(command.commands.flatMap((item) => item.kind === 'insert-node' ? [item.node.id] : [])));
    }
    if (action === 'delete') {
      if (!architectureActions.unplaceSelection([nodeId])) commit(buildDeleteSelectionCommand(page, [nodeId], []));
      applySelection(clearSelection());
    }
  };

  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <div className="ofk-v2" data-testid="v2-editor" data-tool={spacePan ? 'hand' : tool}
        style={{ backgroundColor: canvasColor }}
        data-workspace-open={panels.workspace !== null || panels.shortcutsOpen || chartPanelNode !== null}
        data-left-open={panels.treeOpen || panels.motionOpen}
        data-left-panel={panels.motionOpen ? 'motion' : undefined}
        onKeyDown={(event) => {
          if (playback.flow && !isEditableTarget(event.target)) {
            if (event.key === 'ArrowRight' || event.key === ' ') { playback.next(); event.preventDefault(); return; }
            if (event.key === 'ArrowLeft') { playback.prev(); event.preventDefault(); return; }
            if (event.key === 'Escape') { playback.close(); event.preventDefault(); return; }
          }
          if (event.key === '?' && !isEditableTarget(event.target)) {
            event.preventDefault(); panels.toggleShortcuts();
          } else if (!map.onKey(event)) handleKeyDown(event);
        }}
        onKeyUp={(event) => { if (event.key === ' ') setSpacePan(false); }}
        onDragOver={(event) => { if (imageFiles(event.dataTransfer).length > 0) event.preventDefault(); }}
        onDrop={handleDrop}
        onPaste={handlePaste}>
        <input ref={imageInputRef} type="file" hidden
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void media.insertImageFile(file);
            event.target.value = '';
          }} />
        {repo.mismatch ? <BadRepoAddress /> : load.phase === 'loading' || !page ? (
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
              preferences={preferences} canvasDefaultColor={canvasDefaultColor}
              onPreferencesChange={updatePreferences}
              document={session.document!}
              pages={pages}
              pageId={page.id}
              saveStatus={saveStatus}
              canUndo={session.canUndo} canRedo={session.canRedo}
              readOnly={docReadOnly} canvasUnavailable={rendererStatus === 'unavailable'}
              tool={tool} zoomPercent={camera.zoom} treeOpen={panels.treeOpen}
              onUndo={undo} onRedo={session.redo}
              onRetrySave={retrySave} onReload={load.reload} onToast={pushToast}
              workspace={{
                name: workspaceFolder.folder?.name ?? null,
                onOpenFolder: () => { void workspaceFolder.openFolder(); },
                onCloseFolder: workspaceFolder.closeFolder,
              }}
              breadcrumb={architecture.breadcrumb}
              {...(repoPanel.drawn && !map.start ? { mapToolbar: { ...map.toolbar, ...(load.readOnly ? {} : { onPin: () => pinRef.current(), canPin: pinnable }) } } : {})}
              {...(map.available ? { mapMode: { mode: map.mode, onChange: map.choose } } : {})}
              mapStart={map.start}
              {...(map.active ? { mapPath: map.path, onMapPath: map.reveal } : {})}
              onCrumb={(crumb) => architectureActions.openCrumb(crumb)}
              {...(shared ? { onEditShared: shared.onEdit } : {})}
              onOpenExport={(anchor) => openExport(anchor, 'page')}
              {...(canShare ? { onOpenShare: (anchor: HTMLElement | null) => openExport(anchor, 'page', 'menu-share') } : {})}
              onDismissExport={() => setExportOpen(false)}
              onRename={(name) => {
                const before = session.document!.name;
                if (name === before) return;
                commit({
                  kind: 'set-document-name',
                  id: `rename-document:${session.document!.id}`,
                  label: 'Rename document',
                  before,
                  after: name,
                });
              }}
              onToolChange={leaveStart(setTool)}
              toolConfig={toolConfig}
              onPickShape={leaveStart(pickShape)}
              onPickConnector={leaveStart(pickConnector)}
              iconsOpen={iconLibrary.open} onIconsOpenChange={iconLibrary.setOpen} onInsertIcon={leaveStart(iconLibrary.insertIcon)}
              onInsertImage={leaveStart(pickImageFile)} onPickEmoji={leaveStart(pickEmoji)}
              recentEmoji={preferences.recentEmoji} librarySection={librarySection}
              moreOpen={moreOpen} onMoreOpenChange={setMoreOpen} onPickMore={leaveStart(inserts.pickMore)}
              onZoomIn={() => camera.zoomStep(1.2)}
              onZoomOut={() => camera.zoomStep(1 / 1.2)}
              onZoomTo={camera.zoomTo}
              onFitView={() => camera.fitView()}
              onToggleTree={panels.toggleTree}
            />
            <V2CanvasHost
              page={viewPage ?? page} hostRef={hostRef} camera={camera.camera} cameraRef={camera.cameraRef} pageRef={pageRef}
              selectionRef={selectionRef} selectedConnectorIdsRef={selectedConnectorIdsRef} toolRef={toolRef} tool={tool} spacePanRef={spacePanRef}
              toolConfigRef={toolConfigRef} onOpenChartData={openChartData} zoomInto={map.active ? null : zoomInto}
              {...(map.active ? { onNodeClick: map.clickNode, onNodeDoubleClick: editBox, onNodeDrag: () => explainMapRef.current() } : {})}
              onRemoveIcons={() => iconActions.removeIcons(selectionRef.current.nodeIds)}
              onOpenCode={code.openNew}
              onInspect={() => openWorkspace('inspect')}
              readOnlyRef={readOnlyRef} gestureApiRef={gestureApiRef}
              selection={selection} selectedConnectorId={selectedConnectorId} selectedConnectorIds={selectedConnectorIds}
              editing={editing}
              commit={commit}
              applySelection={applySelection} applyConnectorSelection={applyConnectorSelection}
              updateCamera={camera.updateCamera} openEditor={openEditor} openConnectorEditor={connectorLabel.open} onToolChange={setTool} mintId={mintV2Id}
              extendConnectorCommand={extendConnectorCommand}
              onCommitLabel={labelEditing.commitLabel} onCancelEdit={labelEditing.cancelEdit}
              connectorEditing={connectorLabel.editing}
              onCommitConnectorLabel={connectorLabel.commit} onCancelConnectorEdit={connectorLabel.cancel}
              onStatusChange={setRendererStatus}
              sectionRef={sectionRef}
              showGrid={preferences.showGrid} snapToGrid={preferences.snapToGrid}
              backgroundColor={Number.parseInt(canvasColor.slice(1), 16)}
              readOnly={editLocked}
              onContextMenu={setContextMenu}
            >
              {repoSource && map.active ? <V2RepoMapOverlay source={repoSource} map={repo.state} links={map.links} /> : null}
              {map.start ? (
                <V2MapStart busy={code.generating} onStartModel={() => { code.startFrom(C4_STARTER, { openPanel: false }); setModelPanelOnStart(true); }}
                  onMapRepo={({ owner, repo: name, ref }) => navigate(`/map/github/${owner}/${name}${ref !== 'HEAD' ? `/tree/${encodeURIComponent(ref)}` : ''}`)}
                  onAgent={() => openWorkspace('agent')} />
              ) : null}
              {map.empty ? (
                <div className="ofk-v2-map-state" data-testid="v2-map-empty">
                  <EmptyState hero={<V2StateHero kind="no-canvas" />} title="No elements yet"
                    description="Add people, systems and containers in the model, then open the map again."
                    action={<Button variant="primary" onClick={() => openWorkspace('model')}>Open model</Button>} />
                </div>
              ) : null}
              {map.error ? (
                <div className="ofk-v2-map-state" data-testid="v2-map-error">
                  <ErrorState hero={<V2StateHero kind="torn-page" />} title="The map could not be drawn." description={map.error}
                    action={<Button variant="primary" onClick={() => map.setMode('canvas')}>Back to canvas</Button>} />
                </div>
              ) : null}
            </V2CanvasHost>
            <V2ContextMenu target={contextMenu} page={viewPage ?? page} selectionCount={selection.nodeIds.length} selectedNodeId={selection.primaryNodeId}
              readOnly={editLocked} actions={editActions} commit={commit}
              onEditLabel={() => {
                const primary = selectionRef.current.primaryNodeId;
                if (primary) openEditor(primary); else connectorLabel.editSelected();
              }}
              onInspect={() => openWorkspace('inspect')}
              onEditAsCode={(frameId) => { code.openFrame(frameId); setContextMenu(null); }}
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
                // Opening a deeper view is Canvas behaviour: it would switch the page under the map.
                childView: !map.active && zoomInto !== null,
                editable: !docReadOnly,
              } : null}
              onEditInModel={() => { if (selectedElementId) editInModel(selectedElementId); }}
              inMap={map.active ? {
                ...(selectedElementId && canvasElementIds.has(selectedElementId) && !repoSource ? { onShowOnCanvas: () => showOnCanvas(selectedElementId) } : {}),
                ...(pinnable ? { onCopyToCanvas: () => pinRef.current() } : {}),
              } : null}
              onDrillInto={() => { if (selectedElementId) architectureActions.drillToMap(selectedElementId); }}
              onUnplace={() => architectureActions.unplaceSelection(selectionRef.current.nodeIds)}
              onRemoveElement={() => { if (selectedElementId) architectureActions.removeElement(selectedElementId); }}
              onSelectAll={() => selectionApi.selectAll(viewPage)}
              onExport={openElementExport}
              onZoomToFit={() => camera.fitView()}
              onZoomToSelection={() => camera.fitView(selectionRef.current.nodeIds)}
              onZoomTo100={camera.resetZoom}
              showGrid={preferences.showGrid} snapToGrid={preferences.snapToGrid}
              onToggleGrid={() => updatePreferences({ showGrid: !preferences.showGrid })}
              onToggleSnap={() => updatePreferences({ snapToGrid: !preferences.snapToGrid })}
              onClose={() => { setContextMenu(null); focusCanvas(); }}
            />
            {/* The export panel's click-point anchor; 1×1 and never interactive. */}
            <div ref={exportPointRef} aria-hidden="true" style={{
              position: 'fixed', left: exportPoint?.x ?? 0, top: exportPoint?.y ?? 0,
              width: 1, height: 1, pointerEvents: 'none',
            }} />
            <V2ExportMenu open={exportOpen} anchorRef={exportAnchorRef} initialScope={exportScope}
              section={exportDoor.endsWith('share') ? 'share' : 'export'} placement={exportDoor.startsWith('bar') ? 'bottom-end' : 'bottom-start'}
              document={exportDocument!} sourceDocument={session.document!} pageId={page.id} canShare={canShare}
              selectedNodeIds={selection.nodeIds} selectedConnectorIds={selectedConnectorIds}
              onClose={() => {
                setExportOpen(false);
                // Element export returns you to the canvas; the bar keeps its own focus.
                if (exportAnchorRef.current === exportPointRef.current) focusCanvas();
              }}
              onToast={(title, tone, extra) => { pushToast({ id: `export-${Date.now()}`, tone, title, ...extra }); if (tone === 'success') tips.offer('motion'); }}
              onOpenAnimation={panels.openMotion} />
            <V2ShareBar canShare={canShare} shareOpen={exportOpen && exportDoor === 'bar-share'} exportOpen={exportOpen && exportDoor === 'bar-export'}
              onShare={(anchor) => toggleBarPanel(anchor, 'bar-share')} onExport={(anchor) => toggleBarPanel(anchor, 'bar-export')} />
            <V2WorkspaceRail mode={panels.workspace} onChange={panels.toggleWorkspace}
              onShortcuts={panels.toggleShortcuts} agentConnected={agentBridge.status === 'connected'} />
            {page.nodes.length === 0 && page.connectors.length === 0 && !ghostPage && !docReadOnly && rendererReady && !map.active
              ? <V2CanvasWelcome onOpen={openWorkspace} /> : null}
            {panels.workspace === 'code' ? <V2CodePanel code={code.draft} palette={preferences.diagramPalette}
              onPaletteChange={(diagramPalette) => updatePreferences({ diagramPalette })}
              onCodeChange={code.edit}
              diagnostics={code.diagnostics} generating={code.generating} canvasEdited={code.canvasEdited}
              {...(code.foreign ? { convertFrom: code.foreign } : {})}
              onGenerate={() => { void code.generate(); }} onClose={() => { code.cancel(); panels.closeWorkspace(); }} /> : null}
            {panels.workspace === 'agent' ? <V2AgentConnect status={agentBridge.status} detail={agentBridge.detail}
              port={preferences.bridgePort} token={preferences.bridgeToken}
              onPortChange={(bridgePort) => updatePreferences({ bridgePort })}
              onTokenChange={(bridgeToken) => updatePreferences({ bridgeToken })}
              onToggle={(connect) => updatePreferences({ agentBridgeEnabled: connect })}
              onClose={panels.closeWorkspace} /> : null}
            {panels.workspace === 'inspect' ? (
              <V2InspectPanel report={inspectSelection(viewPage ?? page, selection.nodeIds, selectedConnectorIds)}
                onClose={() => { panels.closeWorkspace(); focusCanvas(); }}
                onSelectNode={(nodeId) => {
                  applyConnectorSelection([]);
                  applySelection(replaceSelection([nodeId]));
                  camera.glideToNodes([nodeId]);
                }}
                onShowCode={code.openFrame}
                onOpenModel={() => openWorkspace('model')} />
            ) : null}
            {panels.workspace === 'model' ? (
              <V2ModelPanel
                onOpenCode={() => openWorkspace('code')}
                onCreateWorkspace={() => code.startFrom(C4_STARTER, { openPanel: false })}
                architecture={architecture}
                elementPageIds={new Map(session.document!.pages.flatMap((candidate) => candidate.nodes.flatMap((node) => {
                  const elementId = placedElementId(node);
                  return elementId ? [[elementId, candidate.id] as const] : [];
                })))}
                selectedElementId={selectedElementId}
                renameRequest={renameRequest}
                mapArrow={mapArrow}
                {...(repoPanel.box ? { mapBox: repoPanel.box } : {})}
                {...(map.active && map.model ? { mapOverview: { model: map.model, arch: map.arch, onSelect: map.reveal } } : {})}
                placedElementIds={placedElementIds}
                perspectiveTags={preferences.perspectiveTags}
                onPerspectiveChange={(tags) => updatePreferences({ perspectiveTags: [...tags] })}
                onNavigate={(crumb) => architectureActions.openCrumb(crumb)}
                onDrillInto={architectureActions.drillInto}
                onCreateChildView={(elementId) => {
                  void architectureActions.createChildView(elementId).catch((error: unknown) => pushToast({
                    id: 'create-c4-view', tone: 'danger', title: error instanceof Error ? error.message : 'Could not create the view.',
                  }));
                }}
                onSelectElement={(elementId) => {
                  const node = (viewPage ?? page).nodes.find((candidate) => placedElementId(candidate) === elementId);
                  if (node) {
                    applyConnectorSelection([]);
                    applySelection(replaceSelection([node.id]));
                    camera.glideToNodes([node.id]);
                    return;
                  }
                  applyConnectorSelection([]);
                  applySelection(replaceSelection([]));
                  setAnnouncement('Inspecting an element outside the current view.');
                }}
                onClearSelection={() => selectionApi.clearAll()}
                {...(map.available && !map.active && !repoSource ? { onOpenInMap: (id: string) => { map.enterMapAt(id); } } : {})}
                {...(map.active && !repoSource ? { onShowOnCanvas: showOnCanvas, canvasElementIds } : {})}
                onEditElement={architectureActions.editElement}
                onRemoveElement={architectureActions.removeElement}
                onAddElement={architectureActions.addElement}
                onCreateFlow={architectureActions.createFlow}
                onPlayFlow={playback.open}
                onClose={panels.closeWorkspace}
                readOnly={docReadOnly}
                adrs={workspaceFolder.adrs}
              />
            ) : null}
            {playback.flow ? (
              <V2FlowPanel
                model={architecture.model}
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
            {panels.shortcutsOpen ? <V2Shortcuts onClose={panels.closeShortcuts} /> : null}
            {find.open ? <V2FindBar find={find} label={map.active ? 'Find in map' : 'Find on canvas'} /> : null}
            {tips.tip ? <V2FeatureTip id={tips.tip} onAction={() => runTip(tips.tip!)} onClose={tips.dismiss} /> : null}
            {panels.motionOpen ? (
              <Panel title="Animation export" side="start" className="ofk-motion-panel ofk-v2-layers-panel"
                onClose={panels.closeMotion}>
                <V2MotionExport key={page.id} document={session.document!} pageId={page.id}
                  onToast={(title, tone) => pushToast({ id: `motion-${Date.now()}`, tone, title })}
                  codeText={code.draft}
                  onAnimateBlock={(block) => {
                    // The chips write the text hub; the code panel opens on the
                    // other side so the user sees where the block went.
                    code.writeNew((draft) => writeAnimateBlock(draft, block));
                    panels.setWorkspace((mode) => mode ?? 'code');
                  }} />
              </Panel>
            ) : null}
            {chartPanelNode ? (
              <V2ChartDataPanel key={chartPanelNode.id} node={chartPanelNode} pageId={page.id}
                commit={commit} onClose={panels.closeChart} />
            ) : null}
            {panels.treeOpen ? (
              <V2TreePanel
                key={page.id}
                page={viewPage ?? page} selection={selection} selectedConnectorIds={selectedConnectorIds}
                readOnly={editLocked}
                onObjectAction={runObjectAction}
                onConnectorMenu={(connectorId, x, y) => {
                  applySelection(clearSelection());
                  applyConnectorSelection([connectorId]);
                  setContextMenu({ kind: 'connector', id: connectorId, x, y });
                }}
                onConnectorAction={(connectorId, action) => {
                  if (editLocked) return;
                  const command = buildConnectorObjectAction(page, connectorId, action, mintV2Id);
                  if (!command) return;
                  commit(command);
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
                onClose={panels.closeTree}
              />
            ) : null}
            {panels.workspace === 'assistant' ? (
              <V2AgentPanel assistant={assistant} proposal={proposal} aiSettings={aiSettings}
                currentRevision={session.revision} readOnly={docReadOnly}
                diagramCount={diagramCount} selectedDiagramCount={selectedDiagramCount}
                onClose={panels.closeWorkspace} />
            ) : null}
            <ToastRegion items={toasts} onDismiss={dismissToast} />
            <p className="sr-only" aria-live="polite">{announcement || `Revision ${session.revision}.`}</p>
          </>
        )}
      </div>
    </SystemRoot>
  );
}
