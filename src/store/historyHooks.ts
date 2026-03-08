import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { FlowStoreState } from '../store';

export function useHistoryActions(): Pick<
    FlowStoreState,
    'recordHistoryV2' | 'undoV2' | 'redoV2' | 'canUndoV2' | 'canRedoV2'
> {
    return useFlowStore(
        useShallow((state) => ({
            recordHistoryV2: state.recordHistoryV2,
            undoV2: state.undoV2,
            redoV2: state.redoV2,
            canUndoV2: state.canUndoV2,
            canRedoV2: state.canRedoV2,
        }))
    );
}
