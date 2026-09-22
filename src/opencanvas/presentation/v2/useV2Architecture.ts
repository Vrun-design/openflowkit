import { useMemo } from 'react';
import {
  archFrameOf, archModelOfDocument, archModelOfPage, archViewIdOfPage, childViewOf, createArchIndex,
  elementAncestors, type ArchIndex,
} from '../../../dsl/model/model';
import type { ArchModel, ArchView } from '../../../dsl/model/types';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';

/** One step of the drill-down chain: a page, a view and the element it shows. */
export interface ArchitectureCrumb {
  readonly viewId: string;
  readonly pageId: string;
  readonly label: string;
  readonly elementId?: string;
}

export interface V2Architecture {
  readonly model: ArchModel | null;
  readonly index: ArchIndex | null;
  readonly view: ArchView | null;
  readonly frameId: string | null;
  /** Landscape (when present) → each ancestor element's view → the current view. */
  readonly breadcrumb: readonly ArchitectureCrumb[];
  /** One level up, when the breadcrumb has a parent. */
  readonly parent: ArchitectureCrumb | null;
  readonly childViewOf: (elementId: string) => ArchView | null;
  readonly pageForView: (viewId: string) => ScenePage | undefined;
  /** The page whose view is the canonical child view of an element. */
  readonly pageForElement: (elementId: string) => ScenePage | undefined;
}

function viewForElement(model: ArchModel, index: ArchIndex, elementId: string): ArchView | null {
  return childViewOf(index, elementId) ?? null;
}

/**
 * The model layer's view of the current page: which element tree we are inside,
 * how to climb out, and how to drill in. Pure derivation — no state.
 */
export function useV2Architecture(document: SceneDocumentV1 | null, page: ScenePage | null): V2Architecture {
  return useMemo(() => {
    const model = page ? archModelOfPage(page) : archModelOfDocument(document);
    const index = model ? createArchIndex(model) : null;
    const viewId = page ? archViewIdOfPage(page) : null;
    const view = model && viewId ? model.views.find((candidate) => candidate.id === viewId) ?? null : null;
    const pageForView = (wanted: string) =>
      document?.pages.find((candidate) => archViewIdOfPage(candidate) === wanted);
    const pageForElement = (elementId: string) => {
      if (!model || !index) return undefined;
      const child = viewForElement(model, index, elementId);
      if (child) return pageForView(child.id);
      const direct = model.views.find((candidate) => candidate.of === elementId);
      return direct ? pageForView(direct.id) : undefined;
    };

    const crumbs: ArchitectureCrumb[] = [];
    if (model && view && index) {
      const landscape = pageForView('view:landscape');
      if (landscape && view.id !== 'view:landscape') {
        crumbs.push({ viewId: 'view:landscape', pageId: landscape.id, label: model.name ?? 'System landscape' });
      }
      const chain = view.of ? [...elementAncestors(index, view.of)].reverse() : [];
      for (const ancestorId of chain) {
        const ancestor = index.byId.get(ancestorId);
        const ancestorView = viewForElement(model, index, ancestorId);
        const ancestorPage = ancestorView ? pageForView(ancestorView.id) : undefined;
        if (!ancestor || !ancestorView || !ancestorPage) continue;
        crumbs.push({ viewId: ancestorView.id, pageId: ancestorPage.id, label: ancestor.name, elementId: ancestorId });
      }
      if (page) crumbs.push({ viewId: view.id, pageId: page.id, label: view.name });
    }

    return {
      model,
      index,
      view,
      frameId: page ? archFrameOf(page)?.id ?? null : null,
      breadcrumb: crumbs,
      parent: crumbs.length > 1 ? crumbs[crumbs.length - 2]! : null,
      childViewOf: (elementId: string) => (model && index ? viewForElement(model, index, elementId) : null),
      pageForView,
      pageForElement,
    };
  }, [document, page]);
}
