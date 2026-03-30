import type { FlowState } from './types';

export type SetFlowState = (
  partial: Partial<FlowState> | ((state: FlowState) => Partial<FlowState>)
) => void;

export type GetFlowState = () => FlowState;
