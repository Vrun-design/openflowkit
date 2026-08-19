import type { ConnectorRouteIntent, SceneAnchor, SceneLayer } from './types';

export const DEFAULT_SCENE_LAYER_ID = 'default';

export function createDefaultSceneLayer(): SceneLayer {
  return { id: DEFAULT_SCENE_LAYER_ID, name: 'Default', visible: true, locked: false };
}

export function createCenterAnchor(): SceneAnchor {
  return { kind: 'center' };
}

export function createDefaultRouteIntent(): ConnectorRouteIntent {
  return { kind: 'direct', ownership: 'automatic' };
}
