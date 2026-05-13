import { getIconAssetNodeMinSize } from '@/components/nodeHelpers';
import {
  SECTION_CONTENT_PADDING_TOP,
  SECTION_MIN_HEIGHT,
  SECTION_MIN_WIDTH,
  SECTION_PADDING_BOTTOM,
  SECTION_PADDING_X,
} from '@/hooks/node-operations/sectionBounds';
import type { FlowNode } from '@/lib/types';
import { normalizeLayoutInputsForDeterminism } from './determinism';
import type { FlowNodeWithMeasuredDimensions, LayoutOptions } from './types';

type EstimateNodeSize = (
  node: FlowNode,
  nodeMinWidth: number,
  nodeMinHeight: number
) => { width: number; height: number };

function getFallbackNodeSize(
  node: FlowNode,
  nodeMinWidth: number,
  nodeMinHeight: number,
  estimateNodeSize: EstimateNodeSize
): { width: number; height: number } {
  const measured = node as FlowNodeWithMeasuredDimensions;
  if (measured.measured?.width && measured.measured?.height) {
    return {
      width: measured.measured.width,
      height: measured.measured.height,
    };
  }

  if (node.data?.assetPresentation === 'icon') {
    const minSize = getIconAssetNodeMinSize(Boolean(node.data?.label?.trim()));
    return { width: minSize.minWidth, height: minSize.minHeight };
  }

  return estimateNodeSize(node, nodeMinWidth, nodeMinHeight);
}

function getFallbackSpacing(options: LayoutOptions): { primary: number; secondary: number } {
  const isImport = options.source === 'import';
  const primaryBase = isImport ? 36 : 56;
  const secondaryBase = isImport ? 52 : 84;

  switch (options.contentDensity) {
    case 'compact':
      return { primary: primaryBase - 8, secondary: secondaryBase - 10 };
    case 'verbose':
      return { primary: primaryBase + 10, secondary: secondaryBase + 14 };
    default:
      return { primary: primaryBase, secondary: secondaryBase };
  }
}

export function applyRecursiveFallbackLayout(
  nodes: FlowNode[],
  options: LayoutOptions,
  nodeMinWidth: number,
  nodeMinHeight: number,
  estimateNodeSize: EstimateNodeSize
): FlowNode[] {
  const { topLevelNodes, childrenByParent } = normalizeLayoutInputsForDeterminism(nodes, []);
  const positionedNodes = new Map<string, FlowNode>();
  const isHorizontal = options.direction === 'LR' || options.direction === 'RL';
  const spacing = getFallbackSpacing(options);

  function layoutNode(
    node: FlowNode,
    origin: { x: number; y: number }
  ): { width: number; height: number } {
    const directChildren = childrenByParent.get(node.id) ?? [];
    const hasChildren = directChildren.length > 0;
    const nextNode: FlowNode = {
      ...node,
      position: origin,
    };

    if (!hasChildren) {
      positionedNodes.set(node.id, nextNode);
      return getFallbackNodeSize(node, nodeMinWidth, nodeMinHeight, estimateNodeSize);
    }

    let cursorX = SECTION_PADDING_X;
    let cursorY = SECTION_CONTENT_PADDING_TOP;
    let maxChildRight = cursorX;
    let maxChildBottom = cursorY;

    for (const child of directChildren) {
      const childBounds = layoutNode(child, { x: cursorX, y: cursorY });
      maxChildRight = Math.max(maxChildRight, cursorX + childBounds.width);
      maxChildBottom = Math.max(maxChildBottom, cursorY + childBounds.height);

      if (isHorizontal) {
        cursorX += childBounds.width + spacing.primary;
      } else {
        cursorY += childBounds.height + spacing.primary;
      }
    }

    const width = Math.max(maxChildRight + SECTION_PADDING_X, SECTION_MIN_WIDTH);
    const height = Math.max(maxChildBottom + SECTION_PADDING_BOTTOM, SECTION_MIN_HEIGHT);

    positionedNodes.set(node.id, {
      ...nextNode,
      style:
        node.type === 'group' || node.type === 'section' || node.type === 'container'
          ? {
              ...node.style,
              width,
              height,
            }
          : node.style,
    });

    return { width, height };
  }

  let cursorX = 0;
  let cursorY = 0;
  for (const node of topLevelNodes) {
    const laidOutSize = layoutNode(node, { x: cursorX, y: cursorY });
    if (isHorizontal) {
      cursorX += laidOutSize.width + spacing.secondary;
    } else {
      cursorY += laidOutSize.height + spacing.secondary;
    }
  }

  return nodes.map((node) => positionedNodes.get(node.id) ?? node);
}
