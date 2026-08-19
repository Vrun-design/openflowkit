import { resolveNodeVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveBasicNodePresentation,
  type BasicNodeKind,
  type BasicNodeShape,
} from '../../domain/nodes/basicNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiBasicNodeVisual {
  readonly kind: BasicNodeKind;
  readonly shape: BasicNodeShape;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly iconFill: number;
  readonly iconStroke: number;
}

const visualCache = new Map<string, PixiBasicNodeVisual>();
const MAX_VISUAL_CACHE_ENTRIES = 64;

export function projectBasicNodeVisual(node: SceneNode): PixiBasicNodeVisual | null {
  const presentation = resolveBasicNodePresentation(node);
  if (!presentation) return null;
  const cacheKey = [
    presentation.kind,
    presentation.shape,
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor ?? '',
  ].join(':');
  const cached = visualCache.get(cacheKey);
  if (cached) return cached;
  const colors = resolveNodeVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor
  );
  const visual = {
    kind: presentation.kind,
    shape: presentation.shape,
    fill: pixiHexColor(colors.bg, 0xffffff),
    stroke: pixiHexColor(colors.border, 0xcbd5e1),
    text: pixiHexColor(colors.text, 0x1e293b),
    subText: pixiHexColor(colors.subText, 0x64748b),
    iconFill: pixiHexColor(colors.iconBg, 0xfef4f0),
    iconStroke: pixiHexColor(colors.iconColor, 0xe95420),
  };
  if (visualCache.size >= MAX_VISUAL_CACHE_ENTRIES) visualCache.clear();
  visualCache.set(cacheKey, visual);
  return visual;
}
