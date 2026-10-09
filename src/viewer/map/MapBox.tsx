import { memo, type CSSProperties, type KeyboardEvent } from 'react';
import type { LaidRect } from '../../dsl/map/elk';
import type { MapNode } from '../../dsl/map/types';
import { FONT, fit, measure, wrap } from '../../opencanvas/presentation/v2/map/layout';

const fmt = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
const lines = (n: MapNode): string => (n.loc > 0 ? `${fmt(n.loc)} lines` : '');

function meta(n: MapNode): string {
  if (n.kind === 'external') return 'outside service';
  if (n.kind === 'file') return lines(n);
  if (n.kind === 'more') return `${n.files} files`;
  return [`${n.files} file${n.files === 1 ? '' : 's'}`, lines(n)].filter(Boolean).join(' · ');
}

export interface MapBoxProps {
  node: MapNode;
  rect: LaidRect;
  /** Container the user can open (children) and whether it is open. */
  canOpen: boolean;
  open: boolean;
  selected: boolean;
  /** Not the selection's neighbourhood: drawn fainter (never the only cue). */
  dim: boolean;
  /** Fixed-list hue of the part this box lives in; null for plain paper. */
  hue: string | null;
  depth: number;
  leaving: boolean;
  /** `viaPointer` is true for a mouse/touch click, which a drag must be able to cancel; a key press never is. */
  onActivate: (id: string, viaPointer?: boolean) => void;
}

/** One box. Geometry props are only the first paint: the motion loop owns transform, size and right/bottom anchors. */
export const MapBox = memo(function MapBox({ node, rect, canOpen, open, selected, dim, hue, depth, leaving, onActivate }: MapBoxProps): React.JSX.Element {
  const { width: w, height: h } = rect;
  const container = open && canOpen;
  const tinted = hue !== null && node.kind !== 'file' && node.kind !== 'more' && node.kind !== 'external';
  const style = { ...(tinted ? { '--hue': hue } : {}), '--depth': depth } as CSSProperties;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(node.id); } };
  const mono = node.kind === 'file' || node.kind === 'more';
  const eyebrow = fit(node.name.toUpperCase(), FONT.eyebrow, Math.max(40, w - 90));
  const eyebrowW = measure(eyebrow, FONT.eyebrow) + eyebrow.length * 1.4 + 12;
  return (
    <g data-box="" data-id={node.id} transform={`translate(${rect.x},${rect.y})`} style={style} tabIndex={leaving ? -1 : 0} role="button" pointerEvents={leaving ? 'none' : undefined}
      className={`mb ${node.kind}${container ? ' open' : ''}${selected ? ' sel' : ''}${dim ? ' dim' : ''}${tinted ? ' tint' : ''}`} aria-label={`${node.name}${canOpen ? (open ? ', open' : ', closed') : ''}`}
      aria-expanded={canOpen ? open : undefined} onClick={(e) => { e.stopPropagation(); onActivate(node.id, true); }} onKeyDown={onKey}>
      <rect className="box" width={w} height={h} rx={container ? 8 : 6} strokeDasharray={node.kind === 'external' ? '5 3' : node.kind === 'more' ? '4 3' : undefined} />
      {container ? (
        <>
          <rect className="mask" x={12} y={-7} width={eyebrowW} height={14} rx={2} />
          <text className="eyebrow" x={18} y={3.5}>{eyebrow}</text>
          {node.desc ? <text className="desc" x={16} y={30}>{fit(node.desc, FONT.desc, w - 160)}</text> : null}
          <text className="meta" data-right={16} x={w - 16} y={30} textAnchor="end">{meta(node)}</text>
        </>
      ) : mono ? (
        <>
          <text className="mono" x={12} y={19}>{fit(node.name, FONT.mono, w - 40)}</text>
          <text className="meta" x={12} y={35}>{node.kind === 'more' ? 'open to list them' : meta(node)}</text>
        </>
      ) : (
        <>
          <text className="name" x={12} y={22}>{fit(node.name, FONT.name, w - 40)}</text>
          {(node.desc ? wrap(node.desc, FONT.desc, w - 24, 2) : []).map((line, i) => <text key={i} className="desc" x={12} y={40 + i * 14}>{line}</text>)}
          <text className="meta" data-bottom={10} x={12} y={h - 10}>{meta(node)}</text>
        </>
      )}
      {canOpen ? <text className="chev" data-right={14} x={w - 14} y={container ? 17 : 19} textAnchor="middle">{open ? '−' : '+'}</text> : null}
    </g>
  );
});
