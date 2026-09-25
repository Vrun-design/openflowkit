import type { ScenePage, SceneNode } from '../../domain/document/types';
import { resolveBasicNodePresentation } from '../../domain/nodes/basicNodePresentation';
import { FRAME_PRESET_SPECS, framePresetOf } from '../../domain/nodes/framePreset';
import { describeWidget, resolveWidgetPresentation } from '../../domain/nodes/widgetNodePresentation';

export type SemanticSceneItem =
  | {
      readonly kind: 'node';
      readonly id: string;
      readonly label: string;
      readonly description: string;
    }
  | {
      readonly kind: 'connector';
      readonly id: string;
      readonly label: string;
      readonly description: string;
    };

export const SEMANTIC_SCENE_PAGE_SIZE = 100;

function nodeLabel(page: ScenePage, nodeId: string): string {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  return typeof node?.content.label === 'string' ? node.content.label : nodeId;
}

/** Screen-reader name: a library shape says its shape, not its renderer kind. */
function nodeDescription(node: SceneNode, locked: boolean): string {
  const basic = resolveBasicNodePresentation(node);
  const widget = resolveWidgetPresentation(node);
  const preset = framePresetOf(node);
  const name = basic ? `${basic.shape} shape`
    : widget ? describeWidget(widget)
      : preset ? `${FRAME_PRESET_SPECS[preset].name} frame` : `${node.kind} node`;
  return locked ? `${name}, locked` : name;
}

export function buildSemanticSceneItems(page: ScenePage): readonly SemanticSceneItem[] {
  const visibleLayerIds = new Set(
    page.layers.filter((layer) => layer.visible).map((layer) => layer.id)
  );
  const visibleNodes = page.nodes.filter((node) => visibleLayerIds.has(node.layerId));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const nodes: SemanticSceneItem[] = visibleNodes.map((node) => {
    const label = typeof node.content.label === 'string' ? node.content.label : node.id;
    return {
      kind: 'node',
      id: node.id,
      label,
      description: nodeDescription(
        node, Boolean(page.layers.find((layer) => layer.id === node.layerId)?.locked)
      ),
    };
  });
  const connectors: SemanticSceneItem[] = page.connectors
    .filter((connector) => (
      visibleNodeIds.has(connector.source.nodeId) && visibleNodeIds.has(connector.target.nodeId)
    ))
    .map((connector) => {
      const label = connector.labels[0]?.text
        ?? `${nodeLabel(page, connector.source.nodeId)} to ${nodeLabel(page, connector.target.nodeId)}`;
      return {
        kind: 'connector',
        id: connector.id,
        label,
        description: `connector from ${nodeLabel(page, connector.source.nodeId)} to ${
          nodeLabel(page, connector.target.nodeId)
        }`,
      };
    });
  return [...nodes, ...connectors];
}

export function semanticScenePageForItem(
  items: readonly SemanticSceneItem[],
  kind: SemanticSceneItem['kind'],
  id: string
): number | null {
  const index = items.findIndex((item) => item.kind === kind && item.id === id);
  return index < 0 ? null : Math.floor(index / SEMANTIC_SCENE_PAGE_SIZE);
}
