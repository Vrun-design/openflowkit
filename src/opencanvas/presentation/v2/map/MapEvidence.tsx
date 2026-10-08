import type { AggEdge, Evidence, MapModel } from '../../../../dsl/map/types';
import { edgeText } from '../../../../dsl/map/view';

type LinkFor = (e: { file: string; line: number }) => string;

/** One direction's evidence, grouped by file; every line links to GitHub. `total` is the exact count; evidence is capped by the engine. */
function Direction({ title, evidence, total, link }: { title: string; evidence: readonly Evidence[]; total: number; link: LinkFor }): React.JSX.Element {
  const byFile = new Map<string, Evidence[]>();
  for (const e of evidence) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
  const more = total - evidence.length;
  return (
    <section className="map-sec">
      <h3>{title}</h3>
      {[...byFile].map(([file, lines]) => (
        <div key={file} className="map-file">
          <div className="map-path">{file}</div>
          {lines.map((e, i) => (
            <div key={i} className="map-line">
              <a href={link(e)} target="_blank" rel="noreferrer noopener">{`:${e.line}`}</a>
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
export function MapEvidence({ model, edge, link }: { model: MapModel; edge: AggEdge; link: LinkFor }): React.JSX.Element {
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
