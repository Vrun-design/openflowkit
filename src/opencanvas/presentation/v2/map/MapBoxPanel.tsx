import type { AggEdge, MapModel } from '../../../../dsl/map/types';

export interface MapBoxData {
  readonly model: MapModel;
  readonly id: string;
  /** The arrows drawn now that touch this box. */
  readonly edges: readonly AggEdge[];
  /** GitHub page for the box's path, or null (an outside service has none). */
  readonly pathLink: string | null;
  /** Select (and reveal) a box. */
  readonly onSelect: (id: string) => void;
  /** Select an arrow by its key. */
  readonly onSelectArrow: (key: string) => void;
}

const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;
const KIND = { part: 'Part', folder: 'Folder', file: 'File', group: 'Group', external: 'Outside service', more: 'More' } as const;

/** A selected repo box: what it is, where it lives on GitHub, what it talks to and what is inside. Repo text is React text only. */
export function MapBoxPanel({ model, id, edges, pathLink, onSelect, onSelectArrow }: MapBoxData): React.JSX.Element | null {
  const node = model.nodes[id];
  if (!node) return null;
  const size = node.kind === 'file' ? plural(node.loc, 'line') : node.files > 0 ? plural(node.files, 'file') : '';
  const name = (other: string) => model.nodes[other]?.name ?? other;
  return (
    <div className="ofk-v2-model-detail" aria-label="Selected box">
      <strong>{node.name}</strong>
      <p className="ofk-v2-model-hint">{KIND[node.kind]}{size ? ` · ${size}` : ''}</p>
      {node.path ? (pathLink ? <a href={pathLink} target="_blank" rel="noopener noreferrer">{node.path}</a> : <span>{node.path}</span>) : null}
      {node.desc ? <p className="ofk-v2-model-hint">{node.desc}</p> : null}
      {edges.length > 0 ? <ul className="ofk-v2-model-list" aria-label="Talks to">
        {edges.map((e) => {
          const out = e.from === id;
          return <li key={e.key}>
            <button type="button" className="ofk-v2-model-relation-link" onClick={() => onSelectArrow(e.key)}>{out ? '→' : '←'} {name(out ? e.to : e.from)}</button>
            <span className="ofk-v2-model-hint">{e.kind} · {e.count}</span>
          </li>;
        })}
      </ul> : null}
      {node.children.length > 0 ? <ul className="ofk-v2-model-list" aria-label="Inside">
        {node.children.slice(0, 40).map((child) => <li key={child}>
          <button type="button" className="ofk-v2-model-relation-link" onClick={() => onSelect(child)}>{name(child)}</button>
        </li>)}
        {node.children.length > 40 ? <li className="ofk-v2-model-hint">{`and ${node.children.length - 40} more`}</li> : null}
      </ul> : null}
    </div>
  );
}
