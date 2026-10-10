import type { SceneNode } from '../document/types';
import { measurePortableText } from '../text/measurement';
import { resolveArchitectureNodePresentation } from './architectureNodePresentation';
import type { NodeStyle } from './nodeStyle';

/** Shared card text geometry; full descriptions remain in the model inspector. */
export function architectureCardLayout(
  node: SceneNode,
  style: Pick<NodeStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'textPadding'>
) {
  const presentation = resolveArchitectureNodePresentation(node)!;
  const width = Math.max(1, node.size.width - style.textPadding * 2);
  const titleY = 31 + style.textPadding;
  const title = measurePortableText(presentation.label, {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.fontSize * style.lineHeight,
    maxWidth: width,
    maxLines: 2,
    overflow: 'wrap',
  });
  const detailY = titleY + title.height + 8;
  const detail = measurePortableText(presentation.metadata.join(' · '), {
    fontSize: 10,
    fontWeight: 500,
    lineHeight: 12,
    maxWidth: Math.max(1, node.size.width - 24),
    maxLines: Math.max(1, Math.min(2, Math.floor((node.size.height - detailY - 12) / 12))),
    overflow: 'wrap',
  });
  // The technology takes what the element type leaves (at least 40% of the header); the type gets the rest.
  const headerWidth = Math.max(2, node.size.width - 64);
  const typeWidth = measurePortableText(presentation.providerLabel, { fontSize: 10, fontWeight: 700, overflow: 'visible' }).width;
  const resource = measurePortableText(presentation.resourceType, {
    fontSize: 10,
    fontWeight: 600,
    maxWidth: Math.max(headerWidth * 0.4, headerWidth - typeWidth),
    overflow: 'ellipsis',
  });
  const provider = measurePortableText(presentation.providerLabel, {
    fontSize: 10,
    fontWeight: 700,
    maxWidth: Math.max(1, headerWidth - resource.width),
    overflow: 'ellipsis',
  });
  return { title, detail, provider, resource, titleX: style.textPadding, titleY, detailY };
}
