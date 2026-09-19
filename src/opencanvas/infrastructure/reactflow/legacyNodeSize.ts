import { getNumericNodeDimension, resolveNodeSize } from '@/components/nodeHelpers';
import type { FlowNode } from '@/lib/types';
import { isJsonObject, type JsonObject } from '../../domain/document/json';
import type { Size2d } from '../../domain/geometry/types';
import { DEFAULT_NODE_CONTENT_LAYOUT } from '../../domain/node-layout/model';
import { measurePortableText } from '../../domain/text/measurement';

const LABEL_STYLE = { fontSize: 14, fontWeight: 600 as const };
const SUB_LABEL_STYLE = { fontSize: 11, fontWeight: 400 as const };
const SUB_LABEL_GAP = 4;
const { padding } = DEFAULT_NODE_CONTENT_LAYOUT;
const HORIZONTAL_PADDING = padding.left + padding.right;
const VERTICAL_PADDING = padding.top + padding.bottom;

/**
 * Size for a legacy node that states none. React Flow lets such a node grow
 * in the DOM: an unset width fits the label on one line, an unset height fits
 * the label wrapped at the stated width, never below the per-shape minimum.
 * OpenCanvas never mounts the DOM, so it estimates the same growth from the
 * portable text measurement. Both projection directions call this so an
 * unmeasured node round-trips without gaining explicit dimensions.
 */
// ponytail: label + subLabel only; icons and markdown are not measured, so an
// icon node stays at the minimum unless its text alone outgrows it.
export function resolveLegacyNodeSize(node: JsonObject): Size2d | null {
  const minimum = resolveNodeSize(node as unknown as FlowNode);
  if (!(minimum.width > 0 && minimum.height > 0)) return null;
  const data = isJsonObject(node.data) ? node.data : {};
  const label = typeof data.label === 'string' ? data.label.trim() : '';
  if (node.type === 'mermaid_svg' || !label) return minimum;

  const style = isJsonObject(node.style) ? node.style : {};
  const statedWidth = getNumericNodeDimension(data.width)
    ?? getNumericNodeDimension(style.width) ?? getNumericNodeDimension(node.width);
  const statedHeight = getNumericNodeDimension(data.height)
    ?? getNumericNodeDimension(style.height) ?? getNumericNodeDimension(node.height);
  const textWidth = statedWidth !== undefined ? statedWidth - HORIZONTAL_PADDING : undefined;
  const wrap = textWidth !== undefined && textWidth > 0
    ? { maxWidth: textWidth, overflow: 'wrap' as const } : {};

  const labelSize = measurePortableText(label, { ...LABEL_STYLE, ...wrap });
  const subLabel = typeof data.subLabel === 'string' ? data.subLabel.trim() : '';
  const subLabelSize = subLabel ? measurePortableText(subLabel, { ...SUB_LABEL_STYLE, ...wrap }) : null;
  const contentWidth = Math.max(labelSize.width, subLabelSize?.width ?? 0) + HORIZONTAL_PADDING;
  const contentHeight = labelSize.height + (subLabelSize ? SUB_LABEL_GAP + subLabelSize.height : 0)
    + VERTICAL_PADDING;
  return {
    width: statedWidth ?? Math.max(minimum.width, Math.ceil(contentWidth)),
    height: statedHeight ?? Math.max(minimum.height, Math.ceil(contentHeight)),
  };
}
