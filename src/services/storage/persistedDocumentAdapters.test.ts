import { describe, expect, it } from 'vitest';
import type { FlowTab } from '@/lib/types';
import {
  createFlowTabFromPersistedDocument,
  createPersistedDocumentFromFlowDocument,
  createPersistedDocumentFromTab,
} from './persistedDocumentAdapters';

function createFlowTab(overrides: Partial<FlowTab> = {}): FlowTab {
  return {
    id: 'tab-1',
    name: 'System Design',
    diagramType: 'flowchart',
    updatedAt: '2026-03-27T00:00:00.000Z',
    nodes: [],
    edges: [],
    playback: undefined,
    history: { past: [], future: [] },
    ...overrides,
  };
}

describe('persistedDocumentAdapters', () => {
  it('maps a flow tab into a persisted document', () => {
    const document = createPersistedDocumentFromTab(createFlowTab());

    expect(document.id).toBe('tab-1');
    expect(document.name).toBe('System Design');
    expect(document.content.nodes).toEqual([]);
    expect(document.deletedAt).toBeNull();
  });

  it('maps a persisted document back into an editor tab', () => {
    const tab = createFlowTabFromPersistedDocument(createPersistedDocumentFromTab(createFlowTab()));

    expect(tab.id).toBe('tab-1');
    expect(tab.name).toBe('System Design');
    expect(tab.diagramType).toBe('flowchart');
    expect(tab.history).toEqual({ past: [], future: [] });
  });

  it('maps a multi-page flow document into a persisted multi-page document', () => {
    const persisted = createPersistedDocumentFromFlowDocument({
      id: 'doc-1',
      name: 'Architecture',
      createdAt: '2026-03-27T00:00:00.000Z',
      updatedAt: '2026-03-27T00:00:00.000Z',
      activePageId: 'page-2',
      pages: [
        {
          id: 'page-1',
          name: 'Overview',
          diagramType: 'flowchart',
          updatedAt: '2026-03-27T00:00:00.000Z',
          nodes: [],
          edges: [],
          playback: undefined,
          history: { past: [], future: [] },
        },
        {
          id: 'page-2',
          name: 'Deployment',
          diagramType: 'sequence',
          updatedAt: '2026-03-27T00:00:00.000Z',
          nodes: [],
          edges: [],
          playback: undefined,
          history: { past: [], future: [] },
        },
      ],
    });

    expect(persisted.pages).toHaveLength(2);
    expect(persisted.activePageId).toBe('page-2');
    expect(persisted.content?.history).toBeUndefined();
  });
});
