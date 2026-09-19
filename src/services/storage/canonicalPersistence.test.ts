import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import { STARTER_TEMPLATE_MANIFESTS } from '@/services/templateLibrary/starterTemplates';
import { createEmptyFlowHistory } from '@/store/historyState';
import { createFlowTabsFromCanonical, withCanonical } from './canonicalPersistence';
import { createPersistedDocumentFromFlowDocument, createFlowTabsFromPersistedDocuments } from './persistedDocumentAdapters';
import type { FlowDocument } from './flowDocumentModel';

const TRANSIENT = new Set(['selected', 'dragging', 'resizing', 'positionAbsolute', 'measured']);
const strip = <T extends object>(record: T) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !TRANSIENT.has(key)));

function fixture(name: string): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return JSON.parse(readFileSync(`benchmarks/fixtures/${name}.json`, 'utf8'));
}

const CORPUS = [
  ...STARTER_TEMPLATE_MANIFESTS.map((manifest) => ({ name: `template:${manifest.id}`, ...manifest.graph })),
  { name: 'fixture:small-100', ...fixture('small-100') },
  { name: 'fixture:medium-300', ...fixture('medium-300') },
];

function flowDocument(pages: { nodes: FlowNode[]; edges: FlowEdge[] }[]): FlowDocument {
  return {
    id: 'doc', name: 'Doc', createdAt: '2026-09-19T00:00:00.000Z', updatedAt: '2026-09-19T00:00:00.000Z',
    activePageId: 'p0',
    pages: pages.map((page, index) => ({
      id: `p${index}`, name: `Page ${index + 1}`, diagramType: 'flowchart',
      nodes: page.nodes, edges: page.edges, history: createEmptyFlowHistory(),
    })),
  } as FlowDocument;
}

// The legacy loader yields one tab per document (its active page); compare page content.
function comparable(tab: FlowTab) {
  return { nodes: tab.nodes.map((node) => strip(node)), edges: tab.edges.map((edge) => strip(edge)) };
}

describe('canonical persistence (A6 d1)', () => {
  it('attaches a validated canonical document to every save', () => {
    const persisted = withCanonical(createPersistedDocumentFromFlowDocument(flowDocument([CORPUS[0], CORPUS[1]])));
    expect(persisted.canonical?.pages.map(({ id }) => id)).toEqual(['p0', 'p1']);
    expect(persisted.pages).toHaveLength(2);
  });

  it('never blocks a save when the projection fails', () => {
    const broken = { ...createPersistedDocumentFromFlowDocument(flowDocument([CORPUS[0]])), pages: [], content: undefined };
    expect(withCanonical(broken).canonical).toBeUndefined();
  });

  for (const entry of CORPUS) {
    it(`loads ${entry.name} identically from canonical and from legacy pages`, () => {
      const persisted = withCanonical(createPersistedDocumentFromFlowDocument(flowDocument([entry])));
      const [fromLegacy] = createFlowTabsFromPersistedDocuments([persisted]).map(comparable);
      const [fromCanonical] = createFlowTabsFromCanonical(persisted.canonical!).map(comparable);
      expect(fromCanonical).toEqual(fromLegacy);
    });
  }
});
