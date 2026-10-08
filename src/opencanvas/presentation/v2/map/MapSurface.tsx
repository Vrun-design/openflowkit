import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LaidRect } from '../../../../dsl/map/elk';
import { depthOf, isInside, pathTo } from '../../../../dsl/map/tree';
import type { AggEdge, MapModel } from '../../../../dsl/map/types';
import { linksOf, presets, visible } from '../../../../dsl/map/view';
import { frameBox, landing, MOVE_MS, zoomAt, type Cam, type Rect, type Viewport } from './geometry';
import { layoutMap, type Scene } from './layout';
import { MapBox } from './MapBox';
import { KINDS, MapDefs, MapEdgeLabels, MapEdgeLines, MapHighlights } from './MapEdges';
import { Motion, type MotionItem } from './motion';
import { MapSelection, type Selected } from './MapSelection';
import './map.css';

const HUES = ['#4f7cd4', '#d4764f', '#4fa37c', '#a85fc9', '#c9a23f', '#3fa8b8', '#c95f84', '#7a8a3f'];
const BUDGET = 420;
const VIEW = { top: 48, bottom: 24, pad: 24 };

interface Leaving { id: string; rect: LaidRect; open: boolean }
interface View { model: MapModel; expanded: ReadonlySet<string>; scene: Scene; ids: string[]; leaving: Leaving[] }
interface Plan { items: MotionItem[]; cam: Cam | null; ms: number }
interface Want { model: MapModel; expanded: ReadonlySet<string>; focus: string | null; auto: boolean }

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const canOpen = (model: MapModel, id: string) => model.nodes[id].children.length > 0;

export const MapSurface = memo(function MapSurface({ model, onError }: { model: MapModel; onError?: (message: string) => void }): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const camRef = useRef<SVGGElement>(null);
  const edgesRef = useRef<SVGGElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const hlRef = useRef<SVGGElement>(null);
  const motion = useMemo(() => new Motion(() => svgRef.current, () => camRef.current, () => [edgesRef.current, labelsRef.current, hlRef.current]), []);
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const plan = useRef<Plan | null>(null);
  const live = useRef({ model, expanded: new Set<string>(), touched: false, scene: null as Scene | null, view: null as View | null, userCam: false, landNext: false, mounted: true });
  const want = useRef<Want | null>(null);
  const busy = useRef(false);
  const moved = useRef(false);

  const viewport = (): Viewport => {
    const b = svgRef.current?.getBoundingClientRect();
    return { width: b?.width ?? 1000, height: b?.height ?? 700, ...VIEW };
  };

  const commit = useCallback((m: MapModel, expanded: ReadonlySet<string>, scene: Scene, focus: string | null, auto: boolean) => {
    const prev = live.current.scene;
    const ids = visible(m, expanded);
    const rects = scene.laid.rects;
    const start = (id: string): Rect | undefined => {
      for (let at: string | null = id; at; at = m.nodes[at]?.parent ?? null) { const r = motion.cur.get(at); if (r) return r; }
      return undefined;
    };
    const gone: string[] = [];
    const end = (id: string): Rect | undefined => {
      for (let at: string | null = id; at; at = m.nodes[at]?.parent ?? null) { const r = rects.get(at); if (r) return r; }
      return undefined;
    };
    const items: MotionItem[] = [];
    for (const id of ids) {
      const to = rects.get(id);
      if (to) items.push({ id, from: motion.cur.get(id) ?? start(id) ?? to, to, fade: motion.cur.has(id) ? null : 'in' });
    }
    const leaving: Leaving[] = [];
    for (const [id, from] of motion.cur) {
      if (rects.has(id)) continue;
      if (!m.nodes[id]) { gone.push(id); continue; }
      const to = end(id);
      const open = prev?.laid.rects.get(id)?.open ?? false;
      if (to) { items.push({ id, from, to, fade: 'out' }); leaving.push({ id, rect: { ...from, open }, open }); } else gone.push(id);
    }
    for (const id of gone) motion.cur.delete(id);
    const first = prev === null;
    const wantCam = first || live.current.landNext || auto;
    live.current.landNext = false;
    const focusRect = focus ? rects.get(focus) : undefined;
    const cam = wantCam ? landing(scene.laid.size, focusRect, viewport()) : null;
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
            const scene = await layoutMap(job.model, job.expanded);
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
    l.expanded = l.touched ? new Set(keep) : presets(model).overview;
    setSelected((s) => (s?.type === 'node' && !model.nodes[s.id] ? null : s));
    relayout(model, l.expanded, null, !l.touched && !l.userCam);
  }, [model, relayout]);

  useLayoutEffect(() => {
    const p = plan.current;
    if (!view || !p) return;
    plan.current = null;
    if (p.cam && p.ms === 0) motion.setCam(p.cam);
    motion.play(p.items, p.ms ? p.cam : null, p.ms, () => setView((v) => (v && v.leaving.length ? { ...v, leaving: [] } : v)));
  }, [view, motion]);

  const activate = useCallback((id: string, viaPointer = false) => {
    if (viaPointer && moved.current) return;
    // Clicks resolve against what is on screen: a newer snapshot may not have this id yet (or any more).
    const shown = live.current.view;
    if (!shown?.model.nodes[id]) return;
    setSelected({ type: 'node', id });
    setNote(null);
    const l = live.current;
    l.touched = true;
    if (!canOpen(shown.model, id)) return;
    let next: Set<string>;
    if (shown.expanded.has(id)) next = new Set([...shown.expanded].filter((x) => !isInside(shown.model, x, id)));
    else {
      next = new Set(shown.expanded).add(id);
      if (visible(shown.model, next).length > BUDGET) { setNote('That opens too many boxes at once. Open a smaller part first.'); return; }
    }
    l.userCam = false;
    l.landNext = true;
    l.expanded = new Set([...next].filter((x) => l.model.nodes[x] && canOpen(l.model, x)));
    relayout(l.model, l.expanded, l.model.nodes[id] ? id : null);
  }, [relayout]);

  const selectEdge = useCallback((key: string) => { if (!moved.current) setSelected({ type: 'edge', key }); }, []);
  const takeCam = useCallback(() => { live.current.userCam = true; motion.releaseCam(); }, [motion]);
  const fit = () => { const s = live.current.scene; if (s) { takeCam(); motion.setCam(frameBox({ x: 0, y: 0, ...s.laid.size }, viewport())); } };

  // Camera: wheel zoom at the cursor, drag pan, pinch.
  useEffect(() => {
    const svg = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = svg.getBoundingClientRect();
      takeCam();
      motion.setCam(zoomAt(motion.cam, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - b.left, e.clientY - b.top));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [motion, takeCam]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; cam: Cam; dist: number } | null>(null);
  const spread = () => { const [a, b] = [...pointers.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.size === 0) moved.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { x: e.clientX, y: e.clientY, cam: motion.cam, dist: spread() };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = pointers.current.get(e.pointerId);
    const g = gesture.current;
    if (!p || !g) return;
    p.x = e.clientX; p.y = e.clientY;
    const b = e.currentTarget.getBoundingClientRect();
    if (pointers.current.size >= 2) {
      const [a, c] = [...pointers.current.values()];
      const d = spread();
      if (g.dist > 0 && d > 0) {
        moved.current = true;
        takeCam();
        motion.setCam(zoomAt(motion.cam, d / g.dist, (a!.x + c!.x) / 2 - b.left, (a!.y + c!.y) / 2 - b.top));
      }
      g.dist = d;
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!moved.current && Math.hypot(dx, dy) > 4) { moved.current = true; e.currentTarget.setPointerCapture(e.pointerId); }
    if (moved.current) { takeCam(); motion.setCam({ ...g.cam, x: g.cam.x + dx, y: g.cam.y + dy }); }
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const left = [...pointers.current.values()][0];
    gesture.current = left ? { x: left.x, y: left.y, cam: motion.cam, dist: 0 } : null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const b = svgRef.current!.getBoundingClientRect();
    if (e.key === 'f' || e.key === 'F') fit();
    else if (e.key === '+' || e.key === '=') { takeCam(); motion.setCam(zoomAt(motion.cam, 1.25, b.width / 2, b.height / 2)); }
    else if (e.key === '-') { takeCam(); motion.setCam(zoomAt(motion.cam, 0.8, b.width / 2, b.height / 2)); }
    else if (e.key === 'Escape') setSelected(null);
  };

  const hues = useMemo(() => {
    const top = model.nodes[model.root].children.filter((id) => model.nodes[id].kind === 'part').sort();
    return new Map(top.map((id, i) => [id, HUES[i % HUES.length]!]));
  }, [model]);
  const byKey = useMemo(() => new Map<string, AggEdge>((view?.scene.edges ?? []).map((e) => [e.key, e])), [view]);
  const talks = useMemo(() => (view && selected?.type === 'node' && view.model.nodes[selected.id] ? linksOf(view.model, selected.id, view.expanded) : []), [view, selected]);

  const boxes = view ? [...view.leaving.map((l) => ({ id: l.id, rect: l.rect, open: l.open, leaving: true })), ...view.ids.flatMap((id) => { const rect = view.scene.laid.rects.get(id); return rect ? [{ id, rect, open: rect.open, leaving: false }] : []; })] : [];
  const draw = (b: (typeof boxes)[number]) => {
    const m = view!.model;
    const node = m.nodes[b.id];
    if (!node) return null;
    return <MapBox key={b.id} node={node} rect={b.rect} canOpen={canOpen(m, b.id)} open={b.open} leaving={b.leaving} selected={selected?.type === 'node' && selected.id === b.id}
      hue={hues.get(pathTo(m, b.id)[1] ?? '') ?? null} depth={depthOf(m, b.id)} onActivate={activate} />;
  };
  const laidEdges = view?.scene.laid.edges ?? [];
  const shown = new Set(view ? view.scene.edges.map((e) => e.kind) : []);
  const selKey = selected?.type === 'edge' ? selected.key : null;

  return (
    <div className="map-stage">
      <svg ref={svgRef} className="map-svg" role="application" aria-label="Repository map" tabIndex={0} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown} onClick={() => { if (!moved.current) setSelected(null); }}>
        <MapDefs />
        <g ref={camRef}>
          <g className="l-open">{boxes.filter((b) => b.open && canOpen(view!.model, b.id)).map(draw)}</g>
          <g ref={edgesRef} className="l-edges"><MapEdgeLines laid={laidEdges} byKey={byKey} selected={selKey} onSelect={selectEdge} /></g>
          <g ref={labelsRef} className="l-labels"><MapEdgeLabels laid={laidEdges} byKey={byKey} selected={selKey} onSelect={selectEdge} /></g>
          <g className="l-closed">{boxes.filter((b) => !(b.open && canOpen(view!.model, b.id))).map(draw)}</g>
          <g ref={hlRef} className="l-hl">
            {view && selected?.type === 'node' ? <MapHighlights from={view.scene.laid.rects.get(selected.id)} talks={talks} rects={view.scene.laid.rects} /> : null}
          </g>
        </g>
      </svg>
      <MapSelection model={view?.model ?? model} selected={selected} edge={selKey ? byKey.get(selKey) : undefined} talks={talks} note={note} layers={KINDS.filter((k) => shown.has(k))} />
    </div>
  );
});
