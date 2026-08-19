import { resolveNodeVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveArchitectureNodePresentation,
  type ArchitectureNodePresentation,
} from '../../domain/nodes/architectureNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiArchitectureNodeVisual {
  readonly presentation: ArchitectureNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly iconFill: number;
  readonly iconStroke: number;
}

export function projectArchitectureNodeVisual(node: SceneNode): PixiArchitectureNodeVisual | null {
  const presentation = resolveArchitectureNodePresentation(node);
  if (!presentation) return null;
  const colors = resolveNodeVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor
  );
  return {
    presentation,
    fill: pixiHexColor(colors.bg, 0xf8fafc),
    stroke: pixiHexColor(colors.border, 0xcbd5e1),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x475569),
    iconFill: pixiHexColor(colors.iconBg, 0xf1f5f9),
    iconStroke: pixiHexColor(colors.iconColor, 0x475569),
  };
}
