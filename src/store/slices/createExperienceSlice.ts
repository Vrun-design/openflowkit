import type { SetFlowState } from '../actionFactory';
import { createDesignSystemActions } from '../actions/createDesignSystemActions';
import { createViewActions } from '../actions/createViewActions';
import type {
  DesignSystemActionsSlice,
  VisualSettingsActionsSlice,
} from '../types';
import type { FlowState, ShortcutHelpActionsSlice } from '../types';

type ExperienceSliceState = Pick<
  FlowState,
  | 'designSystems'
  | 'activeDesignSystemId'
  | 'viewSettings'
  | 'globalEdgeOptions'
  | 'lastUpdateTime'
>;

type PersistenceStatusActionsSlice = Pick<FlowState, 'updateLastSaveTime'>;

export type ExperienceSlice = ExperienceSliceState &
  DesignSystemActionsSlice &
  VisualSettingsActionsSlice &
  ShortcutHelpActionsSlice &
  PersistenceStatusActionsSlice;

export function createExperienceSlice(
  initialState: ExperienceSliceState,
  set: SetFlowState
): ExperienceSlice {
  return {
    designSystems: initialState.designSystems,
    activeDesignSystemId: initialState.activeDesignSystemId,
    viewSettings: initialState.viewSettings,
    globalEdgeOptions: initialState.globalEdgeOptions,
    lastUpdateTime: initialState.lastUpdateTime,
    ...createDesignSystemActions(set),
    ...createViewActions(set),
    updateLastSaveTime: () => set({ lastUpdateTime: Date.now() }),
  };
}
