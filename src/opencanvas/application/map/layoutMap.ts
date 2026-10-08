import { fromElkLayout, toElkGraph, type ElkNode, type Laid } from '../../../dsl/map/elk';
import { budgetEdges } from '../../../dsl/map/edgeBudget';
import { aggregate } from '../../../dsl/map/view';
import type { AggEdge, LinkKind, MapModel, MapNode } from '../../../dsl/map/types';

// The ELK layout of one set of open boxes. The engine, the text measuring and the box sizes come in as parameters:
// the app passes the shared worker and canvas measuring, tests and Node pass elkjs and a formula.

export interface LayoutPorts {
  elk: { layout(graph: ElkNode): Promise<ElkNode> };
  /** Width in px of an arrow label. */
  measure: (text: string) => number;
  sizeOf: (node: MapNode) => { width: number; height: number };
}

/** `edges` are the arrows laid out and drawn; `total` counts every arrow and `minor` those past their container's budget. */
export interface Scene { laid: Laid; edges: AggEdge[]; total: number; minor: number }

export async function layoutMap(ports: LayoutPorts, model: MapModel, expanded: ReadonlySet<string>, layers?: readonly LinkKind[], showAll = false): Promise<Scene> {
  const all = budgetEdges(model, aggregate(model, expanded, layers).edges);
  const edges = showAll ? all : all.filter((e) => !e.minor);
  const out = await ports.elk.layout(toElkGraph(model, expanded, edges, ports.sizeOf, ports.measure));
  return { laid: fromElkLayout(out), edges, total: all.length, minor: all.filter((e) => e.minor).length };
}
