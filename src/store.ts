import { DEFAULT_AI_SETTINGS, DEFAULT_DESIGN_SYSTEM } from './store/defaults';
import { createFlowStore } from './store/createFlowStore';

export { DEFAULT_AI_SETTINGS, DEFAULT_DESIGN_SYSTEM };
export type {
  AIProvider,
  AISettings,
  AISettingsStorageMode,
  CustomHeaderConfig,
  FlowState as FlowStoreState,
  ViewSettings,
} from './store/types';

export const useFlowStore = createFlowStore();
