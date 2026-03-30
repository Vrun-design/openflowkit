import type { GetFlowState, SetFlowState } from './actionFactory';
import { createInitialFlowState } from './persistence';
import { createCanvasEditorSlice } from './slices/createCanvasEditorSlice';
import { createExperienceSlice } from './slices/createExperienceSlice';
import { createWorkspaceSlice } from './slices/createWorkspaceSlice';
import type { FlowState } from './types';

export function createFlowStoreState(
  set: SetFlowState,
  get: GetFlowState
): FlowState {
  const initialState = createInitialFlowState();

  return {
    ...initialState,
    ...createCanvasEditorSlice(initialState, set, get),
    ...createWorkspaceSlice(initialState, set, get),
    ...createExperienceSlice(initialState, set),
  };
}
