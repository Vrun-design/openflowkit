import { synthetic } from '../../../application/map/mapFind';
import type { MapModel } from '../../../../dsl/map/types';

/**
 * The document bar's path in Map: the selected box's ancestors, then the box (root excluded). Empty for nothing selected
 * and for engine-made boxes. Fold boxes between a folded element and its owner are skipped: they are no element.
 */
export function mapPathOf(model: MapModel, id: string | null): { id: string; label: string }[] {
  const start = id ? model.nodes[id] : undefined;
  if (!start || start.id === model.root || synthetic(start)) return [];
  const path: { id: string; label: string }[] = [];
  for (let at: string | null = start.id; at !== null && at !== model.root; at = model.nodes[at].parent) {
    if (!synthetic(model.nodes[at])) path.unshift({ id: at, label: model.nodes[at].name });
  }
  return path;
}
