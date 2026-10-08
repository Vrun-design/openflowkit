import type { AggEdge, LinkKind, MapModel, Talk } from '../../../../dsl/map/types';
import { edgeText } from '../../../../dsl/map/view';

export type Selected = { type: 'node'; id: string } | { type: 'edge'; key: string };

/** Minimal readout of the selection (the evidence panel is slice b2). Text only, rendered by React. */
export function MapSelection({ model, selected, edge, talks, note, layers }: {
  model: MapModel; selected: Selected | null; edge: AggEdge | undefined; talks: readonly Talk[]; note: string | null; layers: readonly LinkKind[];
}): React.JSX.Element {
  const node = selected?.type === 'node' ? model.nodes[selected.id] : undefined;
  return (
    <div className="map-readout" data-testid="map-selection">
      <div className="map-readout-stats">{model.stats.files} files · {model.stats.loc} lines · {model.stats.imports} imports</div>
      {node ? <div>{node.name}: {node.files} files · {node.loc} lines · talks to {talks.length}</div> : null}
      {edge ? <div data-testid="map-edge-evidence">{model.nodes[edge.from]?.name} → {model.nodes[edge.to]?.name} · {edge.kind} {edgeText(edge)} · {edge.evidence.length + edge.reverseEvidence.length} evidence lines{edge.evidence[0] ? ` · ${edge.evidence[0].file}:${edge.evidence[0].line}` : ''}</div> : null}
      {note ? <div className="map-note" role="status">{note}</div> : null}
      <div className="map-legend">{layers.map((k) => <span key={k} className={`k-${k}`}>{k}</span>)}</div>
    </div>
  );
}
