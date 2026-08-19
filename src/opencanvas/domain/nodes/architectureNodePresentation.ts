import type { SceneNode } from '../document/types';
import {
  optionalPresentationString,
  presentationString,
  safeImageUrl,
} from './nodePresentationValues';

export type ArchitectureNodeDisplay = 'architecture-card' | 'provider-icon';

export type ArchitectureIconSource =
  | { readonly kind: 'provider'; readonly packId: string; readonly shapeId: string }
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'asset'; readonly assetId: string }
  | { readonly kind: 'builtin'; readonly name: string };

export interface ArchitectureNodePresentation {
  readonly kind: 'architecture' | 'provider-icon';
  readonly display: ArchitectureNodeDisplay;
  readonly label: string;
  readonly provider: string;
  readonly providerLabel: string;
  readonly resourceType: string;
  readonly metadata: readonly string[];
  readonly colorKey: string;
  readonly colorMode: 'subtle' | 'filled';
  readonly customColor?: string;
  readonly icon: ArchitectureIconSource;
}

function resolveIconSource(node: SceneNode, provider: string): ArchitectureIconSource {
  const customUrl = safeImageUrl(node.content.customIconUrl);
  const assetId = optionalPresentationString(node.content.iconAssetId);
  const packId = optionalPresentationString(node.content.archIconPackId);
  const shapeId = optionalPresentationString(node.content.archIconShapeId);
  const builtIn = optionalPresentationString(node.content.icon);
  if (provider === 'custom' && customUrl) return { kind: 'url', url: customUrl };
  if (packId && shapeId) return { kind: 'provider', packId, shapeId };
  if (customUrl) return { kind: 'url', url: customUrl };
  if (assetId) return { kind: 'asset', assetId };
  return {
    kind: 'builtin',
    name: builtIn ?? presentationString(node.content.archResourceType, 'service'),
  };
}

function metadata(node: SceneNode): readonly string[] {
  const values = [node.content.archEnvironment, node.content.archZone, node.content.archTrustDomain]
    .map(optionalPresentationString)
    .filter((value): value is string => value !== undefined);
  return [...new Set(values)];
}

export function resolveArchitectureNodePresentation(
  node: SceneNode
): ArchitectureNodePresentation | null {
  const iconOnly = node.content.assetPresentation === 'icon';
  if (node.kind !== 'architecture' && !iconOnly) return null;
  const provider = presentationString(
    node.content.archProvider,
    presentationString(node.content.assetProvider, 'custom')
  );
  const customColor = optionalPresentationString(node.content.customColor);
  const display: ArchitectureNodeDisplay = iconOnly ? 'provider-icon' : 'architecture-card';
  return {
    kind: iconOnly ? 'provider-icon' : 'architecture',
    display,
    label: presentationString(
      node.content.label,
      display === 'provider-icon' ? '' : 'Architecture Node'
    ),
    provider,
    providerLabel: presentationString(
      node.content.archProviderLabel,
      provider === 'custom' ? 'Custom' : provider.toUpperCase()
    ),
    resourceType: presentationString(node.content.archResourceType, 'service'),
    metadata: metadata(node),
    colorKey: presentationString(node.content.color, 'white'),
    colorMode: node.content.colorMode === 'filled' ? 'filled' : 'subtle',
    ...(customColor ? { customColor } : {}),
    icon: resolveIconSource(node, provider),
  };
}
