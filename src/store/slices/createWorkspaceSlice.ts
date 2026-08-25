import type { GetFlowState, SetFlowState } from '../actionFactory';
import { createHistoryActions } from '../actions/createHistoryActions';
import { createContextualCommandActions } from '../actions/createContextualCommandActions';
import { createTabActions } from '../actions/createTabActions';
import { createWorkspaceDocumentActions } from '../actions/createWorkspaceDocumentActions';
import type {
  HistoryActionsSlice,
  ContextualCommandActionsSlice,
  TabActionsSlice,
  WorkspaceDocumentActionsSlice,
} from '../types';
import type { FlowState } from '../types';

type WorkspaceSliceState = Pick<
  FlowState,
  'documents' | 'activeDocumentId' | 'tabs' | 'activeTabId'
>;

export type WorkspaceSlice = WorkspaceSliceState &
  WorkspaceDocumentActionsSlice &
  TabActionsSlice &
  HistoryActionsSlice &
  ContextualCommandActionsSlice;

export function createWorkspaceSlice(
  initialState: WorkspaceSliceState,
  set: SetFlowState,
  get: GetFlowState
): WorkspaceSlice {
  return {
    documents: initialState.documents,
    activeDocumentId: initialState.activeDocumentId,
    tabs: initialState.tabs,
    activeTabId: initialState.activeTabId,
    ...createWorkspaceDocumentActions(set, get),
    ...createTabActions(set, get),
    ...createHistoryActions(set, get),
    ...createContextualCommandActions(set),
  };
}
