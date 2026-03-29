import type { FlowState } from './types';
import { mergeActivePagesIntoDocuments } from './workspaceDocumentModel';

type DocumentSyncState = Pick<
  FlowState,
  'documents' | 'activeDocumentId' | 'tabs' | 'activeTabId' | 'nodes' | 'edges'
>;

export function syncWorkspaceDocuments(state: DocumentSyncState): FlowState['documents'] {
  if (!state.activeDocumentId || state.documents.length === 0) {
    return state.documents;
  }

  return mergeActivePagesIntoDocuments({
    documents: state.documents,
    activeDocumentId: state.activeDocumentId,
    activePages: state.tabs,
    activePageId: state.activeTabId,
    activeNodes: state.nodes,
    activeEdges: state.edges,
  });
}

export function installWorkspaceDocumentSync(store: {
  subscribe: (listener: (state: FlowState, previousState: FlowState) => void) => () => void;
  getState: () => FlowState;
  setState: (partial: Partial<FlowState>) => void;
}): () => void {
  let syncing = false;

  return store.subscribe((state, previousState) => {
    if (syncing) return;

    const editorChanged =
      state.tabs !== previousState.tabs ||
      state.activeTabId !== previousState.activeTabId ||
      state.nodes !== previousState.nodes ||
      state.edges !== previousState.edges ||
      state.activeDocumentId !== previousState.activeDocumentId;

    if (!editorChanged) return;

    const documents = syncWorkspaceDocuments(state);
    if (documents === state.documents) return;

    syncing = true;
    store.setState({ documents });
    syncing = false;
  });
}
