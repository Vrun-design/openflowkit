import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';

export interface OpenCanvasRendererFamilyFlags {
  readonly connectorModelEnabled: boolean;
  readonly nodeLayoutModelEnabled: boolean;
  readonly basicNodesEnabled: boolean;
  readonly freeformNodesEnabled: boolean;
  readonly architectureNodesEnabled: boolean;
  readonly containerNodesEnabled: boolean;
  readonly classEntityNodesEnabled: boolean;
  readonly mindmapJourneyNodesEnabled: boolean;
  readonly sequenceNodesEnabled: boolean;
  readonly wireframeNodesEnabled: boolean;
}

/**
 * Every renderer host reads its family flags from here, so a newly added family
 * cannot reach one host and silently miss another.
 */
export function openCanvasRendererFamilyFlags(): OpenCanvasRendererFamilyFlags {
  return {
    connectorModelEnabled: ROLLOUT_FLAGS.openCanvasConnectorsV1,
    nodeLayoutModelEnabled: ROLLOUT_FLAGS.openCanvasNodeLayoutV1,
    basicNodesEnabled: ROLLOUT_FLAGS.openCanvasBasicNodesV1,
    freeformNodesEnabled: ROLLOUT_FLAGS.openCanvasFreeformNodesV1,
    architectureNodesEnabled: ROLLOUT_FLAGS.openCanvasArchitectureNodesV1,
    containerNodesEnabled: ROLLOUT_FLAGS.openCanvasContainerNodesV1,
    classEntityNodesEnabled: ROLLOUT_FLAGS.openCanvasClassEntityNodesV1,
    mindmapJourneyNodesEnabled: ROLLOUT_FLAGS.openCanvasMindmapJourneyNodesV1,
    sequenceNodesEnabled: ROLLOUT_FLAGS.openCanvasSequenceNodesV1,
    wireframeNodesEnabled: ROLLOUT_FLAGS.openCanvasWireframeNodesV1,
  };
}
