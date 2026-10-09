import type { AggEdge, Evidence, MapModel } from '../../dsl/map/types';
import { edgeText } from '../../dsl/map/view';
import { groupByFile, type EvidenceLink } from '../../opencanvas/application/map/evidenceLink';

export type { EvidenceLink };

/** One direction's evidence, grouped by file; every line links to GitHub. `total` is the exact count; evidence is capped by the engine. */
function Direction({ title, evidence, total, link }: { title: string; evidence: readonly Evidence[]; total: number; link: EvidenceLink }): React.JSX.Element {
  const more = total - evidence.length;
  return (
    <section className="map-sec">
      <h3>{title}</h3>
      {groupByFile(evidence).map(([file, lines]) => (
        <div key={file} className="map-file">
          <div className="map-path">{file}</div>
          {lines.map((e, i) => (
            <div key={i} className="map-line">
              {(() => { const href = link(e.file, e.line); return href ? <a href={href} target="_blank" rel="noreferrer noopener">{`:${e.line}`}</a> : <span className="map-lineno">{`:${e.line}`}</span>; })()}
              <code>{e.text}</code>
            </div>
          ))}
        </div>
      ))}
      {more > 0 ? <p className="map-muted">{`${more} more`}</p> : null}
    </section>
  );
}

/** Arrow details: both directions with their exact lines. */
export function MapEvidence({ model, edge, link }: { model: MapModel; edge: AggEdge; link: EvidenceLink }): React.JSX.Element {
  const a = model.nodes[edge.from]?.name ?? edge.from;
  const b = model.nodes[edge.to]?.name ?? edge.to;
  return (
    <>
      <p className="map-lead">{`${a} → ${b}`}</p>
      <p className="map-muted">{`${edge.kind} · ${edgeText(edge)}${edge.inferred ? ' · inferred' : ''}`}</p>
      <Direction title={`${a} → ${b} · ${edge.forward}`} evidence={edge.evidence} total={edge.forward} link={link} />
      {edge.reverse > 0 ? <Direction title={`${b} → ${a} · ${edge.reverse}`} evidence={edge.reverseEvidence} total={edge.reverse} link={link} /> : null}
    </>
  );
}
