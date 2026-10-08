import { describe, expect, it } from 'vitest';
import { budgetEdges, edgeCap } from './edgeBudget';
import type { AggEdge, MapModel } from './types';

const edge = (from: string, to: string, count = 1, parent = 'root'): AggEdge => ({
  key: `${from}>${to}:import`, kind: 'import', parent, from, to, count, forward: count, reverse: 0, both: false, evidence: [], reverseEvidence: [], links: [], inferred: false,
});
const model = (siblings: number): MapModel => ({
  root: 'root', source: {}, stats: { files: 0, loc: 0, imports: 0, unresolved: 0 }, links: [],
  nodes: { root: { id: 'root', kind: 'part', name: 'root', parent: null, children: Array.from({ length: siblings }, (_, i) => `n${i}`), files: 0, loc: 0 } },
});
const minors = (edges: readonly AggEdge[]) => edges.filter((e) => e.minor).map((e) => e.key).sort();

describe('budgetEdges', () => {
  it('keeps everything while a container is within its budget', () => {
    const edges = [edge('A', 'B'), edge('B', 'C'), edge('A', 'C', 9)];
    expect(minors(budgetEdges(model(3), edges))).toEqual([]);
  });

  it('computes the cap as max(6, ceil(1.5 x siblings))', () => {
    expect([edgeCap(2), edgeCap(4), edgeCap(5), edgeCap(10), edgeCap(11)]).toEqual([6, 6, 8, 15, 17]);
  });

  it('drops the implied arrow first: A -> C goes before the chain A -> B -> C, however strong', () => {
    // Over a cap of 6: a chain of 6 + the shortcut A -> C (heaviest).
    const chain = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, -1).map((n, i) => edge(n, ['B', 'C', 'D', 'E', 'F', 'G'][i]!, 1));
    const shortcut = edge('A', 'C', 50);
    const out = budgetEdges(model(3), [...chain, shortcut]);
    expect(chain).toHaveLength(6);
    expect(minors(out)).toEqual([shortcut.key]);
  });

  it('then keeps the strongest of the rest, ties by key', () => {
    const star = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((to, i) => edge('a', to, i < 2 ? 5 : 1));
    // a -> x are all in the reduction (no alternate paths); 8 edges, cap 6: the two weakest by key lose.
    const out = budgetEdges(model(3), star);
    expect(minors(out)).toEqual(['a>h:import', 'a>i:import']);
  });

  it('budgets each container on its own and is deterministic', () => {
    const many = (parent: string) => Array.from({ length: 9 }, (_, i) => edge(`${parent}${i}`, `${parent}x`, 1, parent));
    const m = { ...model(3), nodes: { ...model(3).nodes, p: { ...model(3).nodes.root, id: 'p', parent: 'root', children: ['p0', 'px'] }, q: { ...model(3).nodes.root, id: 'q', parent: 'root', children: ['q0'] } } };
    const edges = [...many('p'), edge('q0', 'q1', 1, 'q')];
    const first = budgetEdges(m, edges);
    expect(minors(first).length).toBe(3);
    expect(first.find((e) => e.parent === 'q')?.minor).toBeUndefined();
    expect(minors(budgetEdges(m, [...edges].reverse()))).toEqual(minors(first));
  });
});
