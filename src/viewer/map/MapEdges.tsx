import { memo, useMemo } from 'react';
import type { LaidEdge, LaidRect } from '../../dsl/map/elk';
import type { AggEdge, LinkKind, MapModel, Talk } from '../../dsl/map/types';
import { edgeText } from '../../dsl/map/view';
import { curve, roundedPath } from './geometry';
import { FONT, measure } from '../../opencanvas/presentation/v2/map/layout';

export const KINDS: LinkKind[] = ['import', 'call', 'data', 'build'];

/** Arrowhead markers, one per link kind plus the lit one. */
export function MapDefs(): React.JSX.Element {
  return (
    <defs>
      {[...KINDS, 'hl'].map((k) => (
        <marker key={k} id={`mm-${k}`} className={`mm mm-${k}`} markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path d="M0,0 L8,3 L0,6 z" />
        </marker>
      ))}
    </defs>
  );
}

const strokeOf = (e: AggEdge) => (e.kind === 'import' ? Math.min(3.4, 0.9 + Math.log2(e.count) * 0.45) : 1.3);

interface EdgesProps {
  laid: readonly LaidEdge[];
  byKey: ReadonlyMap<string, AggEdge>;
  selected: string | null;
  onSelect: (key: string) => void;
  /** Boxes left undimmed by a selection; null when nothing is selected. */
  near: ReadonlySet<string> | null;
  /** Boxes whose arrows are in the Tab order (the selection and what it holds or sits in); others are reachable by click. */
  tabbable: ReadonlySet<string> | null;
  model?: MapModel;
}
/** A single import line: drawn thin and quiet, and its count shows only on hover or when it is in the selection. */
const single = (e: AggEdge) => e.kind === 'import' && e.count === 1;
const dimmed = (e: AggEdge, near: ReadonlySet<string> | null) => (near && !near.has(e.from) && !near.has(e.to) ? ' dim' : '');

/** Arrow lines (rounded orthogonal ELK routes) and, in a later layer, their masked count labels. */
export const MapEdgeLines = memo(function MapEdgeLines({ laid, byKey, selected, onSelect, near, model, tabbable }: EdgesProps): React.JSX.Element {
  return (
    <>
      {laid.map((l) => {
        const e = byKey.get(l.key);
        if (!e || l.points.length < 2) return null;
        const name = (id: string) => model?.nodes[id]?.name ?? id;
        const d = roundedPath(l.points);
        return (
          <g key={l.key} className={`edge k-${e.kind}${selected === l.key ? ' sel' : ''}${e.inferred ? ' inferred' : ''}${single(e) ? ' single' : ''}${dimmed(e, near)}`} data-edge={l.key} tabIndex={selected === l.key || tabbable?.has(e.from) || tabbable?.has(e.to) ? 0 : -1} role="button"
            aria-label={`${name(e.from)} to ${name(e.to)}, ${e.kind}, ${edgeText(e)}`}
            onClick={(ev) => { ev.stopPropagation(); onSelect(l.key); }} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect(l.key); } }}>
            <title>{`${name(e.from)} to ${name(e.to)}: ${e.kind} ${edgeText(e)}`}</title>
            <path className="line" d={d} strokeWidth={strokeOf(e)} markerEnd={`url(#mm-${e.kind})`} markerStart={e.both ? `url(#mm-${e.kind})` : undefined} />
            <path className="hit" d={d} />
          </g>
        );
      })}
    </>
  );
});

export const MapEdgeLabels = memo(function MapEdgeLabels({ laid, byKey, selected, onSelect, near }: EdgesProps): React.JSX.Element {
  return (
    <>
      {laid.map((l) => {
        const e = byKey.get(l.key);
        if (!e || !l.label || l.points.length < 2) return null;
        if (single(e) && selected !== l.key && !near?.has(e.from) && !near?.has(e.to)) return null;
        const text = edgeText(e);
        const w = l.label.width;
        return (
          <g key={l.key} className={`lbl${selected === l.key ? ' sel' : ''}${dimmed(e, near)}`} transform={`translate(${l.label.x ?? 0},${l.label.y ?? 0})`} onClick={(ev) => { ev.stopPropagation(); onSelect(l.key); }}>
            <rect width={w} height={16} rx={2} />
            <text x={w / 2} y={11.5} textAnchor="middle">{text}</text>
          </g>
        );
      })}
    </>
  );
});

/** The selected box's exact links as curved overlays with counts, in the one accent. */
export function MapHighlights({ from, talks, rects }: { from: LaidRect | undefined; talks: readonly Talk[]; rects: ReadonlyMap<string, LaidRect> }): React.JSX.Element {
  const items = useMemo(() => {
    if (!from) return [];
    return talks.slice(0, 14).flatMap((t) => {
      const other = rects.get(t.id);
      if (!other) return [];
      return [
        ...(t.out ? [{ key: `${t.id}>`, count: t.out, ...curve(from, other) }] : []),
        ...(t.in ? [{ key: `${t.id}<`, count: t.in, ...curve(other, from) }] : []),
      ];
    });
  }, [from, talks, rects]);
  return (
    <>
      {items.map((c) => {
        const text = String(c.count);
        const w = measure(text, FONT.label) + 12;
        return (
          <g key={c.key} className="ov">
            <path d={c.d} markerEnd="url(#mm-hl)" />
            <g transform={`translate(${c.mid.x - w / 2},${c.mid.y - 8})`}>
              <rect width={w} height={16} rx={2} />
              <text x={w / 2} y={11.5} textAnchor="middle">{text}</text>
            </g>
          </g>
        );
      })}
    </>
  );
}
