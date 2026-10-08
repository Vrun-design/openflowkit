import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { insights } from '../../../../dsl/map/insights';
import { depthOf, isInside, pathTo } from '../../../../dsl/map/tree';
import type { AggEdge, Depth, LinkKind, MapModel } from '../../../../dsl/map/types';
import { linksOf, presets, visible } from '../../../../dsl/map/view';
import { frameBox, landing, MOVE_MS, topLeftOpen, zoomAt, type Cam, type Viewport } from './geometry';
import { layoutMap, type Scene } from './layout';
import { MapBox } from './MapBox';
import { MapDefs, MapEdgeLabels, MapEdgeLines, MapHighlights } from './MapEdges';
import type { EvidenceLink } from './MapEvidence';
import { MapPanel } from './MapPanel';
import { MapToolbar } from './MapToolbar';
import { Motion, type MotionItem } from './motion';
import { planMotion, type Leaving } from './planMotion';
import { canOpen, layerCounts, neighbours, oneLevel, pickNeighbour, revealExpanded, type Dir, type Selected } from './navigate';
import { usePointerCamera } from './usePointerCamera';
import { saveDepth, savedDepth } from './mapDepth';
import { useMapKeys } from './useMapKeys';
import './map.css';

const HUES = ['#4f7cd4', '#d4764f', '#4fa37c', '#a85fc9', '#c9a23f', '#3fa8b8', '#c95f84', '#7a8a3f'];
const BUDGET = 420;
const KINDS: LinkKind[] = ['import', 'call', 'data', 'build'];
// Visible area: below the toolbar strip, beside the panel (a bottom sheet on a phone).
const VIEW = { top: 72, bottom: 24, pad: 24 };

interface View { model: MapModel; expanded: ReadonlySet<string>; scene: Scene; ids: string[]; leaving: Leaving[] }
interface Plan { items: MotionItem[]; cam: Cam | null; ms: number }
interface Want { model: MapModel; expanded: ReadonlySet<string>; focus: string | null; auto: boolean }

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PANEL_W = 340;

export const MapSurface = memo(function MapSurface({ model, storageKey, evidenceLink, onError }: { model: MapModel; storageKey: string; evidenceLink: EvidenceLink; onError?: (message: string) => void }): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const camRef = useRef<SVGGElement>(null);
  const edgesRef = useRef<SVGGElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const hlRef = useRef<SVGGElement>(null);
  const motion = useMemo(() => new Motion(() => svgRef.current, () => camRef.current, () => [edgesRef.current, labelsRef.current, hlRef.current]), []);
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth | null>(null);
  const [off, setOff] = useState<ReadonlySet<LinkKind>>(new Set());
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 720); // a phone starts with the map, not the sheet
  const searchRef = useRef<HTMLInputElement>(null);
  const plan = useRef<Plan | null>(null);
  const live = useRef({ model, expanded: new Set<string>(), touched: false, scene: null as Scene | null, view: null as View | null, userCam: false, landNext: false, mounted: true, off: new Set<LinkKind>(), panel: window.innerWidth > 720 });
  const want = useRef<Want | null>(null);
  const busy = useRef(false);

  const viewport = (): Viewport => {
    const b = svgRef.current?.getBoundingClientRect();
    const open = live.current.panel;
    const wide = window.innerWidth > 720;
    const height = b?.height ?? 700;
    return { width: (b?.width ?? 1000) - (open && wide ? PANEL_W : 0), height, ...VIEW, bottom: open && !wide ? height * 0.6 : VIEW.bottom };
  };

  const commit = useCallback((m: MapModel, expanded: ReadonlySet<string>, scene: Scene, focus: string | null, auto: boolean) => {
    const prev = live.current.scene;
    const ids = visible(m, expanded);
    const rects = scene.laid.rects;
    const { items, leaving, gone } = planMotion(m, ids, rects, prev?.laid.rects, motion.cur);
    for (const id of gone) motion.cur.delete(id);
    const first = prev === null;
    const wantCam = first || live.current.landNext || auto;
    live.current.landNext = false;
    const focusRect = focus ? rects.get(focus) : undefined;
    const cam = wantCam ? landing(scene.laid.size, focusRect, viewport(), topLeftOpen(rects)) : null;
    plan.current = { items, cam, ms: first || reducedMotion() ? 0 : MOVE_MS };
    live.current.scene = scene;
    live.current.view = { model: m, expanded, scene, ids, leaving };
    setView({ model: m, expanded, scene, ids, leaving });
  }, [motion]);

  // One relayout in flight; the latest request waits its turn.
  const relayout = useCallback((m: MapModel, expanded: ReadonlySet<string>, focus: string | null, auto = false) => {
    want.current = { model: m, expanded, focus, auto: auto && !(want.current && !want.current.auto) };
    if (busy.current) return;
    busy.current = true;
    void (async () => {
      try {
        while (want.current) {
          const job = want.current;
          want.current = null;
          try {
            const scene = await layoutMap(job.model, job.expanded, live.current.off.size ? KINDS.filter((k) => !live.current.off.has(k)) : undefined);
            if (!want.current && live.current.mounted) commit(job.model, job.expanded, scene, job.focus, job.auto);
          } catch (error) {
            console.error('map layout failed', error);
            if (!live.current.view) onError?.('The map could not be laid out.');
          }
        }
      } finally {
        busy.current = false;
      }
    })();
  }, [commit, onError]);

  useEffect(() => {
    const l = live.current;
    l.mounted = true;
    return () => { l.mounted = false; motion.stop(); };
  }, [motion]);

  // A new snapshot: keep what the reader opened if it still exists, else the overview preset.
  useEffect(() => {
    const l = live.current;
    l.model = model;
    const keep = [...l.expanded].filter((id) => model.nodes[id] && canOpen(model, id));
    const saved = savedDepth(storageKey);
    l.expanded = l.touched ? new Set(keep) : presets(model)[saved ?? 'overview'];
    if (!l.touched) setDepth(saved ?? 'overview');
    setSelected((s) => (s?.type === 'node' && !model.nodes[s.id] ? null : s));
    relayout(model, l.expanded, null, !l.touched && !l.userCam);
  }, [model, storageKey, relayout]);

  useLayoutEffect(() => {
    const p = plan.current;
    if (!view || !p) return;
    plan.current = null;
    if (p.cam && p.ms === 0) motion.setCam(p.cam);
    motion.play(p.items, p.ms ? p.cam : null, p.ms, () => setView((v) => (v && v.leaving.length ? { ...v, leaving: [] } : v)));
  }, [view, motion]);

  const takeCam = useCallback(() => { live.current.userCam = true; motion.releaseCam(); }, [motion]);
  const { moved, handlers } = usePointerCamera(svgRef, motion, takeCam);
  const zoomBy = (f: number) => { const b = svgRef.current!.getBoundingClientRect(); takeCam(); motion.setCam(zoomAt(motion.cam, f, b.width / 2, b.height / 2)); };
  const fit = () => { const s = live.current.scene; if (s) { takeCam(); motion.setCam(frameBox({ x: 0, y: 0, ...s.laid.size }, viewport())); } window.setTimeout(() => svgRef.current?.focus(), 60); };

  /** Open exactly `next`, then lay out and land on `focus`. Refuses past the box budget. */
  const apply = useCallback((next: ReadonlySet<string>, focus: string | null, depthChoice: Depth | null, check = true): boolean => {
    const l = live.current;
    if (check && visible(l.view?.model ?? l.model, next).length > BUDGET) { setNote('That opens too many boxes at once. Open a smaller part first.'); return false; }
    setNote(null);
    l.touched = true;
    l.userCam = false;
    l.landNext = true;
    l.expanded = new Set([...next].filter((x) => l.model.nodes[x] && canOpen(l.model, x)));
    setDepth(depthChoice);
    relayout(l.model, l.expanded, focus && l.model.nodes[focus] ? focus : null);
    return true;
  }, [relayout]);

  const activate = useCallback((id: string, viaPointer = false) => {
    if (viaPointer && moved.current) return;
    // Clicks resolve against what is on screen: a newer snapshot may not have this id yet (or any more).
    const shown = live.current.view;
    if (!shown?.model.nodes[id]) return;
    setSelected({ type: 'node', id });
    setNote(null);
    live.current.touched = true;
    if (!canOpen(shown.model, id)) return;
    apply(shown.expanded.has(id) ? new Set([...shown.expanded].filter((x) => !isInside(shown.model, x, id))) : new Set(shown.expanded).add(id), id, null);
  }, [apply, moved]);

  /** Show `id`: open what holds it, select it, land the camera on it. */
  const reveal = useCallback((id: string) => {
    const shown = live.current.view;
    if (!shown?.model.nodes[id]) return;
    if (apply(revealExpanded(shown.model, shown.expanded, id), id, null)) setSelected({ type: 'node', id });
    window.setTimeout(() => svgRef.current?.focus(), 60);
  }, [apply]);

  /** Toolbar and panel actions hand focus back to the map, so its keys keep working. */
  const focusMap = () => { window.setTimeout(() => svgRef.current?.focus(), 60); };
  const chooseDepth = (d: Depth) => { saveDepth(storageKey, d); apply(presets(live.current.model)[d], null, d, false); focusMap(); };
  const toggleLayer = (kind: LinkKind) => {
    const l = live.current;
    const next = new Set(l.off);
    if (!next.delete(kind)) next.add(kind);
    l.off = next;
    setOff(next);
    relayout(l.model, l.expanded, null);
  };
  const selectEdge = useCallback((key: string) => { if (!moved.current) setSelected({ type: 'edge', key }); }, [moved]);

  const togglePanel = () => setPanelOpen((open) => { live.current.panel = !open; return !open; });
  useEffect(() => { requestAnimationFrame(() => svgRef.current?.focus()); }, []);

  const focusBox = (id: string) => requestAnimationFrame(() => svgRef.current?.querySelector<SVGElement>(`[data-id="${CSS.escape(id)}"]`)?.focus());
  const moveSelection = (dir: Dir) => {
    const shown = live.current.view;
    if (!shown) return;
    const rects = shown.scene.laid.rects;
    const focused = (document.activeElement as Element | null)?.closest?.('[data-box]')?.getAttribute('data-id');
    const current = focused && shown.model.nodes[focused] ? focused : selected?.type === 'node' ? selected.id : null;
    const siblings = current ? (shown.model.nodes[shown.model.nodes[current]?.parent ?? '']?.children ?? []) : shown.model.nodes[shown.model.root].children;
    const target = current ? pickNeighbour(rects, siblings, current, dir) : siblings.find((id) => rects.has(id)) ?? null;
    if (target) { setSelected({ type: 'node', id: target }); focusBox(target); }
  };
  const escape = () => {
    const shown = live.current.view;
    if (selected?.type === 'node' && shown) {
      const parent = shown.model.nodes[selected.id]?.parent;
      if (parent && parent !== shown.model.root && shown.expanded.has(parent)) {
        setSelected({ type: 'node', id: parent });
        apply(new Set([...shown.expanded].filter((x) => !isInside(shown.model, x, parent))), parent, null);
        focusBox(parent);
      } else setSelected(null);
    } else if (selected) setSelected(null);
    else if (panelOpen) togglePanel();
  };

  useMapKeys({
    search: () => searchRef.current?.focus(),
    fit,
    zoom: zoomBy,
    move: moveSelection,
    toggle: () => { if (selected?.type === 'node') activate(selected.id); },
    escape,
  });

  // A selection that the map no longer shows (collapse, preset) falls back to the nearest box that is.
  useEffect(() => {
    if (!view) return;
    setSelected((s) => {
      if (s?.type !== 'node' || view.scene.laid.rects.has(s.id)) return s;
      for (let at = view.model.nodes[s.id]?.parent ?? null; at; at = view.model.nodes[at]?.parent ?? null) if (view.scene.laid.rects.has(at)) return { type: 'node', id: at };
      return null;
    });
  }, [view]);

  const hues = useMemo(() => {
    const top = model.nodes[model.root].children.filter((id) => model.nodes[id].kind === 'part').sort();
    return new Map(top.map((id, i) => [id, HUES[i % HUES.length]!]));
  }, [model]);
  const byKey = useMemo(() => new Map<string, AggEdge>((view?.scene.edges ?? []).map((e) => [e.key, e])), [view]);
  const shownModel = view?.model ?? model;
  const facts = useMemo(() => insights(shownModel), [shownModel]);
  const counts = useMemo(() => layerCounts(shownModel), [shownModel]);
  const talks = useMemo(() => (view && selected?.type === 'node' && view.model.nodes[selected.id] ? linksOf(view.model, selected.id, view.expanded) : []), [view, selected]);
  const touching = useMemo(() => (view && selected?.type === 'node' && view.model.nodes[selected.id] ? new Set(view.ids.filter((id) => isInside(view.model, id, selected.id) || isInside(view.model, selected.id, id))) : null), [view, selected]);
  const near = useMemo(() => (view && selected?.type === 'node' && view.model.nodes[selected.id] ? neighbours(view.model, view.ids, selected.id, talks) : null), [view, selected, talks]);
  const boxes = view ? [...view.leaving.map((l) => ({ id: l.id, rect: l.rect, open: l.open, leaving: true })), ...view.ids.flatMap((id) => { const rect = view.scene.laid.rects.get(id); return rect ? [{ id, rect, open: rect.open, leaving: false }] : []; })] : [];
  const draw = (b: (typeof boxes)[number]) => {
    const m = view!.model;
    const node = m.nodes[b.id];
    if (!node) return null;
    return <MapBox key={b.id} node={node} rect={b.rect} canOpen={canOpen(m, b.id)} open={b.open} leaving={b.leaving} selected={selected?.type === 'node' && selected.id === b.id} dim={near !== null && !near.has(b.id)}
      hue={hues.get(pathTo(m, b.id)[1] ?? '') ?? null} depth={depthOf(m, b.id)} onActivate={activate} />;
  };
  const laidEdges = view?.scene.laid.edges ?? [];
  const selKey = selected?.type === 'edge' ? selected.key : null;

  const edgeProps = { laid: laidEdges, byKey, selected: selKey, onSelect: selectEdge, near, model: view?.model, tabbable: touching };
  const layersOn = new Set(KINDS.filter((k) => !off.has(k)));
  return (
    <div className="map-stage">
      <svg ref={svgRef} className="map-svg" role="application" aria-label="Repository map" tabIndex={0} {...handlers} onClick={() => { if (!moved.current) setSelected(null); }}>
        <MapDefs />
        <g ref={camRef}>
          <g className="l-open">{boxes.filter((b) => b.open && canOpen(view!.model, b.id)).map(draw)}</g>
          <g ref={edgesRef} className="l-edges"><MapEdgeLines {...edgeProps} /></g>
          <g ref={labelsRef} className="l-labels"><MapEdgeLabels {...edgeProps} /></g>
          <g className="l-closed">{boxes.filter((b) => !(b.open && canOpen(view!.model, b.id))).map(draw)}</g>
          <g ref={hlRef} className="l-hl">
            {view && selected?.type === 'node' ? <MapHighlights from={view.scene.laid.rects.get(selected.id)} talks={talks} rects={view.scene.laid.rects} /> : null}
          </g>
        </g>
      </svg>
      <MapToolbar model={shownModel} depth={depth} onDepth={chooseDepth} counts={counts} layers={layersOn} onLayer={toggleLayer} onReveal={reveal} searchRef={searchRef} onFit={fit}
        onLevel={() => { const s = live.current.view; if (s) apply(oneLevel(s.model, s.expanded), selected?.type === 'node' ? selected.id : null, null); focusMap(); }}
        onCollapse={() => { apply(new Set(), null, null, false); focusMap(); }} panelOpen={panelOpen} onPanel={togglePanel} />
      {note ? <div className="map-note" role="status">{note}</div> : null}
      {panelOpen ? <MapPanel model={shownModel} selected={selected} edge={selKey ? byKey.get(selKey) : undefined} talks={talks} insights={facts} evidenceLink={evidenceLink} onReveal={reveal} onClose={togglePanel} /> : null}
    </div>
  );
});
