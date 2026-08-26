import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    openCanvasConnectorsV1: true, openCanvasNodeLayoutV1: false,
    openCanvasBasicNodesV1: true, openCanvasFreeformNodesV1: false,
    openCanvasArchitectureNodesV1: true, openCanvasContainerNodesV1: false,
    openCanvasClassEntityNodesV1: true, openCanvasMindmapJourneyNodesV1: false,
    openCanvasSequenceNodesV1: true, openCanvasWireframeNodesV1: false,
  },
}));

import { openCanvasRendererFamilyFlags } from './rendererFamilyFlags';

describe('OpenCanvas renderer family flags', () => {
  it('maps every family flag without dropping or inverting one', () => {
    expect(openCanvasRendererFamilyFlags()).toEqual({
      connectorModelEnabled: true, nodeLayoutModelEnabled: false,
      basicNodesEnabled: true, freeformNodesEnabled: false,
      architectureNodesEnabled: true, containerNodesEnabled: false,
      classEntityNodesEnabled: true, mindmapJourneyNodesEnabled: false,
      sequenceNodesEnabled: true, wireframeNodesEnabled: false,
    });
  });
});
