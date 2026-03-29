import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowStoreState } from '../store';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import {
    createWorkspaceDocumentsFromTabs,
    findDocumentRouteTarget,
    type WorkspaceDocumentSummary,
} from './workspaceDocumentModel';

export function useWorkspaceDocumentsState(): {
    documents: WorkspaceDocumentSummary[];
    activeDocumentId: string;
} {
    const { documents, activeDocumentId, tabs, activeTabId, nodes, edges } = useFlowStore(
        useShallow((state) => ({
            documents: state.documents,
            activeDocumentId: state.activeDocumentId,
            tabs: state.tabs,
            activeTabId: state.activeTabId,
            nodes: state.nodes,
            edges: state.edges,
        })),
    );

    const summaries = useMemo(
        () => createWorkspaceDocumentsFromTabs({
            documents,
            activeDocumentId,
            activeNodes: nodes,
            activeEdges: edges,
            activePages: tabs,
            activePageId: activeTabId,
        }),
        [documents, activeDocumentId, tabs, activeTabId, nodes, edges],
    );

    return {
        documents: summaries,
        activeDocumentId,
    };
}

export function useWorkspaceDocumentActions(): {
    setActiveDocumentId: FlowStoreState['setActiveDocumentId'];
    setDocuments: FlowStoreState['setDocuments'];
    createDocument: FlowStoreState['createDocument'];
    renameDocument: FlowStoreState['renameDocument'];
    duplicateDocument: FlowStoreState['duplicateDocument'];
    deleteDocument: FlowStoreState['deleteDocumentRecord'];
} {
    const actions = useFlowStore(
        useShallow((state) => ({
            setActiveDocumentId: state.setActiveDocumentId,
            setDocuments: state.setDocuments,
            createDocument: state.createDocument,
            renameDocument: state.renameDocument,
            duplicateDocument: state.duplicateDocument,
            deleteDocument: state.deleteDocumentRecord,
        })),
    );

    return {
        setActiveDocumentId: actions.setActiveDocumentId,
        setDocuments: actions.setDocuments,
        createDocument: actions.createDocument,
        renameDocument: actions.renameDocument,
        duplicateDocument: actions.duplicateDocument,
        deleteDocument: actions.deleteDocument,
    };
}

export function useWorkspaceRouteResolver(): {
    documents: FlowDocument[];
    resolveTarget: (targetId: string) => { documentId: string; pageId: string } | null;
} {
    const documents = useFlowStore((state) => state.documents);
    const resolveTarget = useCallback(
        (targetId: string) => findDocumentRouteTarget(documents, targetId),
        [documents],
    );

    return {
        documents,
        resolveTarget,
    };
}
