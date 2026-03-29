import type { FlowTab } from '@/lib/types';
import { createId } from '@/lib/id';
import { DEFAULT_DIAGRAM_TYPE } from '@/services/diagramDocument';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import type { FlowState } from '../types';

type SetFlowState = (partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)) => void;
type GetFlowState = () => FlowState;

function nowIso(): string {
    return new Date().toISOString();
}

function createEmptyPage(documentId: string, pageName = 'Page 1'): FlowTab {
    return {
        id: `${documentId}:page:${createId('page')}`,
        name: pageName,
        diagramType: DEFAULT_DIAGRAM_TYPE,
        updatedAt: nowIso(),
        nodes: [],
        edges: [],
        playback: undefined,
        history: { past: [], future: [] },
    };
}

function createEmptyDocument(name = 'Untitled Flow'): FlowDocument {
    const documentId = createId('doc');
    const primaryPage = createEmptyPage(documentId);
    return {
        id: documentId,
        name,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        activePageId: primaryPage.id,
        pages: [primaryPage],
    };
}

function toFlowTabPages(document: FlowDocument): FlowTab[] {
    return document.pages.map((page) => ({
        id: page.id,
        name: page.name,
        diagramType: page.diagramType,
        updatedAt: page.updatedAt,
        nodes: page.nodes,
        edges: page.edges,
        playback: page.playback,
        history: page.history,
    }));
}

function matchesLoadedPages(currentPages: FlowTab[], documentPages: FlowDocument['pages']): boolean {
    if (currentPages.length !== documentPages.length) {
        return false;
    }

    return currentPages.every((page, index) => {
        const documentPage = documentPages[index];
        if (!documentPage) {
            return false;
        }

        return (
            page.id === documentPage.id &&
            page.name === documentPage.name &&
            page.diagramType === documentPage.diagramType &&
            page.updatedAt === documentPage.updatedAt &&
            page.nodes === documentPage.nodes &&
            page.edges === documentPage.edges &&
            page.playback === documentPage.playback &&
            page.history === documentPage.history
        );
    });
}

export function createWorkspaceDocumentActions(set: SetFlowState, get: GetFlowState): Pick<
    FlowState,
    'setDocuments' | 'setActiveDocumentId' | 'createDocument' | 'renameDocument' | 'duplicateDocument' | 'deleteDocumentRecord'
> {
    return {
        setDocuments: (documents) => set({ documents }),
        setActiveDocumentId: (id) => {
            const { documents, activeDocumentId, activeTabId, tabs, nodes, edges } = get();
            const document = documents.find((entry) => entry.id === id);
            if (!document) {
                return;
            }

            const pages = toFlowTabPages(document);
            const activePage = pages.find((page) => page.id === document.activePageId) ?? pages[0];
            if (!activePage) {
                return;
            }

            const activePageAlreadyLoaded =
                activeDocumentId === document.id &&
                activeTabId === activePage.id &&
                matchesLoadedPages(tabs, document.pages) &&
                nodes === activePage.nodes &&
                edges === activePage.edges;
            if (activePageAlreadyLoaded) {
                return;
            }

            set({
                activeDocumentId: document.id,
                tabs: pages,
                activeTabId: activePage.id,
                nodes: activePage.nodes,
                edges: activePage.edges,
            });
        },
        createDocument: () => {
            const document = createEmptyDocument();
            const pages = toFlowTabPages(document);
            const activePage = pages[0];

            set((state) => ({
                documents: [...state.documents, document],
                activeDocumentId: document.id,
                tabs: pages,
                activeTabId: activePage.id,
                nodes: activePage.nodes,
                edges: activePage.edges,
            }));

            return document.id;
        },
        renameDocument: (id, nextName) => {
            const trimmedName = nextName.trim();
            if (!trimmedName) {
                return;
            }

            set((state) => {
                const target = state.documents.find((document) => document.id === id);
                if (!target || target.name === trimmedName) {
                    return {};
                }

                const shouldMirrorToSinglePage = target.pages.length === 1 && target.pages[0]?.name === target.name;
                const documents = state.documents.map((document) =>
                    document.id === id
                        ? {
                            ...document,
                            name: trimmedName,
                            updatedAt: nowIso(),
                            pages: shouldMirrorToSinglePage
                                ? document.pages.map((page) => ({ ...page, name: trimmedName }))
                                : document.pages,
                        }
                        : document,
                );

                if (state.activeDocumentId !== id || !shouldMirrorToSinglePage) {
                    return { documents };
                }

                const tabs = state.tabs.map((page) => ({ ...page, name: trimmedName }));
                const activePage = tabs.find((page) => page.id === state.activeTabId) ?? tabs[0];

                return {
                    documents,
                    tabs,
                    activeTabId: activePage?.id ?? state.activeTabId,
                    nodes: activePage?.nodes ?? state.nodes,
                    edges: activePage?.edges ?? state.edges,
                };
            });
        },
        duplicateDocument: (id) => {
            const { documents } = get();
            const source = documents.find((document) => document.id === id);
            if (!source) {
                return null;
            }

            const documentId = createId('doc');
            let activePageId = '';
            const duplicated: FlowDocument = {
                ...source,
                id: documentId,
                name: `${source.name} Copy`,
                createdAt: nowIso(),
                updatedAt: nowIso(),
                activePageId,
                pages: source.pages.map((page, index) => {
                    const nextPageId = `${documentId}:page:${createId('page')}`;
                    if (index === 0) {
                        activePageId = nextPageId;
                    }
                    return {
                        ...page,
                        id: nextPageId,
                        updatedAt: nowIso(),
                        nodes: page.nodes.map((node) => ({
                            ...node,
                            selected: false,
                            data: { ...node.data },
                            position: { ...node.position },
                            style: node.style ? { ...node.style } : node.style,
                        })),
                        edges: page.edges.map((edge) => ({
                            ...edge,
                            selected: false,
                            data: edge.data ? { ...edge.data } : edge.data,
                            style: edge.style ? { ...edge.style } : edge.style,
                        })),
                        history: { past: [], future: [] },
                    };
                }),
            };
            duplicated.activePageId = activePageId || duplicated.pages[0]?.id || '';

            const pages = toFlowTabPages(duplicated);
            const activePage = pages[0];

            set((state) => ({
                documents: [...state.documents, duplicated],
                activeDocumentId: duplicated.id,
                tabs: pages,
                activeTabId: activePage.id,
                nodes: activePage.nodes,
                edges: activePage.edges,
            }));

            return duplicated.id;
        },
        deleteDocumentRecord: (id) => {
            const { documents, activeDocumentId } = get();
            const remainingDocuments = documents.filter((document) => document.id !== id);

            if (remainingDocuments.length === documents.length) {
                return;
            }

            if (remainingDocuments.length === 0) {
                set({
                    documents: [],
                    activeDocumentId: '',
                    tabs: [],
                    activeTabId: '',
                    nodes: [],
                    edges: [],
                });
                return;
            }

            if (id !== activeDocumentId) {
                set({ documents: remainingDocuments });
                return;
            }

            const nextDocument = remainingDocuments[0];
            const pages = toFlowTabPages(nextDocument);
            const activePage = pages.find((page) => page.id === nextDocument.activePageId) ?? pages[0];
            if (!activePage) {
                return;
            }

            set({
                documents: remainingDocuments,
                activeDocumentId: nextDocument.id,
                tabs: pages,
                activeTabId: activePage.id,
                nodes: activePage.nodes,
                edges: activePage.edges,
            });
        },
    };
}
