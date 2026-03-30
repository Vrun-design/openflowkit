import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import { selectHistoryActions } from './selectors';
import type { HistoryActionsSlice } from './types';

export function useHistoryActions(): HistoryActionsSlice {
    return useFlowStore(useShallow(selectHistoryActions));
}
