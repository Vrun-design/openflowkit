import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '../store';
import type { CanvasActionsSlice, CanvasStateSlice } from './types';
import { selectCanvasActions, selectCanvasState } from './selectors';

export function useCanvasState(): CanvasStateSlice {
    return useFlowStore(useShallow(selectCanvasState));
}

export function useCanvasActions(): CanvasActionsSlice {
    return useFlowStore(useShallow(selectCanvasActions));
}
