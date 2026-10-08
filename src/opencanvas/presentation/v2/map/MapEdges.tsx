import { memo, useMemo } from 'react';
import type { LaidEdge, LaidRect } from '../../../../dsl/map/elk';
import type { AggEdge, LinkKind, Talk } from '../../../../dsl/map/types';
import { edgeText } from '../../../../dsl/map/view';
import { curve, roundedPath } from './geometry';
import { FONT, measure } from './layout';

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
}

/** Arrow lines (rounded orthogonal ELK routes) and, in a later layer, their masked count labels. */
export const MapEdgeLines = memo(function MapEdgeLines({ laid, byKey, selected, onSelect }: EdgesProps): React.JSX.Element {
  return (
    <>
      {laid.map((l) => {
        const e = byKey.get(l.key);
        if (!e || l.points.length < 2) return null;
        const d = roundedPath(l.points);
        return (
          <g key={l.key} className={`edge k-${e.kind}${selected === l.key ? ' sel' : ''}${e.inferred ? ' inferred' : ''}`} data-edge={l.key} onClick={(ev) => { ev.stopPropagation(); onSelect(l.key); }}>
            <path className="line" d={d} strokeWidth={strokeOf(e)} markerEnd={`url(#mm-${e.kind})`} markerStart={e.both ? `url(#mm-${e.kind})` : undefined} />
            <path className="hit" d={d} />
          </g>
        );
      })}
    </>
  );
});

export const MapEdgeLabels = memo(function MapEdgeLabels({ laid, byKey, selected, onSelect }: EdgesProps): React.JSX.Element {
  return (
    <>
      {laid.map((l) => {
        const e = byKey.get(l.key);
        if (!e || !l.label || l.points.length < 2) return null;
        const text = edgeText(e);
        const w = l.label.width;
        return (
          <g key={l.key} className={`lbl${selected === l.key ? ' sel' : ''}`} transform={`translate(${l.label.x ?? 0},${l.label.y ?? 0})`} onClick={(ev) => { ev.stopPropagation(); onSelect(l.key); }}>
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
