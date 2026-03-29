import { describe, expect, it } from 'vitest';
import type { FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import { syncWorkspaceDocuments } from './documentStateSync';

function createPage(overrides: Partial<FlowTab> = {}): FlowTab {
    return {
        id: 'page-1',
        name: 'Overview',
        diagramType: 'flowchart',
        updatedAt: '2026-03-27T00:00:00.000Z',
        nodes: [],
        edges: [],
        history: { past: [], future: [] },
        playback: undefined,
        ...overrides,
    };
}

function createDocument(pages: FlowTab[]): FlowDocument {
    return {
        id: 'doc-1',
        name: 'System Design',
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z',
        activePageId: pages[0]?.id ?? '',
        pages,
    };
}

describe('documentStateSync', () => {
    it('keeps the active document pages aligned with live editor state', () => {
        const storedPage = createPage({
            nodes: [{ id: 'node-stored' } as never],
        });
        const livePage = createPage({
            nodes: [{ id: 'node-live' } as never],
            edges: [{ id: 'edge-live' } as never],
        });

        const documents = syncWorkspaceDocuments({
            documents: [createDocument([storedPage])],
            activeDocumentId: 'doc-1',
            tabs: [livePage],
            activeTabId: 'page-1',
            nodes: livePage.nodes,
            edges: livePage.edges,
        });

        expect(documents[0]?.pages[0]?.nodes).toEqual(livePage.nodes);
        expect(documents[0]?.pages[0]?.edges).toEqual(livePage.edges);
    });

    it('leaves documents unchanged when there is no active document', () => {
        const documents = [createDocument([createPage()])];

        expect(syncWorkspaceDocuments({
            documents,
            activeDocumentId: '',
            tabs: [createPage()],
            activeTabId: 'page-1',
            nodes: [],
            edges: [],
        })).toBe(documents);
    });

    it('returns the same documents reference when active pages already match editor state', () => {
        const livePage = createPage({
            nodes: [{ id: 'node-live' } as never],
            edges: [{ id: 'edge-live' } as never],
        });
        const documents = [createDocument([livePage])];

        expect(syncWorkspaceDocuments({
            documents,
            activeDocumentId: 'doc-1',
            tabs: [livePage],
            activeTabId: 'page-1',
            nodes: livePage.nodes,
            edges: livePage.edges,
        })).toBe(documents);
    });
});
