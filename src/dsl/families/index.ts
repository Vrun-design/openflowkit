import type { DslFamily } from '../ast';
import { RESERVED_FAMILIES } from '../document';
import type { Family } from './types';
import { gitgraphFamily } from './gitgraph';
import { graphFamily } from './graph';
import { sequenceFamily } from './sequence';
import { stateFamily } from './state';
import { mindmapFamily } from './mindmap';
import { classFamily, erdFamily } from './structured';
import { architectureFamily } from './architecture';
import { chartFamily } from './chart';

/**
 * Family registry. Every family name in the grammar maps to exactly one
 * implementation; the reserved families deliberately share the graph engine
 * until 3.8 lands their own.
 */
const FAMILIES: Partial<Record<DslFamily, Family>> = {
  flowchart: graphFamily,
  architecture: architectureFamily,
  gitgraph: gitgraphFamily,
  sequence: sequenceFamily,
  state: stateFamily,
  erd: erdFamily,
  class: classFamily,
  mindmap: mindmapFamily,
  chart: chartFamily,
};

export function familyFor(name: DslFamily): Family {
  if ((RESERVED_FAMILIES as readonly string[]).includes(name)) return graphFamily;
  return FAMILIES[name] ?? graphFamily;
}
