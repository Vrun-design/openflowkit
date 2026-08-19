import { isJsonObject } from '../document/json';
import type { SceneNode } from '../document/types';
import { resolveNodeContentLayout } from '../node-layout/model';
import { measurePortableText } from '../text/measurement';
import {
  NODE_SIZING_POLICY_VERSION,
  type NodeSizingMode,
  type NodeSizingPolicyV1,
} from './types';

const MODES = new Set<NodeSizingMode>(['auto', 'fixed', 'responsive']);
const OVERFLOWS = new Set(['clip', 'ellipsis', 'visible', 'wrap']);

export const DEFAULT_NODE_SIZING_POLICY: NodeSizingPolicyV1 = {
  version: NODE_SIZING_POLICY_VERSION,
  mode: 'fixed',
  minSize: { width: 24, height: 24 },
  maxSize: { width: 1_600, height: 1_200 },
  overflow: 'visible',
  clipContent: false,
  maxLines: 4,
};

export interface NodeSizingValidationResult {
  readonly success: boolean;
  readonly value: NodeSizingPolicyV1;
  readonly issues: readonly string[];
}

function readSize(value: unknown, fallback: NodeSizingPolicyV1['minSize'], path: string, issues: string[]) {
  if (!isJsonObject(value)
    || typeof value.width !== 'number' || !Number.isFinite(value.width) || value.width <= 0
    || typeof value.height !== 'number' || !Number.isFinite(value.height) || value.height <= 0) {
    issues.push(`${path} must have positive finite width and height.`);
    return fallback;
  }
  return { width: value.width, height: value.height };
}

export function validateNodeSizingPolicy(value: unknown): NodeSizingValidationResult {
  if (value === undefined) return { success: true, value: DEFAULT_NODE_SIZING_POLICY, issues: [] };
  if (!isJsonObject(value)) {
    return { success: false, value: DEFAULT_NODE_SIZING_POLICY, issues: ['sizingPolicy must be an object.'] };
  }
  const issues: string[] = [];
  if (value.version !== NODE_SIZING_POLICY_VERSION) issues.push('version must be 1.');
  const mode = MODES.has(value.mode as NodeSizingMode)
    ? value.mode as NodeSizingMode : DEFAULT_NODE_SIZING_POLICY.mode;
  if (mode !== value.mode) issues.push('mode is unsupported.');
  const minSize = readSize(value.minSize, DEFAULT_NODE_SIZING_POLICY.minSize, 'minSize', issues);
  const maxSize = readSize(value.maxSize, DEFAULT_NODE_SIZING_POLICY.maxSize, 'maxSize', issues);
  if (maxSize.width < minSize.width || maxSize.height < minSize.height) {
    issues.push('maxSize must be greater than or equal to minSize.');
  }
  const overflow = OVERFLOWS.has(String(value.overflow))
    ? value.overflow as NodeSizingPolicyV1['overflow'] : DEFAULT_NODE_SIZING_POLICY.overflow;
  if (overflow !== value.overflow) issues.push('overflow is unsupported.');
  const clipContent = typeof value.clipContent === 'boolean'
    ? value.clipContent : DEFAULT_NODE_SIZING_POLICY.clipContent;
  if (clipContent !== value.clipContent) issues.push('clipContent must be boolean.');
  const maxLines = typeof value.maxLines === 'number' && Number.isInteger(value.maxLines)
    && value.maxLines >= 1 && value.maxLines <= 100
    ? value.maxLines : DEFAULT_NODE_SIZING_POLICY.maxLines;
  if (maxLines !== value.maxLines) issues.push('maxLines must be an integer from 1 to 100.');
  return {
    success: issues.length === 0,
    value: { version: 1, mode, minSize, maxSize, overflow, clipContent, maxLines },
    issues,
  };
}

export function resolveNodeSizingPolicy(node: SceneNode): NodeSizingPolicyV1 {
  return validateNodeSizingPolicy(node.content.sizingPolicy).value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function resolveSizedNode(node: SceneNode, policy: NodeSizingPolicyV1): SceneNode {
  const validation = validateNodeSizingPolicy(policy);
  if (!validation.success) throw new Error(`Invalid node sizing policy: ${validation.issues.join(' ')}`);
  const value = validation.value;
  const layout = resolveNodeContentLayout(node.content, true);
  const label = typeof node.content.label === 'string' ? node.content.label : node.id;
  const subLabel = typeof node.content.subLabel === 'string' ? node.content.subLabel : '';
  const hasIcon = (typeof node.content.icon === 'string' && node.content.icon !== 'none')
    || typeof node.content.archIconShapeId === 'string';
  const horizontalIcon = layout.iconPlacement === 'left' || layout.iconPlacement === 'right';
  const iconWidth = hasIcon ? 28 * layout.iconScale : 0;
  const iconHeight = hasIcon ? 28 * layout.iconScale : 0;
  const horizontalPadding = layout.padding.left + layout.padding.right;
  const verticalPadding = layout.padding.top + layout.padding.bottom;
  const availableTextWidth = Math.max(1,
    value.maxSize.width - horizontalPadding - (horizontalIcon ? iconWidth + layout.gap : 0));
  const textStyle = value.mode === 'responsive' ? {
    fontSize: 14, fontWeight: 600 as const, maxWidth: availableTextWidth,
    maxLines: value.maxLines, overflow: value.overflow,
  } : { fontSize: 14, fontWeight: 600 as const };
  const labelSize = measurePortableText(label, textStyle);
  const subLabelSize = subLabel ? measurePortableText(subLabel, {
    ...textStyle, fontSize: 11, fontWeight: 400,
  }) : null;
  const textWidth = Math.max(labelSize.width, subLabelSize?.width ?? 0);
  const textHeight = labelSize.height + (subLabelSize ? Math.min(4, layout.gap) + subLabelSize.height : 0);
  const intrinsicWidth = horizontalPadding + (hasIcon && horizontalIcon
    ? iconWidth + layout.gap + textWidth : Math.max(iconWidth, textWidth));
  const intrinsicHeight = verticalPadding + (hasIcon && !horizontalIcon && layout.iconPlacement !== 'free'
    ? iconHeight + layout.gap + textHeight : Math.max(iconHeight, textHeight));
  const size = value.mode === 'fixed' ? {
    width: clamp(node.size.width, value.minSize.width, value.maxSize.width),
    height: clamp(node.size.height, value.minSize.height, value.maxSize.height),
  } : {
    width: clamp(intrinsicWidth, value.minSize.width, value.maxSize.width),
    height: clamp(intrinsicHeight, value.minSize.height, value.maxSize.height),
  };
  return {
    ...node,
    size,
    content: {
      ...node.content,
      sizingPolicy: {
        version: value.version,
        mode: value.mode,
        minSize: { width: value.minSize.width, height: value.minSize.height },
        maxSize: { width: value.maxSize.width, height: value.maxSize.height },
        overflow: value.overflow,
        clipContent: value.clipContent,
        maxLines: value.maxLines,
      },
    },
  };
}
