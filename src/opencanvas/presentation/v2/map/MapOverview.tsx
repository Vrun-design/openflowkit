import { useMemo } from 'react';
import { insights } from '../../../../dsl/map/insights';
import type { MapModel } from '../../../../dsl/map/types';
import type { ArchModel } from '../../../../dsl/model/types';
import { synthetic } from '../../../application/map/mapFind';

export interface MapOverviewData {
  readonly model: MapModel;
  readonly arch: ArchModel | null;
  /** Select the box an insight names (a map node id). */
  readonly onSelect: (id: string) => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What to look at first when nothing is selected: size, a few insights that each select their box, and the model's flows. */
export function MapOverview({ model, arch, onSelect }: MapOverviewData): React.JSX.Element | null {
  const boxes = Object.keys(model.nodes).length - (model.nodes[model.root] ? 1 : 0);
  const rows = useMemo((): { id: string; text: string; note?: string }[] => {
    const { twoWay, largest, unreferenced } = insights(model);
    const name = (id: string) => model.nodes[id]?.name ?? id;
    // Engine-made folds are no box anyone can name or reveal.
    const real = (row: { id: string }) => !synthetic(model.nodes[row.id]);
    return [
      ...twoWay.slice(0, 2).map((p) => ({ id: p.a, text: `${name(p.a)} and ${name(p.b)} import each other` })),
      ...largest.slice(0, 2).map((id) => ({ id, text: `${name(id)} is among the largest`, note: `${model.nodes[id].loc.toLocaleString('en-US')} lines` })),
      ...unreferenced.slice(0, 1).map((id) => ({ id, text: `${name(id)} is not imported by anything here` })),
    ].filter(real);
  }, [model]);
  if (boxes <= 0) return null;
  const flows = arch?.flows ?? [];
  return (
    <div className="ofk-v2-model-detail" aria-label="Map overview">
      <strong>{boxes === 1 ? '1 box' : `${boxes} boxes`} · {plural(model.links.length, 'connection')}</strong>
      {rows.length > 0 ? <ul className="ofk-v2-model-list" aria-label="Worth a look">
        {rows.map((r) => <li key={`${r.id}:${r.text}`}>
          <button type="button" className="ofk-v2-model-relation-link" onClick={() => onSelect(r.id)}>{r.text}</button>
          {r.note ? <span className="ofk-v2-model-hint">{r.note}</span> : null}
        </li>)}
      </ul> : null}
      {flows.length > 0 ? <ul className="ofk-v2-model-list" aria-label="Flows in this map">
        {flows.map((f) => <li key={f.id}><span>{f.name}</span> <span className="ofk-v2-model-hint">{plural(f.steps.length, 'step')}</span></li>)}
      </ul> : null}
    </div>
  );
}
