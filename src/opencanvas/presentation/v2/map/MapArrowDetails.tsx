import { useMemo } from 'react';
import type { ArchModel, ArchRelation } from '../../../../dsl/model/types';

export interface MapArrow {
  readonly from: string;
  readonly to: string;
  readonly relationIds: readonly string[];
  /** The arrow goes both ways (the scene's `metadata.map.both`): rolled-up arrows hide that from their relations' own ends. */
  readonly both?: boolean;
}

interface MapArrowDetailsProps {
  readonly model: ArchModel;
  readonly arrow: MapArrow;
  readonly onSelectElement: (elementId: string) => void;
}

/** Why a Map arrow exists: every relation it aggregates, in the order given. Markup mirrors the panel's Relationships list. */
export function MapArrowDetails({ model, arrow, onSelectElement }: MapArrowDetailsProps): React.JSX.Element {
  const names = useMemo(() => new Map(model.elements.map((element) => [element.id, element.name])), [model]);
  const relations = useMemo(() => {
    const byId = new Map(model.relations.map((relation) => [relation.id, relation]));
    return arrow.relationIds.flatMap((id) => byId.get(id) ?? []);
  }, [model, arrow.relationIds]);
  const nameOf = (id: string) => names.get(id) ?? id;
  const link = (id: string) => (
    <button type="button" className="ofk-v2-model-relation-link" aria-label={`Inspect ${nameOf(id)}`}
      onClick={() => onSelectElement(id)}>{nameOf(id)}</button>
  );
  const note = (relation: ArchRelation) => `${relation.label ?? 'Unlabelled relationship'}${relation.tech ? ` · ${relation.tech}` : ''}`;

  return (
    <div className="ofk-v2-model-detail">
      <strong>{nameOf(arrow.from)} {arrow.both ? '⇄' : '→'} {nameOf(arrow.to)}</strong>
      {relations.length === 0
        ? <p role="status" className="ofk-v2-model-hint">No relations found for this arrow.</p>
        : <>
          <p className="ofk-v2-model-hint">{relations.length === 1 ? '1 relation' : `${relations.length} relations`}</p>
          <ul className="ofk-v2-model-list ofk-v2-model-relationships" aria-label={`Relations behind ${nameOf(arrow.from)} to ${nameOf(arrow.to)}`}>
            {relations.map((relation) => <li key={relation.id}>
              <span>{link(relation.from)} → {link(relation.to)}</span>
              <span className="ofk-v2-model-hint">{note(relation)}</span>
            </li>)}
          </ul>
        </>}
    </div>
  );
}
