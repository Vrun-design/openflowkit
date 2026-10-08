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
import { MOVE_MS } from '../../../application/map/geometry';
import { layoutMap, type LayoutPorts } from '../../../application/map/layoutMap';
import { absoluteRects } from '../../../application/map/motionFrame';
import { cullMotion, movedView } from '../../../application/map/motionCull';
import { MapMotionPlayer } from '../../../application/map/motionPlayer';
import { planMotion } from '../../../application/map/planMotion';
import type { LaidRect } from '../../../../dsl/map/elk';
import type { CanvasCamera } from '../../../domain/camera/types';
import type { SceneNode, ScenePage } from '../../../domain/document/types';
import { diagramPalette, paletteResolver, type DiagramPaletteName } from '../../../domain/nodes/nodePalette';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';
import { foundation } from '../../design-system/tokens';
import { visibleCanvasEdges } from '../V2ContextBar';
import type { V2Tool } from '../V2CreationToolbar';
import { isEditableTarget } from '../pointerOperations';
import { measure } from './layout';
import {
  BUDGET_NOTE, fitsBudget, isDoubleClick, freeArea, landOn, mapCamera, mapKeyAllowed, parentToClose, prune, sceneExtent, sceneFor, toggleBox, type FreeArea, type TaggedScene,
} from './mapMode';

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
  /** The editor's own Escape chain before Map closes a box: gesture, panel, tool. True when it cancelled something. */
  readonly cancelTransient: () => boolean;
  readonly closeChart: () => void;
  /** A short polite note, shown and announced by the editor. */
  readonly notify: (message: string) => void;
}

const NONE: ReadonlySet<string> = new Set();
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const { page, documentId, palette, autoIcons, hostRef, cameraRef, updateCamera, fitView, onToolChange, primaryId, select, cancelTransient, closeChart, notify } = options;
  // Cheap: only whether the page carries a model. The model itself is read only while the map is on.
  const available = useMemo(() => (page ? archFrameOf(page) !== null : false), [page]);
  const [mode, setModeState] = useState<V2MapModeName>('canvas');
  const active = mode === 'map' && available;
  const arch = useStable(useMemo(() => (active && page ? archModelOfPage(page) : null), [active, page]));
  const [openState, setOpenState] = useState<ReadonlySet<string> | null>(null);
  const [scene, setScene] = useState<TaggedScene<ArchModel> | null>(null);
  const [drawError, setError] = useState<string | null>(null);
  const saved = useRef<{ pageId: string | null; camera: CanvasCamera } | null>(null);
  const leaving = useRef(false);
  const lastFlip = useRef(Number.NEGATIVE_INFINITY);
  const layouts = useRef(0);
  // Layouts asked for vs. shown on the host: between the two the map is about to move, which is not idle yet.
  const asked = useRef(0);
  const shownSeq = useRef(0);
  const landedSeq = useRef(0);
  // How often the editor page rendered: a move must not add one per frame (counted for the test hook).
  const renders = useRef(0);
  useEffect(() => { renders.current += 1; });
  // A map's lineage is its document and page: an edit keeps it (and keeps the old scene up while it lays out).
  const lineageKey = `${documentId ?? ''}/${page?.id ?? ''}`;
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
  const updateRef = useRef(updateCamera);
  useEffect(() => { updateRef.current = updateCamera; });
  // The box a click just opened or closed: the camera brings it into view when its layout arrives.
  const focusRef = useRef<{ id: string } | null>(null);
  const mine = useRef<CanvasCamera | null>(null);
  // The sink reads the refs when a frame runs, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [player] = useState(() => {
    const self: MapMotionPlayer = new MapMotionPlayer({
      frame: (frame, camera) => {
        const host = hostRef.current;
        if (!host) return;
        if (camera) {
          // The reader moved the camera mid-move (wheel, drag, buttons): it is theirs now.
          if (cameraRef.current !== mine.current) self.releaseCam();
          else { mine.current = camera; cameraRef.current = camera; host.setCamera(camera); }
        }
        host.drawMotionFrame(frame);
      },
      end: (settled, camera) => {
        hostRef.current?.endMotion(settled);
        // Cut short mid-move: React still has to learn where the camera was left.
        if (!settled && camera) updateRef.current(camera);
      },
    });
    return self;
  });
  useEffect(() => () => player.stop(), [player]);
  const shown = useRef<{ page: ScenePage; rects: Map<string, LaidRect>; chain: number | undefined } | null>(null);
  // Every box drawn now or still folding away, by id: the leaving ones are no longer in the scene.
  const drawn = useRef(new Map<string, SceneNode>());

  const built = useMemo(() => {
    if (!arch) return null;
    try { return { model: fromArch(arch), look: lookOf(arch, palette, autoIcons) }; } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'The map could not be drawn.' };
    }
  }, [arch, palette, autoIcons]);
  const model = built && 'model' in built ? built.model : null;
  const look = built && 'look' in built ? built.look : null;
  const open = useMemo(() => (model ? (openState ? prune(model, openState) : presets(model).overview) : NONE), [model, openState]);
  const error = built && 'error' in built ? built.error ?? null : active && !arch ? 'This page has no readable model.' : drawError;
  const empty = model !== null && model.nodes[model.root].children.length === 0;

  useEffect(() => {
    if (!active || !arch || !model || !look) return;
    let stale = false;
    const seq = ++asked.current;
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
    draw().then((next) => { if (!stale) { layouts.current += 1; landedSeq.current = seq; setError(null); setScene({ model: arch, page: next, lineage: keyRef.current, chain: chain.current }); } })
      .catch((cause: unknown) => {
        if (stale) return;
        landedSeq.current = seq;
        shownSeq.current = seq;
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
  // The canvas the side panels and the floating chrome leave: the document bar, the right rail and the camera controls are measured now.
  const clearance = useCallback((host: PixiRendererHost): FreeArea => {
    const size = host.getViewportSize();
    const root = document.querySelector<HTMLElement>('.ofk-v2');
    const origin = document.querySelector<HTMLElement>('[data-testid="v2-canvas"]')?.getBoundingClientRect();
    const at = (label: string) => root?.querySelector<HTMLElement>(`[role="toolbar"][aria-label="${label}"]`)?.getBoundingClientRect();
    const [bar, rail, controls] = [at('Document'), at('Workspace'), at('View')];
    const { left, right } = visibleCanvasEdges(root);
    const [ox, oy] = [origin?.left ?? 0, origin?.top ?? 0];
    return freeArea(size, { left, right: right - ox }, {
      ...(bar ? { top: bar.bottom - oy } : {}), ...(rail ? { rail: rail.left - ox } : {}), ...(controls ? { bottom: controls.top - oy } : {}),
    });
  }, []);
  // The host has already taken the new scene (the canvas effect runs first): its index is the target, so clicks land on it.
  // From here only the picture moves, from where each box is drawn to where it now belongs.
  useEffect(() => {
    // Map off, or no scene for this page (another page's model, a layout error): nothing of an earlier map may keep moving or draw.
    if (!mapPage || mapPage === EMPTY_MAP) { player.stop(); shown.current = null; player.cur.clear(); drawn.current.clear(); focusRef.current = null; shownSeq.current = asked.current; return; }
    const host = hostRef.current;
    const before = shown.current;
    if (!host || before?.page === mapPage) return;
    // This effect is where a landed layout starts moving, or lands at once: from here the motion state tells the truth.
    shownSeq.current = landedSeq.current;
    const extent = sceneExtent(mapPage);
    const rects = absoluteRects(mapPage);
    const settle = () => { player.cur.clear(); drawn.current.clear(); rects.forEach((rect, id) => player.cur.set(id, rect)); mapPage.nodes.forEach((node) => drawn.current.set(node.id, node)); };
    shown.current = { page: mapPage, rects, chain: scene?.chain };
    if (!before || before.chain !== scene?.chain || !extent || !model) {
      player.stop();
      settle();
      if (!extent) return;
      updateCamera(mapCamera(extent, clearance(host)));
      return;
    }
    const { items, gone } = planMotion(model, mapPage.nodes.map((node) => node.id), rects, before.rects, player.cur);
    for (const id of gone) { player.cur.delete(id); drawn.current.delete(id); }
    mapPage.nodes.forEach((node) => drawn.current.set(node.id, node));
    const focus = focusRef.current;
    focusRef.current = null;
    const camTo = focus && rects.has(focus.id) ? landOn(extent, rects.get(focus.id), clearance(host), cameraRef.current) : null;
    const moving = items.some((item) => item.fade || (['x', 'y', 'width', 'height'] as const).some((key) => item.from[key] !== item.to[key]));
    if (reducedMotion() || !moving) {
      // End state in one frame, arrows visible at once.
      player.stop();
      settle();
      if (camTo) updateCamera(camTo);
      return;
    }
    // Labels wrap to the width each box ends with (a leaving box, to the one it had), so they are laid out once.
    const widths = new Map([...before.page.nodes, ...mapPage.nodes].map((node) => [node.id, node.size.width] as const));
    mine.current = cameraRef.current;
    // Only boxes someone can see are tweened; the rest jump to where they end (the host draws them at the end of the move).
    const { live, jumped } = cullMotion(items, movedView(cameraRef.current, camTo, host.getViewportSize()));
    for (const item of jumped) { if (item.fade === 'out') player.cur.delete(item.id); else player.cur.set(item.id, item.to); }
    player.play({ items: live, nodeOf: (id) => drawn.current.get(id), widths, camFrom: cameraRef.current, camTo }, MOVE_MS, () => {
      for (const id of [...drawn.current.keys()]) if (!rects.has(id)) drawn.current.delete(id);
      // React learns the camera once, here, not once per frame.
      if (player.camera) updateCamera(player.camera);
    }, () => renders.current);
  }, [mapPage, scene, model, hostRef, cameraRef, updateCamera, player, clearance]);

  /** True when the open set changed. */
  const flip = useCallback((id: string): boolean => {
    if (!model) return false;
    const next = toggleBox(model, open, id);
    if (next === open) return false;
    if (!fitsBudget(model, next)) { notify(BUDGET_NOTE); return false; }
    focusRef.current = { id };
    setOpenState(next);
    return true;
  }, [model, open, notify]);
  /** Test hook: opens exactly `ids` (within the box budget, like a click), landing the camera on `focus` (default: the last one opened). */
  const openBoxes = useCallback((ids: readonly string[], focus?: string) => {
    if (!model) return;
    const next = prune(model, new Set(ids));
    if (!fitsBudget(model, next)) { notify(BUDGET_NOTE); return; }
    const at = focus ?? ids.at(-1);
    focusRef.current = at ? { id: at } : null;
    setOpenState(next);
  }, [model, notify]);
  const clickNode = useCallback((id: string) => {
    const now = performance.now();
    if (isDoubleClick(lastFlip.current, now)) return;
    if (flip(id)) lastFlip.current = now;
  }, [flip]);

/** True when the editor's own shortcuts must not see this key. */
  const onKey = useCallback((event: KeyboardEvent<HTMLElement>): boolean => {
    if (!active || !model || event.defaultPrevented || isEditableTarget(event.target)) return false;
    // A focused control keeps the keys that press it.
    if (event.target instanceof HTMLElement && event.target.closest('button, [role="slider"], [role="menu"], [role="listbox"]')
      && [' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return false;
    const id = primaryId();
    if (event.key === 'Enter') {
      if (id) flip(id);
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
  }, [active, model, open, primaryId, flip, select, cancelTransient]);

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
  }), [active, open, mapPage]);
  /** The last move's numbers (frames, drawing cost, frame gaps, page renders): for the test hook and the perf spec. */
  const motionStats = useCallback(() => {
    const stats = player.stats();
    // Running until the layout asked for is on screen, the move is over and the arrows are all the way back.
    const running = stats.running || shownSeq.current < asked.current || (hostRef.current?.getMotionState().fading ?? false);
    return { ...stats, running };
  }, [player, hostRef]);

  return { mode: active ? 'map' as const : 'canvas' as const, available, active, mapPage, empty: active && empty, error: active ? error : null, setMode, toggle, clickNode, onKey, state, motionStats, openBoxes };
}

function lookOf(arch: ArchModel, palette: DiagramPaletteName, autoIcons: boolean): MapLook {
  // The same choices a compile makes, so a map draws a box the way its Canvas page does.
  const auto = (arch.icons ?? (autoIcons ? 'auto' : 'off')) === 'auto';
  return {
    arch, swatch: paletteResolver(diagramPalette(arch.palette ?? palette)), resolveIcon: resolveDslIcon,
    ...(auto ? { inferIcon: (label: string, hint?: string) => { const id = inferIcon(label, hint); return id && resolveDslIcon(id) ? id : null; } } : {}),
  };
}
