import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CinematicRenderState } from '@/services/export/cinematicRenderState';
import type { CinematicExportRequest } from '@/services/export/cinematicExport';

const EMPTY_SET = new Set<string>();

function createInactiveRenderState(): CinematicRenderState {
  return {
    active: false,
    backgroundMode: 'light',
    visibleNodeIds: EMPTY_SET,
    builtEdgeIds: EMPTY_SET,
    visibleEdgeIds: EMPTY_SET,
    activeNodeId: null,
    activeNodeProgress: 0,
    activeEdgeId: null,
    activeEdgeProgress: 0,
    currentSegment: null,
  };
}

export type CinematicExportJobStatus =
  | 'idle'
  | 'preparing'
  | 'capturing'
  | 'encoding'
  | 'finalizing'
  | 'done'
  | 'error'
  | 'cancelled';

export interface CinematicExportJobState {
  status: CinematicExportJobStatus;
  progressPercent: number;
  completedFrames: number;
  totalFrames: number;
  stageLabel: string;
  canCancel: boolean;
  request: CinematicExportRequest | null;
}

function createInactiveJobState(): CinematicExportJobState {
  return {
    status: 'idle',
    progressPercent: 0,
    completedFrames: 0,
    totalFrames: 0,
    stageLabel: '',
    canCancel: false,
    request: null,
  };
}

interface CinematicExportContextValue {
  renderState: CinematicRenderState;
  jobState: CinematicExportJobState;
  setRenderState: (nextState: CinematicRenderState) => void;
  resetRenderState: () => void;
  setJobState: React.Dispatch<React.SetStateAction<CinematicExportJobState>>;
  resetJobState: () => void;
  registerCancelHandler: (handler: (() => void) | null) => void;
  cancelExport: () => void;
}

const INACTIVE_CONTEXT_VALUE: CinematicExportContextValue = {
  renderState: createInactiveRenderState(),
  jobState: createInactiveJobState(),
  setRenderState: () => undefined,
  resetRenderState: () => undefined,
  setJobState: () => undefined,
  resetJobState: () => undefined,
  registerCancelHandler: () => undefined,
  cancelExport: () => undefined,
};

const CinematicExportContext = createContext<CinematicExportContextValue>(INACTIVE_CONTEXT_VALUE);

export function CinematicExportProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [renderState, setRenderStateState] = useState<CinematicRenderState>(() => createInactiveRenderState());
  const [jobState, setJobState] = useState<CinematicExportJobState>(() => createInactiveJobState());
  const [cancelHandler, setCancelHandler] = useState<(() => void) | null>(null);

  const value = useMemo<CinematicExportContextValue>(() => ({
    renderState,
    jobState,
    setRenderState: (nextState) => setRenderStateState(nextState),
    resetRenderState: () => {
      setRenderStateState(createInactiveRenderState());
    },
    setJobState,
    resetJobState: () => {
      setJobState(createInactiveJobState());
      setCancelHandler(null);
    },
    registerCancelHandler: (handler) => setCancelHandler(() => handler),
    cancelExport: () => {
      cancelHandler?.();
    },
  }), [cancelHandler, jobState, renderState]);

  return (
    <CinematicExportContext.Provider value={value}>
      {children}
    </CinematicExportContext.Provider>
  );
}

function useCinematicExportContext(): CinematicExportContextValue {
  return useContext(CinematicExportContext);
}

export function useCinematicExportState(): CinematicRenderState {
  return useCinematicExportContext().renderState;
}

export function useCinematicExportJobState(): CinematicExportJobState {
  return useCinematicExportContext().jobState;
}

export function useCinematicExportActions(): Pick<
  CinematicExportContextValue,
  | 'setRenderState'
  | 'resetRenderState'
  | 'setJobState'
  | 'resetJobState'
  | 'registerCancelHandler'
  | 'cancelExport'
> {
  const {
    setRenderState,
    resetRenderState,
    setJobState,
    resetJobState,
    registerCancelHandler,
    cancelExport,
  } = useCinematicExportContext();
  return {
    setRenderState,
    resetRenderState,
    setJobState,
    resetJobState,
    registerCancelHandler,
    cancelExport,
  };
}
