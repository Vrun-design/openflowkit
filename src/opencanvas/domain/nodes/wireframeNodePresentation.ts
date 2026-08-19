import type { SceneNode } from '../document/types';
import { optionalPresentationString, presentationString } from './nodePresentationValues';

export const BROWSER_WIREFRAME_VARIANTS = [
  'default',
  'landing',
  'dashboard',
  'form',
  'modal',
  'cookie',
  'pricing',
  'analytics',
  'settings',
  'docs',
  'checkout',
  'kanban',
] as const;

export const MOBILE_WIREFRAME_VARIANTS = [
  'default',
  'login',
  'social',
  'chat',
  'product',
  'list',
  'profile',
  'wallet',
  'calendar',
  'maps',
  'music',
  'fitness',
] as const;

export type BrowserWireframeVariant = (typeof BROWSER_WIREFRAME_VARIANTS)[number];
export type MobileWireframeVariant = (typeof MOBILE_WIREFRAME_VARIANTS)[number];

interface WireframePresentationBase {
  readonly label: string;
  readonly colorKey: string;
  readonly colorMode: 'subtle' | 'filled';
  readonly customColor?: string;
  readonly imageUrl?: string;
  readonly imageAssetId?: string;
}

export type WireframeNodePresentation =
  | (WireframePresentationBase & {
      readonly kind: 'browser';
      readonly variant: BrowserWireframeVariant;
      readonly secure: boolean;
    })
  | (WireframePresentationBase & {
      readonly kind: 'mobile';
      readonly variant: MobileWireframeVariant;
    });

function variant<T extends string>(value: unknown, values: readonly T[]): T {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : values[0];
}

export function resolveWireframeNodePresentation(
  node: SceneNode
): WireframeNodePresentation | null {
  if (node.kind !== 'browser' && node.kind !== 'mobile') return null;
  const customColor = optionalPresentationString(node.content.customColor);
  const imageUrl = optionalPresentationString(node.content.imageUrl);
  const imageAssetId = optionalPresentationString(node.content.imageAssetId);
  const common = {
    label: presentationString(node.content.label, node.kind === 'browser' ? 'Page' : 'Screen'),
    colorKey: presentationString(node.content.color, 'slate'),
    colorMode: node.content.colorMode === 'filled' ? ('filled' as const) : ('subtle' as const),
    ...(customColor ? { customColor } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageAssetId ? { imageAssetId } : {}),
  };
  if (node.kind === 'browser') {
    return {
      ...common,
      kind: 'browser',
      variant: variant(node.content.variant, BROWSER_WIREFRAME_VARIANTS),
      secure: node.content.icon === 'lock',
    };
  }
  return {
    ...common,
    kind: 'mobile',
    variant: variant(node.content.variant, MOBILE_WIREFRAME_VARIANTS),
  };
}
