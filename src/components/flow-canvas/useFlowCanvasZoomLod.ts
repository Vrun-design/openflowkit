import { useMemo } from 'react';
import type { ViewSettings } from '@/store/types';
import {
  isFarZoomReductionActiveForProfile,
  isLowDetailModeActiveForProfile,
} from './largeGraphSafetyMode';

interface UseFlowCanvasZoomLodParams {
  safetyModeActive: boolean;
  zoom: number;
  largeGraphSafetyProfile: ViewSettings['largeGraphSafetyProfile'];
}

interface FlowCanvasZoomLodState {
  lowDetailModeActive: boolean;
  farZoomReductionActive: boolean;
}

export function useFlowCanvasZoomLod({
  safetyModeActive,
  zoom,
  largeGraphSafetyProfile,
}: UseFlowCanvasZoomLodParams): FlowCanvasZoomLodState {
  const lowDetailModeActive = useMemo(() =>
    isLowDetailModeActiveForProfile(
      safetyModeActive,
      zoom,
      largeGraphSafetyProfile
    ),
    [largeGraphSafetyProfile, safetyModeActive, zoom]
  );
  const farZoomReductionActive = useMemo(() =>
    isFarZoomReductionActiveForProfile(
      safetyModeActive,
      zoom,
      largeGraphSafetyProfile
    ),
    [largeGraphSafetyProfile, safetyModeActive, zoom]
  );

  return {
    lowDetailModeActive,
    farZoomReductionActive,
  };
}
