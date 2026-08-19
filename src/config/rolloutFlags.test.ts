import { describe, expect, it } from 'vitest';
import { ROLLOUT_FLAGS } from './rolloutFlags';

describe('OpenCanvas rollout flags', () => {
  it('keeps the canonical document path disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasDocumentV1).toBe(false);
  });

  it('keeps the PixiJS renderer spike disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasRendererV1).toBe(false);
  });

  it('keeps canonical connector rendering disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasConnectorsV1).toBe(false);
  });

  it('keeps canonical node content layout disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasNodeLayoutV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasOrganizationV1).toBe(false);
  });

  it('keeps basic OpenCanvas node families disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasBasicNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasFreeformNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasArchitectureNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasContainerNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasClassEntityNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasMindmapJourneyNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasSequenceNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasWireframeNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasA11yV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasCanonicalCollaboration).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasAiPreviewV1).toBe(false);
  });
});
