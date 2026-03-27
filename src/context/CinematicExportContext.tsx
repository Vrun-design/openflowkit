import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CinematicRenderState } from '@/services/export/cinematicRenderState';

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

interface CinematicExportContextValue {
  renderState: CinematicRenderState;
  setRenderState: (nextState: CinematicRenderState) => void;
  resetRenderState: () => void;
}

const INACTIVE_CONTEXT_VALUE: CinematicExportContextValue = {
  renderState: createInactiveRenderState(),
  setRenderState: () => undefined,
  resetRenderState: () => undefined,
};

const CinematicExportContext = createContext<CinematicExportContextValue>(INACTIVE_CONTEXT_VALUE);

export function CinematicExportProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [renderState, setRenderStateState] = useState<CinematicRenderState>(() => createInactiveRenderState());

  const value = useMemo<CinematicExportContextValue>(() => ({
    renderState,
    setRenderState: (nextState) => setRenderStateState(nextState),
    resetRenderState: () => {
      setRenderStateState(createInactiveRenderState());
    },
  }), [renderState]);

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

export function useCinematicExportActions(): Pick<CinematicExportContextValue, 'setRenderState' | 'resetRenderState'> {
  const { setRenderState, resetRenderState } = useCinematicExportContext();
  return {
    setRenderState,
    resetRenderState,
  };
}
