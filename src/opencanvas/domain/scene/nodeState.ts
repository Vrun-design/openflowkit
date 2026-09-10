import type { SceneNode, ScenePage } from '../document/types';

export interface NodeEffectiveState {
  readonly visible: boolean;
  readonly locked: boolean;
}

/**
 * A node is shown and editable only when its layer allows it and no section
 * above it is hidden/locked. Both the renderers and the pointer flow read
 * this so a hidden section never draws or catches a click on any canvas.
 */
export function buildNodeStateMap(page: ScenePage): Map<string, NodeEffectiveState> {
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const states = new Map<string, NodeEffectiveState>();

  const resolve = (node: SceneNode, depth: number): NodeEffectiveState => {
    const cached = states.get(node.id);
    if (cached) return cached;
    const layer = layerById.get(node.layerId);
    let visible = layer?.visible === true && node.content.sectionHidden !== true;
    let locked = layer?.locked !== false || node.content.sectionLocked === true;
    const parent = node.parentId !== null ? nodesById.get(node.parentId) : undefined;
    // Depth guard: a parent cycle is invalid data, not a reason to hang.
    if (parent && depth < page.nodes.length) {
      const parentState = resolve(parent, depth + 1);
      visible = visible && parentState.visible;
      locked = locked || parentState.locked;
    }
    const state = { visible, locked };
    states.set(node.id, state);
    return state;
  };

  for (const node of page.nodes) resolve(node, 0);
  return states;
}

export function nodeEffectiveState(page: ScenePage, nodeId: string): NodeEffectiveState {
  return buildNodeStateMap(page).get(nodeId) ?? { visible: false, locked: true };
}
