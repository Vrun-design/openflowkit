import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { createDefaultSceneLayer } from '../../../domain/document/defaults';
import { fromArch } from '../../../../dsl/map/fromArch';
import { closedBoxSize, mapScene } from '../../../../dsl/map/scene';
import type { AggEdge, MapModel } from '../../../../dsl/map/types';
import { presets } from '../../../../dsl/map/view';
import { archFrameOf, archModelOfPage, placedElementId } from '../../../../dsl/model/model';
import { getElkInstance } from '../../../../services/elk-layout/runtime';
import { layoutMap, type LayoutPorts } from '../../../application/map/layoutMap';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { ScenePage } from '../../../domain/document/types';
import type { DiagramPaletteName } from '../../../domain/nodes/nodePalette';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';
import { foundation } from '../../design-system/tokens';
import type { V2Tool } from '../V2CreationToolbar';
import { isEditableTarget } from '../pointerOperations';
import { platformKeys } from '../v2Shortcuts';
import { keyOwnedByTarget } from '../useV2Keyboard';
import { measure } from './layout';
import { mapPathOf } from './mapPath';
import {
  BUDGET_NOTE, clearance, fitsBudget, isDoubleClick, isEditKey, mapKeyAllowed, panToUncover, parentToClose, prune, sceneFor, startOpen, toggleBox, type TaggedScene,
} from './mapMode';
import { useMapFocus } from './useMapFocus';
import { mapFindMatches } from '../../../application/map/mapFind';
import { savedMode, saveMode, savedOpen, saveOpen } from './mapDepth';
import { useMapControls } from './useMapControls';
import { useClearance } from '../useClearance';
import { useMapEntry } from './useMapEntry';
import { useMapMotion } from './useMapMotion';
import { useMapLayers } from './useMapLayers';
import { lookOf, repoLookOf } from './mapLook';

export type V2MapModeName = 'canvas' | 'map';

interface Options {
  readonly page: ScenePage | null;
  /** With the page id, names a map's lineage: default page ids repeat across documents. */
  readonly documentId?: string;
  /** A repo document: the map of this model (null while it loads) in place of a C4 page's. Opens in Map; Canvas stays one switch away. */
  readonly repo?: { readonly model: MapModel | null; readonly loading?: boolean } | null;
  /** A page without a model still has the switch (an editable document with no model anywhere): Map then shows its start screen. */
  readonly startable?: boolean;
  readonly palette: DiagramPaletteName;
  readonly autoIcons: boolean;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly updateCamera: (camera: CanvasCamera) => void;
  /** Frames the page now on the host (the Canvas page, once Map is left). */
  readonly fitView: () => void;
  readonly onToolChange: (tool: V2Tool) => void;
  /** The one selected box, for Enter and Escape. */
  readonly primaryId: () => string | null;
  readonly select: (id: string) => void;
  /** Drops the selection (a box that left the map had none to fall back on). */
  readonly clearSelection: () => void;
  /** What the reader has picked, for the focus: the one selected box, or the one selected arrow (null when several or none). */
  readonly selectedNodeId: string | null;
  readonly selectedConnectorId: string | null;
  /** The editor's own Escape chain before Map closes a box: gesture, panel, tool. True when it cancelled something. */
  readonly cancelTransient: () => boolean;
  readonly closeChart: () => void;
  /** A short polite note, shown and announced by the editor. */
  readonly notify: (message: string) => void;
  /** Shift+M in Map: pin the map as a Canvas page (the editor does the commit). */
  readonly onPin?: () => void;
  /** Which panels are open (one string): opening, closing or swapping one re-clears the camera. */
  readonly panelsKey?: string;
  /** Canvas mode: the selected nodes, read when a panel opens. */
  readonly selectedIds?: () => readonly string[];
  /** The editor's camera glide (interruptible; instant under reduced motion). */
  readonly glide?: (camera: CanvasCamera) => void;
  /** A key that would edit on Canvas was swallowed: the editor explains instead of doing nothing. */
  readonly onBlockedEdit?: () => void;
}

const NONE: ReadonlySet<string> = new Set();
/** "Showing part of the map" is said once a session: after that the reader knows. */
let partialSaid = false;
const LABEL_FONT = `500 12px ${foundation.font}`;
// What the canvas draws while the map of the current model is not laid out yet: never the Canvas page, never another model.
const EMPTY_MAP: ScenePage = {
  id: 'map', name: 'Map', diagramKind: 'architecture', layers: [createDefaultSceneLayer()], nodes: [], connectors: [], metadata: {}, extensions: {},
};

/** The previous value while the new one is deep-equal: a commit that did not touch the model must not relayout the map. */
function useStable<T>(value: T): T {
  const json = useMemo(() => JSON.stringify(value), [value]);
  const [held, setHeld] = useState({ json, value });
  if (held.json !== json) setHeld({ json, value });
  return held.json === json ? held.value : value;
}

/**
 * Map mode's view state: which lens is on, which boxes are open, and the scene they make. The document is never
 * written; the scene is a ScenePage handed to the canvas in place of the page.
 */
export function useV2MapMode(options: Options) {
  const { page, documentId, repo = null, startable = false, palette, autoIcons, hostRef, cameraRef, updateCamera, fitView, onToolChange, primaryId, select, clearSelection, selectedNodeId, selectedConnectorId, cancelTransient, closeChart, notify, onPin, panelsKey = '', selectedIds = () => [], glide = updateCamera, onBlockedEdit } = options;
  // Cheap: only whether the page carries a model. The model itself is read only while the map is on.
  const isRepo = repo !== null;
  const hasModel = useMemo(() => isRepo || (page ? archFrameOf(page) !== null : false), [isRepo, page]);
  const available = hasModel || startable;
  const [mode, setModeState] = useState<V2MapModeName>('canvas');
  // Once per document: the reader's last choice (this browser), else a repo document opens in Map and a model page in Canvas.
  const [restored, setRestored] = useState<string | null>(null);
  // Each time the map becomes available again (back on the repo page from a pinned one) the choice applies again.
  if (!hasModel && restored !== null) setRestored(null);
  // Another document (Open file…, a link) never inherits the last one's mode: its own saved choice, else Canvas.
  const [seenDocument, setSeenDocument] = useState(documentId);
  if (documentId !== seenDocument) {
    setSeenDocument(documentId);
    setModeState(documentId && hasModel && (savedMode(documentId) ?? (isRepo ? 'map' : 'canvas')) === 'map' ? 'map' : 'canvas');
  }
  if (documentId && hasModel && restored !== documentId) {
    setRestored(documentId);
    if ((savedMode(documentId) ?? (isRepo ? 'map' : 'canvas')) === 'map') setModeState('map');
  }
  const active = mode === 'map' && available;
  // Map on a document with no model: the start screen, not a map.
  const start = active && !hasModel;
  const arch = useStable(useMemo(() => (active && page && !isRepo ? archModelOfPage(page) : null), [active, page, isRepo]));
  const repoModel = repo?.model ?? null;
  // What the map is of: the C4 model, or the repo's.
  const subject: object | null = arch ?? repoModel;
  // What the reader opened, per page; a page not chosen yet starts from what this browser remembers, then from the preset.
  const [held, setHeld] = useState<{ key: string; set: ReadonlySet<string> } | null>(null);
  const [scene, setScene] = useState<TaggedScene<object> | null>(null);
  const [drawError, setError] = useState<string | null>(null);
  const saved = useRef<{ pageId: string | null; camera: CanvasCamera } | null>(null);
  const leaving = useRef(false);
  // The box to select on Canvas once back (an element id), and the box a Canvas selection asked Map to land on (until it has).
  const carry = useRef<string | null>(null);
  const intent = useRef<string | null>(null);
  /** The one selected node: a selection of several carries nothing across. */
  const onlySelected = useCallback((): string | null => { const ids = selectedIds(); return ids.length === 1 ? ids[0]! : null; }, [selectedIds]);
  const lastFlip = useRef(Number.NEGATIVE_INFINITY);
  const layouts = useRef(0);
  // Layouts asked for vs. shown on the host: between the two the map is about to move, which is not idle yet.
  const seqs = useRef({ asked: 0, landed: 0, shown: 0 });
  const markShown = useCallback((layout: 'asked' | 'landed') => { seqs.current.shown = seqs.current[layout]; }, []);
  // A map's lineage is its document and page: an edit keeps it (and keeps the old scene up while it lays out).
  const pageId = page?.id;
  const lineageKey = `${documentId ?? ''}/${pageId ?? ''}`;
  const keyRef = useRef(lineageKey);
  useEffect(() => { keyRef.current = lineageKey; });
  // Chains count runs of related maps: another page's model, or the map opening, starts a new one (it lands, it does not move).
  const chain = useRef(0);
  const seen = useRef<{ arch: object | null; key: string | null }>({ arch: null, key: null });
  useEffect(() => {
    const was = seen.current;
    seen.current = active ? { arch: subject, key: lineageKey } : { arch: null, key: null };
    if (active && (was.arch === null || (was.key !== lineageKey && was.arch !== subject))) chain.current += 1;
  }, [active, subject, lineageKey]);
  // The box a click just opened or closed: the camera brings it into view when its layout arrives.
  const focusRef = useRef<{ id: string | null } | null>(null);
  // The box a find or the overview revealed: selected once the layout that draws it has landed.
  const pendingRef = useRef<string | null>(null);

  const built = useMemo(() => {
    if (repoModel) return { model: repoModel, look: repoLookOf(repoModel, palette) };
    if (!arch) return null;
    try { return { model: fromArch(arch), look: lookOf(arch, palette, autoIcons) }; } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'The map could not be drawn.' };
    }
  }, [arch, repoModel, palette, autoIcons]);
  const model = built && 'model' in built ? built.model : null;
  const look = built && 'look' in built ? built.look : null;
  const remembered = useMemo(() => (active && documentId && pageId ? savedOpen(documentId, pageId) : null), [active, documentId, pageId]);
  const openState = held?.key === lineageKey ? held.set : remembered;
  const open = useMemo(() => (model ? startOpen(model, openState, presets(model).overview) : NONE), [model, openState]);
  const setOpenState = useCallback((set: ReadonlySet<string>) => {
    setHeld({ key: lineageKey, set });
    if (documentId && pageId) saveOpen(documentId, pageId, set);
  }, [lineageKey, documentId, pageId]);
  const error = built && 'error' in built ? built.error ?? null : active && !start && !subject && !repo ? 'This page has no readable model.' : drawError;
  const empty = model !== null && model.nodes[model.root].children.length === 0;

  const layers = useMapLayers(model, open, isRepo, lineageKey);
  const [counts, setCounts] = useState<{ shown: number; total: number; minor: number } | null>(null);
  const edgeMap = useRef<ReadonlyMap<string, AggEdge>>(new Map());
  useEffect(() => {
    if (!active || !subject || !model || !look) return;
    let stale = false;
    const seq = ++seqs.current.asked;
    // Edges and counts belong to the layout that lands, so they are handed over with it (a late older layout is dropped).
    const draw = async (): Promise<{ page: ScenePage; edges: ReadonlyMap<string, AggEdge>; counts: { shown: number; total: number; minor: number } | null }> => {
      if (empty) return { page: mapScene(model, open, { rects: new Map(), edges: [] }, look), edges: new Map(), counts: null };
      const ports: LayoutPorts = {
        elk: await getElkInstance() as unknown as LayoutPorts['elk'],
        measure: (text) => measure(text, LABEL_FONT),
        sizeOf: (node) => closedBoxSize(look, node),
      };
      const laid = await layoutMap(ports, model, open, layers.shown, layers.all);
      return {
        page: mapScene(model, open, { rects: laid.laid.rects, edges: laid.edges }, look),
        edges: new Map(laid.edges.map((e) => [e.key, e])),
        counts: isRepo ? { shown: laid.edges.length, total: laid.total, minor: laid.minor } : null,
      };
    };
    // Latest request wins; a scene of this model stays up until the next is ready, one of another model never does.
    draw().then((next) => { if (!stale) { edgeMap.current = next.edges; setCounts(next.counts); layouts.current += 1; seqs.current.landed = seq; setError(null); setScene({ model: subject, page: next.page, lineage: keyRef.current, chain: chain.current }); } })
      .catch((cause: unknown) => {
        if (stale) return;
        seqs.current.landed = seq;
        seqs.current.shown = seq;
        pendingRef.current = null;
        setScene(null);
        setError(cause instanceof Error ? cause.message : 'The map could not be drawn.');
      });
    return () => { stale = true; };
  }, [active, subject, model, look, open, empty, layers.shown, layers.all, isRepo]);

  const setMode = useCallback((next: V2MapModeName) => {
    if (next === mode || (next === 'map' && !available)) return;
    setScene(null);
    if (next === 'map') {
      saved.current = { pageId: page?.id ?? null, camera: cameraRef.current };
      closeChart();
      onToolChange('select');
    } else {
      setError(null);
      leaving.current = true;
      // A box still on its way to the screen (a quick M M) counts as selected: Map's own scene has pruned the selection meanwhile.
      carry.current = pendingRef.current ?? intent.current ?? onlySelected();
      intent.current = null;
    }
    setModeState(next);
  }, [mode, available, page?.id, onlySelected, cameraRef, closeChart, onToolChange]);
  // A page without a model has no map: fall back to Canvas (the page switch already fitted its own camera).
  if (mode === 'map' && !available) { setModeState('canvas'); setScene(null); setError(null); }

  // Back on Canvas, once the page is on the host: the camera it had, or its own fit when the page changed meanwhile.
  useEffect(() => {
    if (active || !leaving.current) return;
    leaving.current = false;
    const was = saved.current;
    saved.current = null;
    const restored = was !== null && was.pageId === (page?.id ?? null);
    if (restored) updateCamera(was.camera); else fitView();
    // The selected box comes along when this page places it, whatever happened to the camera; else no stale ids stay.
    const box = carry.current;
    carry.current = null;
    const host = hostRef.current;
    const places = box ? (page?.nodes ?? []).filter((node) => placedElementId(node) === box) : [];
    if (!host || places.length === 0) { clearSelection(); return; }
    // Placed twice: the one on screen now, else the first.
    const view = host.getViewportSize();
    const cam = cameraRef.current;
    const onScreen = (id: string) => {
      const b = host.getContentBounds([id]);
      return !!b && b.x * cam.zoom + cam.x < view.width && (b.x + b.width) * cam.zoom + cam.x > 0 && b.y * cam.zoom + cam.y < view.height && (b.y + b.height) * cam.zoom + cam.y > 0;
    };
    const nodeId = (places.find((node) => onScreen(node.id)) ?? places[0]!).id;
    select(nodeId);
    const bounds = host.getContentBounds([nodeId]);
    const pan = restored && bounds ? panToUncover(bounds, cameraRef.current, clearance(host)) : null;
    if (pan) glide(pan);
  }, [active, page, updateCamera, fitView, clearSelection, select, hostRef, cameraRef, glide]);

  const mapPage = active ? sceneFor(scene, subject, EMPTY_MAP, lineageKey) : null;
  // A model to draw whose layout has not landed yet (ELK warming up, a big map), or a repo still being read.
  const drawing = active && !start && !error && ((subject !== null && !empty && mapPage === EMPTY_MAP) || !!repo?.loading);
  const onPartial = useCallback(() => {
    if (partialSaid) return;
    partialSaid = true;
    notify(`Showing part of the map. ${platformKeys('⌘0')} shows all of it.`);
  }, [notify]);
  const { shown, player, fit } = useMapMotion({ mapPage, emptyPage: EMPTY_MAP, scene, model, hostRef, cameraRef, updateCamera, markShown, focusRef, onPartial });
  useClearance({ active, selectedId: selectedNodeId, panelsKey, selectedIds, shown, hostRef, cameraRef, glide, busy: () => player.stats().running || seqs.current.shown < seqs.current.asked });
  useMapFocus(hostRef, active && mapPage && mapPage !== EMPTY_MAP ? mapPage : null, selectedNodeId, selectedConnectorId);

  useEffect(() => { pendingRef.current = null; }, [active, lineageKey]);
  useEffect(() => {
    const id = pendingRef.current;
    if (id && mapPage && mapPage !== EMPTY_MAP && mapPage.nodes.some((node) => node.id === id)) { pendingRef.current = null; intent.current = null; select(id); }
  }, [mapPage, select]);
  const controls = useMapControls({ model, open, setOpen: setOpenState, focusRef, shown, hostRef, cameraRef, updateCamera, primaryId, select, clearSelection, pendingRef, notify });

  const { enterMapAt } = useMapEntry({ available, active, lineageKey, model, open, setOpen: setOpenState, setMode, focusRef, pendingRef, notify });

  /** The reader's own switch (the buttons, the M key): remembered for this document. Automatic switches (Pin, a drill) use `setMode`. With a placed element selected, Map reveals it (its ancestors open, itself not) and lands on it. */
  const choose = useCallback((next: V2MapModeName, showElement?: string) => {
    const id = next === 'map' && mode === 'canvas' ? onlySelected() : null;
    const element = id && page ? placedElementId(page.nodes.find((node) => node.id === id) ?? { metadata: {} }) : null;
    if (element) intent.current = element;
    // "Show on canvas": the element to select once back, in place of whatever Map had selected.
    if (next === 'canvas' && showElement) intent.current = showElement;
    if (!(element && enterMapAt(element, { reveal: true }))) setMode(next);
    // Map without a model is not a choice worth keeping: reopening lands on the drawing.
    if (documentId && hasModel) saveMode(documentId, next);
  }, [mode, page, onlySelected, enterMapAt, setMode, documentId, hasModel]);
  /** M: true when the page has a map to switch to or from, so the key is spent. */
  const toggle = useCallback((): boolean => {
    if (!available) return false;
    choose(mode === 'map' ? 'canvas' : 'map');
    return true;
  }, [available, mode, choose]);

  /** True when the open set changed. */
  const flip = useCallback((id: string): boolean => {
    if (!model) return false;
    const next = toggleBox(model, open, id);
    if (next === open) return false;
    if (!fitsBudget(model, next)) { notify(BUDGET_NOTE); return false; }
    focusRef.current = { id };
    setOpenState(next);
    return true;
  }, [model, open, notify, setOpenState]);
  /** Test hook: opens exactly `ids` (within the box budget, like a click), landing the camera on `focus` (default: the last one opened). */
  const openBoxes = useCallback((ids: readonly string[], focus?: string) => {
    if (!model) return;
    const next = prune(model, new Set(ids));
    if (!fitsBudget(model, next)) { notify(BUDGET_NOTE); return; }
    const at = focus ?? ids.at(-1);
    focusRef.current = at ? { id: at } : null;
    setOpenState(next);
  }, [model, notify, setOpenState]);
  const clickNode = useCallback((id: string) => {
    const now = performance.now();
    // The second click of a double-click (which edits the box) must not shut the box the first click opened.
    if (isDoubleClick(lastFlip.current, now)) return;
    if (flip(id)) lastFlip.current = now;
  }, [flip]);

  const edgeOf = useCallback((connectorId: string): AggEdge | undefined => edgeMap.current.get(connectorId), []);
  /** The repo-map arrows drawn now that touch a box. */
  const edgesAt = useCallback((id: string): AggEdge[] => [...edgeMap.current.values()].filter((e) => e.from === id || e.to === id), []);
  const { arrow, reveal } = controls;
  const findMatches = useCallback((query: string) => (model ? mapFindMatches(model, arch, query) : []), [model, arch]);
  // Closing find drops a reveal still waiting for its layout: it must not select or move the camera after the search is over.
  const cancelReveal = useCallback(() => { pendingRef.current = null; focusRef.current = null; }, []);
  const findSource = useMemo(() => (active ? { matches: findMatches, reveal, cancel: cancelReveal } : undefined), [active, findMatches, reveal, cancelReveal]);
  /** True when the editor's own shortcuts must not see this key. */
  const onKey = useCallback((event: KeyboardEvent<HTMLElement>): boolean => {
    if (start && !event.defaultPrevented) {
      // Escape leaves (a panel or tool in the way goes first); a control keeps the keys that press it; the rest is Map's own filter.
      // Typing in a field: Escape leaves the field, a second one leaves Map.
      if (event.key === 'Escape' && isEditableTarget(event.target)) { (event.target as HTMLElement).blur(); event.preventDefault(); return true; }
      if (event.key === 'Escape') { if (!cancelTransient()) choose('canvas'); event.preventDefault(); return true; }
      if (isEditableTarget(event.target)) return false;
      if (event.target instanceof HTMLElement && event.target.closest('button') && [' ', 'Enter'].includes(event.key)) return false;
      // Find has nothing to search here (the canvas behind is hidden), and the browser's own must not open instead.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); return true; }
      return !mapKeyAllowed(event);
    }
    if (!active || !model || keyOwnedByTarget(event)) return false;
    // Arrows walk between boxes (Map has nothing to nudge), but only from the canvas or the bare page: a panel, tree or dialog keeps its own.
    // With a modifier they are swallowed like every other key Map has no use for (mapKeyAllowed below).
    const onCanvas = event.target === document.body || (event.target instanceof HTMLElement && event.target.matches('[data-testid="v2-canvas"]'));
    if (onCanvas && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && arrow(event.key)) { event.preventDefault(); return true; }
    if (onPin && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && event.code === 'KeyM') { onPin(); event.preventDefault(); return true; }
    const id = primaryId();
    if (event.key === 'Enter') {
      if (id && shown.current?.rects.has(id)) flip(id);
      event.preventDefault();
      return true;
    }
    if (event.key === 'Escape') {
      if (cancelTransient()) { event.preventDefault(); return true; }
      const parent = id ? parentToClose(model, open, id) : null;
      if (!parent) return false;
      flip(parent);
      select(parent);
      event.preventDefault();
      return true;
    }
    if (mapKeyAllowed(event)) return false;
    if (isEditKey(event)) onBlockedEdit?.();
    return true;
  }, [active, start, choose, model, open, primaryId, flip, select, cancelTransient, arrow, shown, onPin, onBlockedEdit]);

  const path = useMemo(() => (active && model ? mapPathOf(model, selectedNodeId) : []), [active, model, selectedNodeId]);

  const state = useCallback(() => ({
    mode: active ? 'map' as const : 'canvas' as const,
    open: [...open].sort(),
    nodes: mapPage?.nodes.map((node) => node.id) ?? [],
    labels: Object.fromEntries(mapPage?.nodes.map((node) => [node.id, String(node.content.label ?? '')]) ?? []),
    connectors: mapPage?.connectors.map((connector) => ({
      id: connector.id, from: connector.source.nodeId, to: connector.target.nodeId, label: connector.labels[0]?.text ?? '',
      // A repo map's kind of connection (import, call, data); null on a C4 map.
      kind: edgeMap.current.get(connector.id)?.kind ?? null,
    })) ?? [],
    // How many layouts have landed: a click that changes nothing must not add one.
    layouts: layouts.current,
    // What the host dims around: the ids kept bright, and whether the arrows are marching.
    focus: hostRef.current?.getFocusState() ?? null,
  }), [active, open, mapPage, hostRef]);
  /** The last move's numbers (frames, drawing cost, frame gaps, page renders): for the test hook and the perf spec. */
  const motionStats = useCallback(() => {
    const stats = player.stats();
    // Running until the layout asked for is on screen, the move is over and the arrows are all the way back.
    const running = stats.running || seqs.current.shown < seqs.current.asked || (hostRef.current?.getMotionState().fading ?? false);
    // The layout counters too: a move that never settles says which part is still waiting.
    return { ...stats, running, layouts: { ...seqs.current } };
  }, [player, hostRef]);

  return { mode: active ? 'map' as const : 'canvas' as const, available, active, start, mapPage, empty: active && empty && !repo, error: active ? error : null, setMode, choose, toggle, clickNode, onKey, state, motionStats, openBoxes, model, arch, reveal, path, findSource, enterMapAt,
    /** The aggregated edge a repo-map connector stands for (its evidence), or undefined. */
    edgeOf, edgesAt,
    /** Zoom to fit while Map is on: the whole map clear of the panels and floating chrome (the editor's fit ignores the chrome). */
    fit,
    // No level is pressed while drawing: a repo map still reading in would flip from one to another as it grows.
    toolbar: { depth: drawing ? null : controls.depth, onDepth: controls.setDepth, ...(drawing ? { drawing } : {}),
      ...(layers.layers ? { layers: layers.layers, onToggleLayer: layers.toggle } : {}) },
    /** A crowded repo level: how many arrows are drawn of all, and the switch for the rest (null when none are left out). */
    links: isRepo && counts && counts.minor > 0 ? { ...counts, all: layers.all, onToggle: layers.toggleAll } : null };
}
