import { resolveSectionVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveContainerNodePresentation,
  type ContainerNodePresentation,
} from '../../domain/nodes/containerNodePresentation';
import { pixiHexColor, pixiPaintColor, type PixiPaintColor } from './pixiColor';

export interface PixiContainerNodeVisual {
  readonly presentation: ContainerNodePresentation;
  readonly fill: PixiPaintColor;
  readonly stroke: number;
  readonly title: number;
  readonly badgeFill: number;
  readonly badgeText: number;
}

export function projectContainerNodeVisual(node: SceneNode): PixiContainerNodeVisual | null {
  const presentation = resolveContainerNodePresentation(node);
  if (!presentation) return null;
  const colors = resolveSectionVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor,
    presentation.kind === 'group' ? 'violet' : 'blue'
  );
  return {
    presentation,
    fill: pixiPaintColor(colors.bg, 0xf8fafc),
    stroke: pixiHexColor(colors.border, 0xcbd5e1),
    title: pixiHexColor(colors.title, 0x334155),
    badgeFill: pixiHexColor(colors.badgeBg, 0xe2e8f0),
    badgeText: pixiHexColor(colors.badgeText, 0x334155),
  };
}
