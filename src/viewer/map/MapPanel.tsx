import type { Insights } from '../../dsl/map/insights';
import type { AggEdge, MapModel, Talk } from '../../dsl/map/types';
import { Button, Panel } from '../../opencanvas/presentation/design-system';
import { MapEvidence, type EvidenceLink } from './MapEvidence';
import { labelsFor, type Selected } from '../../opencanvas/application/map/navigate';

const fmt = (n: number): string => n.toLocaleString('en-US');

interface Props {
  model: MapModel;
  selected: Selected | null;
  edge: AggEdge | undefined;
  talks: readonly Talk[];
  insights: Insights;
  evidenceLink: EvidenceLink;
  onReveal: (id: string) => void;
  onClose: () => void;
}

function Item({ model, id, onReveal, note, label }: { model: MapModel; id: string; onReveal: (id: string) => void; note?: string; label?: string }): React.JSX.Element {
  return (
    <li>
      <Button variant="quiet" className="map-item" onClick={() => onReveal(id)}>
        <span className="map-item-name">{label ?? model.nodes[id]?.name ?? id}</span>
        {note ? <span className="map-muted">{note}</span> : null}
      </Button>
    </li>
  );
}

function Overview({ model, insights, onReveal }: Pick<Props, 'model' | 'insights' | 'onReveal'>): React.JSX.Element {
  const { twoWay, largest, unreferenced } = insights;
  const labels = labelsFor(model, [...twoWay.flatMap((p) => [p.a, p.b]), ...largest, ...unreferenced.slice(0, 8)]);
  const name = (id: string) => labels.get(id) ?? model.nodes[id]?.name ?? id;
  return (
    <>
      <p className="map-lead">{model.source.repo ?? 'Repository'}</p>
      <p className="map-muted">{`${model.source.ref ?? ''} · ${fmt(model.stats.files)} files · ${fmt(model.stats.loc)} lines · ${fmt(model.stats.imports)} imports`}</p>
      {twoWay.length > 0 ? (
        <section className="map-sec"><h3>Import each other</h3>
          <ul>{twoWay.map((p) => <Item key={`${p.a}|${p.b}`} model={model} id={p.a} label={name(p.a)} onReveal={onReveal} note={`${name(p.a)} ⇄ ${name(p.b)} · ${p.ab} ⇄ ${p.ba}`} />)}</ul>
        </section>
      ) : null}
      <section className="map-sec"><h3>Largest files</h3>
        <ul>{largest.map((id) => <Item key={id} model={model} id={id} label={name(id)} onReveal={onReveal} note={`${fmt(model.nodes[id]?.loc ?? 0)} lines`} />)}</ul>
      </section>
      {unreferenced.length > 0 ? (
        <section className="map-sec"><h3>Not imported inside this repo</h3>
          <p className="map-hint">Often entry points or public API.</p>
          <ul>{unreferenced.slice(0, 8).map((id) => <Item key={id} model={model} id={id} label={name(id)} onReveal={onReveal} />)}</ul>
          {unreferenced.length > 8 ? <p className="map-muted">{`${unreferenced.length - 8} more`}</p> : null}
        </section>
      ) : null}
    </>
  );
}

function NodeDetail({ model, id, talks, onReveal }: { model: MapModel; id: string; talks: readonly Talk[]; onReveal: (id: string) => void }): React.JSX.Element {
  const n = model.nodes[id]!;
  return (
    <>
      <p className="map-lead">{n.name}</p>
      <p className="map-muted">{`${n.kind} · ${fmt(n.files)} ${n.files === 1 ? 'file' : 'files'} · ${fmt(n.loc)} lines`}</p>
      {n.path ? <p className="map-path">{n.path}</p> : null}
      {n.desc ? <p>{n.desc}</p> : null}
      <section className="map-sec"><h3>Talks to</h3>
        {talks.length === 0 ? <p className="map-muted">No links to other boxes.</p> : (
          <ul>{talks.slice(0, 14).map((t) => <Item key={t.id} model={model} id={t.id} onReveal={onReveal} note={[t.out ? `out ${t.out}` : '', t.in ? `in ${t.in}` : ''].filter(Boolean).join(' · ')} />)}</ul>
        )}
      </section>
      {n.children.length > 0 ? (
        <section className="map-sec"><h3>Inside</h3>
          <ul>{n.children.map((c) => <Item key={c} model={model} id={c} onReveal={onReveal} note={model.nodes[c].kind === 'file' ? `${fmt(model.nodes[c].loc)} lines` : undefined} />)}</ul>
        </section>
      ) : null}
    </>
  );
}

/** The right-hand panel: overview, one box, or one arrow. No flow view yet: nothing produces flows without AI (P6). */
export function MapPanel({ model, selected, edge, talks, insights, evidenceLink, onReveal, onClose }: Props): React.JSX.Element {
  const node = selected?.type === 'node' ? model.nodes[selected.id] : undefined;
  const title = node ? node.name : edge ? 'Arrow' : 'Overview';
  return (
    <Panel title={title} onClose={onClose} closeLabel="Close details" className="map-panel">
      {node ? <NodeDetail model={model} id={node.id} talks={talks} onReveal={onReveal} />
        : edge ? <MapEvidence model={model} edge={edge} link={evidenceLink} />
          : <Overview model={model} insights={insights} onReveal={onReveal} />}
    </Panel>
  );
}
