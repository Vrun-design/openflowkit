import { resolveNodeVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveMindmapNodePresentation,
  type MindmapNodePresentation,
} from '../../domain/nodes/mindmapNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiMindmapNodeVisual {
  readonly presentation: MindmapNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly accent: number;
}

export function projectMindmapNodeVisual(node: SceneNode): PixiMindmapNodeVisual | null {
  const presentation = resolveMindmapNodePresentation(node);
  if (!presentation) return null;
  const colors = resolveNodeVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor
  );
  return {
    presentation,
    fill: pixiHexColor(colors.bg, 0xffffff),
    stroke: pixiHexColor(colors.border, 0xcbd5e1),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x64748b),
    accent: pixiHexColor(colors.iconColor, 0x475569),
  };
}
