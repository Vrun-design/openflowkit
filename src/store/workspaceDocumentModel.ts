import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import { resolveNodeSize as resolveCanvasNodeSize } from '@/components/nodeHelpers';

export interface WorkspaceDocumentPreviewNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: FlowNode['data']['shape'];
}

export interface WorkspaceDocumentPreview {
    nodes: WorkspaceDocumentPreviewNode[];
}

const PREVIEW_MAX_NODES = 18;
const PREVIEW_MAX_RENDER_AREA = 2_400_000;
const PREVIEW_MIN_NODE_WIDTH = 48;
const PREVIEW_MIN_NODE_HEIGHT = 24;
const PREVIEW_MAX_NODE_WIDTH = 132;
const PREVIEW_MAX_NODE_HEIGHT = 72;
const MAX_PREVIEW_DOCUMENTS = 3;

export interface WorkspaceDocumentSummary {
    id: string;
    name: string;
    updatedAt?: string;
    nodeCount: number;
    edgeCount: number;
    isActive: boolean;
    preview: WorkspaceDocumentPreview | null;
}

export interface CreateWorkspaceDocumentsParams {
    documents: FlowDocument[];
    activeDocumentId: string;
    activeNodes: FlowNode[];
    activeEdges: FlowEdge[];
    activePages: FlowTab[];
    activePageId: string;
}

function resolveWorkspaceDocument(
    document: FlowDocument,
    activeDocumentId: string,
    activeNodes: FlowNode[],
    activeEdges: FlowEdge[],
    activePages: FlowTab[],
    activePageId: string,
): FlowDocument {
    const isActive = document.id === activeDocumentId;
    return isActive
        ? mergeActivePagesIntoDocuments({
            documents: [document],
            activeDocumentId: document.id,
            activePages,
            activePageId,
            activeNodes,
            activeEdges,
        })[0]
        : document;
}

function findActivePage(document: FlowDocument): FlowDocument['pages'][number] | undefined {
    return document.pages.find((page) => page.id === document.activePageId) ?? document.pages[0];
}

function haveSamePageContent(
    left: FlowDocument['pages'],
    right: FlowTab[],
    activePageId: string,
    activeNodes: FlowNode[],
    activeEdges: FlowEdge[],
): boolean {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((page, index) => {
        const nextPage = right[index];
        if (!nextPage) {
            return false;
        }

        const expectedNodes = nextPage.id === activePageId ? activeNodes : nextPage.nodes;
        const expectedEdges = nextPage.id === activePageId ? activeEdges : nextPage.edges;

        return (
            page.id === nextPage.id &&
            page.name === nextPage.name &&
            page.diagramType === nextPage.diagramType &&
            page.updatedAt === nextPage.updatedAt &&
            page.playback === nextPage.playback &&
            page.history === nextPage.history &&
            page.nodes === expectedNodes &&
            page.edges === expectedEdges
        );
    });
}

export function syncActivePageTabs(
    pages: FlowTab[],
    activePageId: string,
    activeNodes: FlowNode[],
    activeEdges: FlowEdge[],
): FlowTab[] {
    return pages.map((page) =>
        page.id === activePageId
            ? {
                ...page,
                nodes: activeNodes,
                edges: activeEdges,
            }
            : page,
    );
}

export function mergeActivePagesIntoDocuments(params: {
    documents: FlowDocument[];
    activeDocumentId: string;
    activePages: FlowTab[];
    activePageId: string;
    activeNodes: FlowNode[];
    activeEdges: FlowEdge[];
}): FlowDocument[] {
    const { documents, activeDocumentId, activePages, activePageId, activeNodes, activeEdges } = params;
    const activeDocument = documents.find((document) => document.id === activeDocumentId);
    if (!activeDocument) {
        return documents;
    }

    if (
        activeDocument.activePageId === activePageId &&
        haveSamePageContent(activeDocument.pages, activePages, activePageId, activeNodes, activeEdges)
    ) {
        return documents;
    }

    const syncedPages = syncActivePageTabs(activePages, activePageId, activeNodes, activeEdges);

    return documents.map((document) => {
        if (document.id !== activeDocumentId) {
            return document;
        }

        return {
            ...document,
            activePageId,
            pages: syncedPages.map((page) => ({
                id: page.id,
                name: page.name,
                diagramType: page.diagramType,
                updatedAt: page.updatedAt,
                nodes: page.nodes,
                edges: page.edges,
                playback: page.playback,
                history: page.history,
            })),
        };
    });
}

export function createWorkspaceDocumentSummary(
    document: FlowDocument,
    activeDocumentId: string,
    activeNodes: FlowNode[],
    activeEdges: FlowEdge[],
    activePages: FlowTab[],
    activePageId: string,
): WorkspaceDocumentSummary {
    const isActive = document.id === activeDocumentId;
    const resolvedDocument = resolveWorkspaceDocument(
        document,
        activeDocumentId,
        activeNodes,
        activeEdges,
        activePages,
        activePageId,
    );
    const nodeCount = resolvedDocument.pages.reduce((sum, page) => sum + page.nodes.length, 0);
    const edgeCount = resolvedDocument.pages.reduce((sum, page) => sum + page.edges.length, 0);

    return {
        id: resolvedDocument.id,
        name: resolvedDocument.name,
        updatedAt: resolvedDocument.updatedAt,
        nodeCount,
        edgeCount,
        isActive,
        preview: null,
    };
}

export function sortWorkspaceDocuments(documents: WorkspaceDocumentSummary[]): WorkspaceDocumentSummary[] {
    return [...documents].sort((left, right) => {
        if (left.isActive && !right.isActive) return -1;
        if (!left.isActive && right.isActive) return 1;
        const leftTime = Date.parse(left.updatedAt || '');
        const rightTime = Date.parse(right.updatedAt || '');
        return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
}

export function createWorkspaceDocumentsFromTabs({
    documents,
    activeDocumentId,
    activeNodes,
    activeEdges,
    activePages,
    activePageId,
}: CreateWorkspaceDocumentsParams): WorkspaceDocumentSummary[] {
    const documentMap = new Map(documents.map((document) => [document.id, document] as const));
    const sortedSummaries = sortWorkspaceDocuments(
        documents.map((document) => createWorkspaceDocumentSummary(
            document,
            activeDocumentId,
            activeNodes,
            activeEdges,
            activePages,
            activePageId,
        )),
    );

    return sortedSummaries.map((summary, index) => {
        if (index >= MAX_PREVIEW_DOCUMENTS) {
            return summary;
        }

        const sourceDocument = documentMap.get(summary.id);
        if (!sourceDocument) {
            return summary;
        }

        const resolvedDocument = resolveWorkspaceDocument(
            sourceDocument,
            activeDocumentId,
            activeNodes,
            activeEdges,
            activePages,
            activePageId,
        );
        const activePage = findActivePage(resolvedDocument);

        return {
            ...summary,
            preview: activePage ? createWorkspaceDocumentPreview(activePage.nodes, activePage.edges) : null,
        };
    });
}

export function findDocumentRouteTarget(documents: FlowDocument[], targetId: string): {
    documentId: string;
    pageId: string;
} | null {
    for (const document of documents) {
        if (document.id === targetId) {
            return {
                documentId: document.id,
                pageId: document.activePageId,
            };
        }

        const matchingPage = document.pages.find((page) => page.id === targetId);
        if (matchingPage) {
            return {
                documentId: document.id,
                pageId: matchingPage.id,
            };
        }
    }

    return null;
}

function resolveNodeSize(node: FlowNode): { width: number; height: number } {
    return resolveCanvasNodeSize(node);
}

function isPreviewContainerNode(node: FlowNode): boolean {
    return node.type === 'group' || node.type === 'section' || node.type === 'swimlane';
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function createWorkspaceDocumentPreview(nodes: FlowNode[], edges: FlowEdge[]): WorkspaceDocumentPreview | null {
    if (nodes.length === 0) {
        return null;
    }

    if (nodes.length > PREVIEW_MAX_NODES * 3 || edges.length > PREVIEW_MAX_NODES * 4) {
        return null;
    }

    const previewNodes = nodes
        .filter((node) => !isPreviewContainerNode(node))
        .filter((node) => typeof node.position?.x === 'number' && typeof node.position?.y === 'number')
        .slice(0, PREVIEW_MAX_NODES)
        .map((node) => {
            const size = resolveNodeSize(node);
            return {
                id: node.id,
                x: node.position.x,
                y: node.position.y,
                width: clamp(size.width, PREVIEW_MIN_NODE_WIDTH, PREVIEW_MAX_NODE_WIDTH),
                height: clamp(size.height, PREVIEW_MIN_NODE_HEIGHT, PREVIEW_MAX_NODE_HEIGHT),
                shape: node.data?.shape,
            };
        });

    if (previewNodes.length === 0) {
        return null;
    }

    const boundsMinX = Math.min(...previewNodes.map((node) => node.x));
    const boundsMinY = Math.min(...previewNodes.map((node) => node.y));
    const boundsMaxX = Math.max(...previewNodes.map((node) => node.x + node.width));
    const boundsMaxY = Math.max(...previewNodes.map((node) => node.y + node.height));
    if ((boundsMaxX - boundsMinX) * (boundsMaxY - boundsMinY) > PREVIEW_MAX_RENDER_AREA) {
        return null;
    }

    return {
        nodes: previewNodes,
    };
}

export function getEditorPagesForDocument(documents: FlowDocument[], documentId: string | null): {
    activeDocumentId: string;
    activePageId: string;
    pages: FlowTab[];
} | null {
    if (!documentId) {
        return null;
    }

    const document = documents.find((entry) => entry.id === documentId);
    if (!document || document.pages.length === 0) {
        return null;
    }

    return {
        activeDocumentId: document.id,
        activePageId: document.activePageId,
        pages: document.pages.map((page) => ({
            id: page.id,
            name: page.name,
            diagramType: page.diagramType,
            updatedAt: page.updatedAt,
            nodes: page.nodes,
            edges: page.edges,
            playback: page.playback,
            history: page.history,
        })),
    };
}
