import { describe, expect, it } from 'vitest';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import type { SceneConnector, SceneNode, ScenePage } from '../../domain/document/types';
import { mapFocus } from './mapFocus';

const node = (id: string, parentId: string | null = null): SceneNode => ({ id, parentId } as unknown as SceneNode);
const arrow = (id: string, from: string, to: string): SceneConnector =>
  ({ id, source: { nodeId: from }, target: { nodeId: to } } as unknown as SceneConnector);
// web -> api, api -> db; Market is open and holds gate and cart; gate -> api; web is not tied to Market.
const page = {
  id: 'map', name: 'Map', diagramKind: 'architecture', layers: [createDefaultSceneLayer()], metadata: {}, extensions: {},
  nodes: [node('web'), node('api'), node('db'), node('market'), node('gate', 'market'), node('cart', 'market'), node('lone')],
  connectors: [arrow('web>api', 'web', 'api'), arrow('api>db', 'api', 'db'), arrow('gate>api', 'gate', 'api'), arrow('gate>cart', 'gate', 'cart')],
} as unknown as ScenePage;

describe('mapFocus', () => {
  it('a box keeps itself, its arrows and the boxes at their far ends', () => {
    expect(mapFocus(page, { nodeId: 'web' })).toEqual({ nodeIds: ['api', 'web'], connectorIds: ['web>api'] });
    expect(mapFocus(page, { nodeId: 'api' })).toEqual({ nodeIds: ['api', 'db', 'gate', 'web'], connectorIds: ['api>db', 'gate>api', 'web>api'] });
  });

  it('an open box talks through the boxes drawn inside it', () => {
    // The box stays whole (gate, cart), and the arrow leaving it brings the far end (api).
    expect(mapFocus(page, { nodeId: 'market' })).toEqual({
      nodeIds: ['api', 'cart', 'gate', 'market'], connectorIds: ['gate>api', 'gate>cart'],
    });
    expect(mapFocus(page, { nodeId: 'gate' })).toEqual({ nodeIds: ['api', 'cart', 'gate'], connectorIds: ['gate>api', 'gate>cart'] });
  });

  it('an open box with no arrows keeps what it holds', () => {
    const quiet = { ...page, connectors: [] } as unknown as ScenePage;
    expect(mapFocus(quiet, { nodeId: 'market' })).toEqual({ nodeIds: ['cart', 'gate', 'market'], connectorIds: [] });
  });

  it('a box with no arrows is focused alone', () => {
    expect(mapFocus(page, { nodeId: 'lone' })).toEqual({ nodeIds: ['lone'], connectorIds: [] });
  });

  it('an arrow keeps itself and its two ends', () => {
    expect(mapFocus(page, { connectorId: 'api>db' })).toEqual({ nodeIds: ['api', 'db'], connectorIds: ['api>db'] });
  });

  it('nothing selected, or an id the map does not draw, is no focus', () => {
    expect(mapFocus(page, {})).toBeNull();
    expect(mapFocus(page, { nodeId: null, connectorId: null })).toBeNull();
    expect(mapFocus(page, { nodeId: 'gone' })).toBeNull();
    expect(mapFocus(page, { connectorId: 'gone' })).toBeNull();
  });

  it('is deterministic whatever order the page lists things in', () => {
    const shuffled = { ...page, nodes: [...page.nodes].reverse(), connectors: [...page.connectors].reverse() } as ScenePage;
    expect(mapFocus(shuffled, { nodeId: 'api' })).toEqual(mapFocus(page, { nodeId: 'api' }));
  });
});
