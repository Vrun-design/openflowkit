import type { ScenePage } from '../../domain/document/types';

export function shouldRedrawNodes(previousPage: ScenePage | null, nextPage: ScenePage): boolean {
  return previousPage === null
    || previousPage.nodes !== nextPage.nodes
    || previousPage.layers !== nextPage.layers;
}
