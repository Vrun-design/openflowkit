import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { inferIcon } from '../../../../dsl/autoIcon';
import { createDefaultSceneLayer } from '../../../domain/document/defaults';
import { fromArch } from '../../../../dsl/map/fromArch';
import { closedBoxSize, mapScene, type MapLook } from '../../../../dsl/map/scene';
import { presets } from '../../../../dsl/map/view';
import { archFrameOf, archModelOfPage } from '../../../../dsl/model/model';
import type { ArchModel } from '../../../../dsl/model/types';
import { resolveDslIcon } from '../../../../services/dsl/iconResolver';
import { getElkInstance } from '../../../../services/elk-layout/runtime';
import { layoutMap, type LayoutPorts } from '../../../application/map/layoutMap';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { ScenePage } from '../../../domain/document/types';
import { diagramPalette, paletteResolver, type DiagramPaletteName } from '../../../domain/nodes/nodePalette';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';
import { foundation } from '../../design-system/tokens';
import type { V2Tool } from '../V2CreationToolbar';
import { isEditableTarget } from '../pointerOperations';
import { measure } from './layout';
import {
  BUDGET_NOTE, fitsBudget, isDoubleClick, mapKeyAllowed, parentToClose, prune, sceneFor, startOpen, toggleBox, type TaggedScene,
} from './mapMode';
import { useMapFocus } from './useMapFocus';
import { mapFindMatches } from '../../../application/map/mapFind';
import { savedOpen, saveOpen } from './mapDepth';
import { useMapControls } from './useMapControls';
import { useMapMotion } from './useMapMotion';

export type V2MapModeName = 'canvas' | 'map';

interface Options {
  readonly page: ScenePage | null;
  /** With the page id, names a map's lineage: default page ids repeat across documents. */
  readonly documentId?: string;
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
}

const NONE: ReadonlySet<string> = new Set();
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
  const { page, documentId, palette, autoIcons, hostRef, cameraRef, updateCamera, fitView, onToolChange, primaryId, select, clearSelection, selectedNodeId, selectedConnectorId, cancelTransient, closeChart, notify } = options;
  // Cheap: only whether the page carries a model. The model itself is read only while the map is on.
  const available = useMemo(() => (page ? archFrameOf(page) !== null : false), [page]);
  const [mode, setModeState] = useState<V2MapModeName>('canvas');
  const active = mode === 'map' && available;
  const arch = useStable(useMemo(() => (active && page ? archModelOfPage(page) : null), [active, page]));
  // What the reader opened, per page; a page not chosen yet starts from what this browser remembers, then from the preset.
  const [held, setHeld] = useState<{ key: string; set: ReadonlySet<string> } | null>(null);
  const [scene, setScene] = useState<TaggedScene<ArchModel> | null>(null);
  const [drawError, setError] = useState<string | null>(null);
  const saved = useRef<{ pageId: string | null; camera: CanvasCamera } | null>(null);
  const leaving = useRef(false);
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
  const seen = useRef<{ arch: ArchModel | null; key: string | null }>({ arch: null, key: null });
  useEffect(() => {
    const was = seen.current;
    seen.current = active ? { arch, key: lineageKey } : { arch: null, key: null };
    if (active && (was.arch === null || (was.key !== lineageKey && was.arch !== arch))) chain.current += 1;
  }, [active, arch, lineageKey]);
  // The box a click just opened or closed: the camera brings it into view when its layout arrives.
  const focusRef = useRef<{ id: string | null } | null>(null);
  // The box a find or the overview revealed: selected once the layout that draws it has landed.
  const pendingRef = useRef<string | null>(null);

  const built = useMemo(() => {
    if (!arch) return null;
    try { return { model: fromArch(arch), look: lookOf(arch, palette, autoIcons) }; } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'The map could not be drawn.' };
    }
  }, [arch, palette, autoIcons]);
  const model = built && 'model' in built ? built.model : null;
  const look = built && 'look' in built ? built.look : null;
  const remembered = useMemo(() => (active && documentId && pageId ? savedOpen(documentId, pageId) : null), [active, documentId, pageId]);
  const openState = held?.key === lineageKey ? held.set : remembered;
  const open = useMemo(() => (model ? startOpen(model, openState, presets(model).overview) : NONE), [model, openState]);
  const setOpenState = useCallback((set: ReadonlySet<string>) => {
    setHeld({ key: lineageKey, set });
    if (documentId && pageId) saveOpen(documentId, pageId, set);
  }, [lineageKey, documentId, pageId]);
  const error = built && 'error' in built ? built.error ?? null : active && !arch ? 'This page has no readable model.' : drawError;
  const empty = model !== null && model.nodes[model.root].children.length === 0;

  useEffect(() => {
    if (!active || !arch || !model || !look) return;
    let stale = false;
    const seq = ++seqs.current.asked;
    const draw = async (): Promise<ScenePage> => {
      if (empty) return mapScene(model, open, { rects: new Map(), edges: [] }, look);
      const ports: LayoutPorts = {
        elk: await getElkInstance() as unknown as LayoutPorts['elk'],
        measure: (text) => measure(text, LABEL_FONT),
        sizeOf: (node) => closedBoxSize(look, node),
      };
      const laid = await layoutMap(ports, model, open);
      return mapScene(model, open, { rects: laid.laid.rects, edges: laid.edges }, look);
    };
    // Latest request wins; a scene of this model stays up until the next is ready, one of another model never does.
    draw().then((next) => { if (!stale) { layouts.current += 1; seqs.current.landed = seq; setError(null); setScene({ model: arch, page: next, lineage: keyRef.current, chain: chain.current }); } })
      .catch((cause: unknown) => {
        if (stale) return;
        seqs.current.landed = seq;
        seqs.current.shown = seq;
        pendingRef.current = null;
        setScene(null);
        setError(cause instanceof Error ? cause.message : 'The map could not be drawn.');
      });
    return () => { stale = true; };
  }, [active, arch, model, look, open, empty]);

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
    }
    setModeState(next);
  }, [mode, available, page?.id, cameraRef, closeChart, onToolChange]);
  /** M: true when the page has a map to switch to or from, so the key is spent. */
  const toggle = useCallback((): boolean => {
    if (!available) return false;
    setMode(mode === 'map' ? 'canvas' : 'map');
    return true;
  }, [available, mode, setMode]);

  // A page without a model has no map: fall back to Canvas (the page switch already fitted its own camera).
  if (mode === 'map' && !available) { setModeState('canvas'); setScene(null); setError(null); }

  // Back on Canvas, once the page is on the host: the camera it had, or its own fit when the page changed meanwhile.
  useEffect(() => {
    if (active || !leaving.current) return;
    leaving.current = false;
    const was = saved.current;
    saved.current = null;
    if (was && was.pageId === (page?.id ?? null)) updateCamera(was.camera); else fitView();
  }, [active, page?.id, updateCamera, fitView]);

  const mapPage = active ? sceneFor(scene, arch, EMPTY_MAP, lineageKey) : null;
  const { shown, player } = useMapMotion({ mapPage, emptyPage: EMPTY_MAP, scene, model, hostRef, cameraRef, updateCamera, markShown, focusRef });
  useMapFocus(hostRef, active && mapPage && mapPage !== EMPTY_MAP ? mapPage : null, selectedNodeId, selectedConnectorId);

  useEffect(() => { pendingRef.current = null; }, [active, lineageKey]);
  useEffect(() => {
    const id = pendingRef.current;
    if (id && mapPage && mapPage !== EMPTY_MAP && mapPage.nodes.some((node) => node.id === id)) { pendingRef.current = null; select(id); }
  }, [mapPage, select]);
  const controls = useMapControls({ model, open, setOpen: setOpenState, focusRef, shown, hostRef, cameraRef, updateCamera, primaryId, select, clearSelection, pendingRef, notify });

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
    if (isDoubleClick(lastFlip.current, now)) return;
    if (flip(id)) lastFlip.current = now;
  }, [flip]);

  const { arrow, reveal } = controls;
  const findMatches = useCallback((query: string) => (model ? mapFindMatches(model, arch, query) : []), [model, arch]);
  // Closing find drops a reveal still waiting for its layout: it must not select or move the camera after the search is over.
  const cancelReveal = useCallback(() => { pendingRef.current = null; focusRef.current = null; }, []);
  const findSource = useMemo(() => (active ? { matches: findMatches, reveal, cancel: cancelReveal } : undefined), [active, findMatches, reveal, cancelReveal]);
  /** True when the editor's own shortcuts must not see this key. */
  const onKey = useCallback((event: KeyboardEvent<HTMLElement>): boolean => {
    if (!active || !model || event.defaultPrevented || isEditableTarget(event.target)) return false;
    // A focused control keeps the keys that press it.
    if (event.target instanceof HTMLElement && event.target.closest('button, [role="slider"], [role="menu"], [role="listbox"]')
      && [' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return false;
    // Arrows walk between boxes (Map has nothing to nudge), but only from the canvas or the bare page: a panel, tree or dialog keeps its own.
    // With a modifier they are swallowed like every other key Map has no use for (mapKeyAllowed below).
    const onCanvas = event.target === document.body || (event.target instanceof HTMLElement && event.target.matches('[data-testid="v2-canvas"]'));
    if (onCanvas && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && arrow(event.key)) { event.preventDefault(); return true; }
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
    return !mapKeyAllowed(event);
  }, [active, model, open, primaryId, flip, select, cancelTransient, arrow, shown]);

  const state = useCallback(() => ({
    mode: active ? 'map' as const : 'canvas' as const,
    open: [...open].sort(),
    nodes: mapPage?.nodes.map((node) => node.id) ?? [],
    labels: Object.fromEntries(mapPage?.nodes.map((node) => [node.id, String(node.content.label ?? '')]) ?? []),
    connectors: mapPage?.connectors.map((connector) => ({
      id: connector.id, from: connector.source.nodeId, to: connector.target.nodeId, label: connector.labels[0]?.text ?? '',
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
    return { ...stats, running };
  }, [player, hostRef]);

  return { mode: active ? 'map' as const : 'canvas' as const, available, active, mapPage, empty: active && empty, error: active ? error : null, setMode, toggle, clickNode, onKey, state, motionStats, openBoxes, model, arch, reveal, findSource,
    toolbar: { depth: controls.depth, canExpand: controls.canExpand, onDepth: controls.setDepth, onExpandOne: controls.expandOne, onCollapseAll: controls.collapse } };
}

function lookOf(arch: ArchModel, palette: DiagramPaletteName, autoIcons: boolean): MapLook {
  // The same choices a compile makes, so a map draws a box the way its Canvas page does.
  const auto = (arch.icons ?? (autoIcons ? 'auto' : 'off')) === 'auto';
  return {
    arch, swatch: paletteResolver(diagramPalette(arch.palette ?? palette)), resolveIcon: resolveDslIcon,
    ...(auto ? { inferIcon: (label: string, hint?: string) => { const id = inferIcon(label, hint); return id && resolveDslIcon(id) ? id : null; } } : {}),
  };
}
