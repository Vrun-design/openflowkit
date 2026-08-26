/**
 * Legacy round-trip corpus (CS-101).
 *
 * Horizon 1's exit gate requires that current documents round-trip through the
 * canonical model without visible or semantic loss. The existing projection
 * tests use hand-built cases; this drives every shipped starter template and
 * every benchmark fixture through React Flow -> canonical -> React Flow and
 * asserts the renderer graph survives.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { STARTER_TEMPLATE_MANIFESTS } from '@/services/templateLibrary/starterTemplates';
import { projectReactFlowToSceneDocument } from './fromReactFlow';
import { projectSceneDocumentToReactFlow } from './toReactFlow';

interface CorpusEntry {
  readonly name: string;
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly diagramType: string;
}

function benchmarkEntry(name: string): CorpusEntry {
  const raw = JSON.parse(readFileSync(`benchmarks/fixtures/${name}.json`, 'utf8'));
  return { name: `fixture:${name}`, nodes: raw.nodes, edges: raw.edges, diagramType: 'flowchart' };
}

const CORPUS: CorpusEntry[] = [
  ...STARTER_TEMPLATE_MANIFESTS.map((manifest) => ({
    name: `template:${manifest.id}`,
    nodes: manifest.graph.nodes,
    edges: manifest.graph.edges,
    diagramType: manifest.category,
  })),
  benchmarkEntry('small-100'),
  benchmarkEntry('medium-300'),
  benchmarkEntry('large-1000'),
];

function roundTrip(entry: CorpusEntry) {
  const document = projectReactFlowToSceneDocument(
    { nodes: entry.nodes, edges: entry.edges },
    {
      documentId: 'corpus-document',
      pageId: 'corpus-page',
      name: entry.name,
      diagramType: entry.diagramType,
      now: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    }
  );
  return { document, projected: projectSceneDocumentToReactFlow(document) };
}

/** Renderer-owned transient state is deliberately dropped by the adapter. */
const TRANSIENT_NODE_KEYS = new Set(['selected', 'dragging', 'resizing', 'positionAbsolute']);

function comparableNode(node: FlowNode): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (TRANSIENT_NODE_KEYS.has(key)) continue;
    result[key] = value;
  }
  return result;
}

describe('legacy round-trip corpus', () => {
  it('covers every shipped starter template and benchmark fixture', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(4);
    expect(CORPUS.some((entry) => entry.name.startsWith('template:'))).toBe(true);
  });

  for (const entry of CORPUS) {
    describe(entry.name, () => {
      it('preserves every node identity, type, position, and size', () => {
        const { projected } = roundTrip(entry);

        expect(projected.nodes.map((node) => node.id)).toEqual(
          entry.nodes.map((node) => node.id)
        );

        const projectedById = new Map(projected.nodes.map((node) => [node.id, node]));
        for (const original of entry.nodes) {
          const result = projectedById.get(original.id);
          expect(result, `${original.id} survived the round trip`).toBeDefined();
          expect(result!.type).toBe(original.type);
          expect(result!.position.x).toBeCloseTo(original.position.x, 3);
          expect(result!.position.y).toBeCloseTo(original.position.y, 3);
          if (typeof original.width === 'number') {
            expect(result!.width).toBeCloseTo(original.width, 3);
          }
          if (typeof original.height === 'number') {
            expect(result!.height).toBeCloseTo(original.height, 3);
          }
          if (original.parentId !== undefined) {
            expect(result!.parentId).toBe(original.parentId);
          }
        }
      });

      it('preserves every edge identity, endpoint, and handle', () => {
        const { projected } = roundTrip(entry);

        expect(projected.edges.map((edge) => edge.id)).toEqual(
          entry.edges.map((edge) => edge.id)
        );

        const projectedById = new Map(projected.edges.map((edge) => [edge.id, edge]));
        for (const original of entry.edges) {
          const result = projectedById.get(original.id);
          expect(result, `${original.id} survived the round trip`).toBeDefined();
          expect(result!.source).toBe(original.source);
          expect(result!.target).toBe(original.target);
          expect(result!.sourceHandle ?? null).toBe(original.sourceHandle ?? null);
          expect(result!.targetHandle ?? null).toBe(original.targetHandle ?? null);
          if (original.type !== undefined) expect(result!.type).toBe(original.type);
        }
      });

      it('preserves node data payloads', () => {
        const { projected } = roundTrip(entry);
        const projectedById = new Map(projected.nodes.map((node) => [node.id, node]));

        for (const original of entry.nodes) {
          const result = projectedById.get(original.id)!;
          for (const [key, value] of Object.entries(original.data ?? {})) {
            expect(
              (result.data as Record<string, unknown>)?.[key],
              `${original.id}.data.${key} survived the round trip`
            ).toEqual(value);
          }
        }
      });

      it('is idempotent across a second round trip', () => {
        const first = roundTrip(entry);
        const second = roundTrip({
          ...entry,
          nodes: first.projected.nodes,
          edges: first.projected.edges,
        });

        expect(second.projected.nodes.map(comparableNode)).toEqual(
          first.projected.nodes.map(comparableNode)
        );
        expect(second.projected.edges).toEqual(first.projected.edges);
      });
    });
  }
});
