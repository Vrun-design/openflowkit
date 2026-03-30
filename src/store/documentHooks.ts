import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import {
    createWorkspaceDocumentsFromTabs,
    findDocumentRouteTarget,
    type WorkspaceDocumentSummary,
} from './workspaceDocumentModel';
import { selectWorkspaceDocumentActions, selectWorkspaceDocumentsState } from './selectors';
import type { WorkspaceDocumentActionsSlice } from './types';

export function useWorkspaceDocumentsState(): {
    documents: WorkspaceDocumentSummary[];
    activeDocumentId: string;
} {
    const { documents, activeDocumentId, tabs, activeTabId, nodes, edges } = useFlowStore(
        useShallow(selectWorkspaceDocumentsState),
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
    setActiveDocumentId: WorkspaceDocumentActionsSlice['setActiveDocumentId'];
    setDocuments: WorkspaceDocumentActionsSlice['setDocuments'];
    createDocument: WorkspaceDocumentActionsSlice['createDocument'];
    renameDocument: WorkspaceDocumentActionsSlice['renameDocument'];
    duplicateDocument: WorkspaceDocumentActionsSlice['duplicateDocument'];
    deleteDocument: WorkspaceDocumentActionsSlice['deleteDocumentRecord'];
} {
    const actions = useFlowStore(useShallow(selectWorkspaceDocumentActions));

    return {
        setActiveDocumentId: actions.setActiveDocumentId,
        setDocuments: actions.setDocuments,
        createDocument: actions.createDocument,
        renameDocument: actions.renameDocument,
        duplicateDocument: actions.duplicateDocument,
        deleteDocument: actions.deleteDocumentRecord,
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
