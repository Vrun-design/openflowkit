import type { AggEdge, Evidence, LinkKind } from '../../../../dsl/map/types';
import type { EvidenceLink } from '../../../application/map/evidenceLink';

/** A clicked arrow on a repo map: its aggregated edge, a GitHub link builder (null links = plain text), and box names. */
export interface MapRepoArrow {
  readonly edge: AggEdge;
  readonly link: EvidenceLink;
  readonly name: (id: string) => string;
}

const VERB: Readonly<Record<LinkKind, string>> = { import: 'imports', call: 'calls', data: 'shares data with', build: 'builds' };
const CAP = 50;

function Direction({ from, to, kind, total, evidence, link }: {
  from: string; to: string; kind: LinkKind; total: number; evidence: readonly Evidence[]; link: EvidenceLink;
}): React.JSX.Element {
  const shown = evidence.slice(0, CAP);
  return (
    <section>
      <p className="ofk-v2-model-hint">{from} {VERB[kind]} {to} · {total}</p>
      <ul className="ofk-v2-model-list" aria-label={`Evidence: ${from} to ${to}`}>
        {shown.map((e, i) => {
          const href = link(e.file, e.line);
          const where = `${e.file}:${e.line}`;
          return <li key={i} className="ofk-v2-map-ev">
            {href ? <a className="ofk-v2-map-link" href={href} target="_blank" rel="noopener noreferrer">{where}</a> : <span>{where}</span>}
            {/* Repo text is untrusted: React text only. */}
            <code className="ofk-v2-map-src">{e.text}</code>
          </li>;
        })}
      </ul>
      {total > shown.length ? <p className="ofk-v2-model-hint">and {total - shown.length} more</p> : null}
    </section>
  );
}

/** Why a repo-map arrow exists: every `file:line`, per direction, linked to the commit it was read from. */
export function MapArrowEvidence({ arrow: { edge, link, name } }: { readonly arrow: MapRepoArrow }): React.JSX.Element {
  const a = name(edge.from);
  const b = name(edge.to);
  return (
    <div className="ofk-v2-model-detail">
      <strong>{a} {edge.both ? '⇄' : '→'} {b}</strong>
      <Direction from={a} to={b} kind={edge.kind} total={edge.forward} evidence={edge.evidence} link={link} />
      {edge.reverse > 0 ? <Direction from={b} to={a} kind={edge.kind} total={edge.reverse} evidence={edge.reverseEvidence} link={link} /> : null}
    </div>
  );
}
