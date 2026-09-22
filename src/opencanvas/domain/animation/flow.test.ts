import { describe, expect, it } from 'vitest';
import type { SceneDocumentV1 } from '../document/types';
import { NOTE_MS, STEP_MS } from './frame';
import { flattenTimelineSteps, flowToTimeline, resolveFlowStep } from './flow';
import type { ArchFlow, ArchModel } from '../../../dsl/model/types';
import { animEdge, animNode, animPage } from './testFixtures';

const MODEL: ArchModel = { elements: [], relations: [], views: [], flows: [] };

const FLOW: ArchFlow = {
  id: 'checkout',
  name: 'Checkout',
  steps: [
    { id: 's0', kind: 'intro', label: 'Customer opens the cart', tags: [] },
    { id: 's1', kind: 'message', from: 'customer', to: 'shop.web', label: 'opens cart', tags: [] },
    {
      id: 's2', kind: 'alternate', label: 'paid', tags: [],
      branches: [
        { steps: [{ id: 's2a', kind: 'message', from: 'shop.web', to: 'shop.api', label: 'POST', tags: [] }] },
        { steps: [{ id: 's2b', kind: 'process', label: 'Retry', tags: [] }] },
      ],
    },
    { id: 's3', kind: 'goto', goto: 'Fulfilment', tags: [] },
  ],
};

function document(): SceneDocumentV1 {
  const page = animPage(
    [
      animNode('n-customer', 0, 0, { elementId: 'customer' }),
      animNode('n-web', 0, 120, { elementId: 'shop.web' }),
      animNode('n-api', 0, 240, { elementId: 'shop.api' }),
    ],
    [{ ...animEdge('rel:customer->shop.web', 'n-customer', 'n-web'), metadata: {} }],
  );
  return {
    format: 'openflowkit.scene', schemaVersion: 1, id: 'doc', name: 'Doc',
    createdAt: '', updatedAt: '', pages: [page], metadata: {}, extensions: {},
  };
}

describe('flow timeline', () => {
  it('flattens branch steps with depth', () => {
    const flat = flattenTimelineSteps(FLOW);
    // intro, message, alternate, branch message, branch process, goto.
    expect(flat.map(({ step }) => step.id)).toEqual(['s0', 's1', 's2', 's2a', 's2b', 's3']);
    expect(flat[3]?.depth).toBe(1);
    expect(flat[0]?.depth).toBe(0);
  });

  it('resolves a message step to its nodes and relation connector', () => {
    const doc = document();
    const resolved = resolveFlowStep({ from: 'customer', to: 'shop.web' }, doc, doc.pages[0]!);
    expect(resolved.nodeIds).toEqual(['n-customer', 'n-web']);
    expect(resolved.connectorIds).toEqual(['rel:customer->shop.web']);
    expect(resolved.targetPage?.id).toBe('page');
  });

  it('resolves nothing for unknown elements and empty steps', () => {
    const doc = document();
    expect(resolveFlowStep({ from: 'ghost', to: 'shop.web' }, doc, doc.pages[0]!).nodeIds).toEqual(['n-web']);
    expect(resolveFlowStep({ from: 'ghost', to: 'phantom' }, doc, doc.pages[0]!).nodeIds).toEqual([]);
    expect(resolveFlowStep({}, doc, doc.pages[0]!)).toEqual({ nodeIds: [], connectorIds: [], targetPage: null });
  });

  it('builds a walkthrough timeline with long note holds and cameras', () => {
    const doc = document();
    const timeline = flowToTimeline(FLOW, MODEL, doc, doc.pages[0]!);
    expect(timeline.preset).toBe('walkthrough');
    expect(timeline.steps).toHaveLength(6);
    expect(timeline.steps[0]?.note).toBe('Customer opens the cart');
    expect(timeline.steps[1]?.connectorIds).toEqual(['rel:customer->shop.web']);
    expect(timeline.steps[0]?.camera).toBeUndefined();
    expect(timeline.steps[1]?.camera).toMatchObject({ x: 0, y: 0 });
    expect(timeline.durationMs).toBe(5 * STEP_MS + NOTE_MS);
  });
});
