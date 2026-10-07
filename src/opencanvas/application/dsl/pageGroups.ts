import { archFrameOf, archModelOfPage, archViewIdOfPage } from '../../../dsl/model/model';
import { dslFrameMeta } from '../../../dsl/sceneMeta';
import type { ScenePage } from '../../domain/document/types';

/** A row of the page list: an ordinary page, or a header over the view pages of one C4 model. */
export type PageListEntry =
  | { readonly kind: 'group'; readonly id: string; readonly name: string }
  | { readonly kind: 'page'; readonly page: ScenePage; readonly depth: number };

// Each C4 level zooms into the one above it; deployment and custom views hang off the model.
const LEVEL: Record<string, number> = { landscape: 0, context: 1, container: 2, component: 3 };

interface Group { readonly ids: ReadonlySet<string>; readonly name: string; readonly pages: { page: ScenePage; level: number }[] }

/**
 * The page list with every C4 model's view pages together under the model's name, indented by
 * level. Document order decides everything else: a model sits where its first page is, and a
 * model with a single view page is just a page.
 */
// ponytail: element-overlap identity, like workspaceFrames — two models sharing an element id would group
export function pageListEntries(pages: readonly ScenePage[]): readonly PageListEntry[] {
  const groups: Group[] = [];
  const slots: (ScenePage | Group)[] = [];
  for (const page of pages) {
    const model = archModelOfPage(page);
    const viewId = archViewIdOfPage(page);
    if (!model || !viewId) { slots.push(page); continue; }
    const ids = new Set(model.elements.map((element) => element.id));
    let group = groups.find((candidate) => [...ids].some((id) => candidate.ids.has(id)));
    if (!group) {
      const system = model.elements.find((element) => !element.parent && element.kind === 'system');
      const title = dslFrameMeta(archFrameOf(page)!).title;
      group = { ids, name: model.name ?? title ?? system?.name ?? 'Architecture model', pages: [] };
      groups.push(group);
      slots.push(group);
    }
    group.pages.push({ page, level: LEVEL[viewId.split(':')[1] ?? ''] ?? 1 });
  }
  return slots.flatMap((slot): PageListEntry[] => {
    if (!('pages' in slot)) return [{ kind: 'page', page: slot, depth: 0 }];
    const top = Math.min(...slot.pages.map(({ level }) => level));
    const rows = slot.pages.map(({ page, level }): PageListEntry => ({ kind: 'page', page, depth: slot.pages.length > 1 ? level - top : 0 }));
    return slot.pages.length > 1 ? [{ kind: 'group', id: `group:${slot.pages[0]!.page.id}`, name: slot.name }, ...rows] : rows;
  });
}
