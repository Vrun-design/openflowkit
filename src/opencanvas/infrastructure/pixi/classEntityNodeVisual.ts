import { resolveContainerVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveClassEntityNodePresentation,
  type ClassEntityNodePresentation,
} from '../../domain/nodes/classEntityNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiClassEntityNodeVisual {
  readonly presentation: ClassEntityNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly headerFill: number;
  readonly alternateFill: number;
}

export function projectClassEntityNodeVisual(node: SceneNode): PixiClassEntityNodeVisual | null {
  const presentation = resolveClassEntityNodePresentation(node);
  if (!presentation) return null;
  const colors = resolveContainerVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor,
    'slate'
  );
  return {
    presentation,
    fill: pixiHexColor(colors.bg, 0xf8fafc),
    stroke: pixiHexColor(colors.border, 0x94a3b8),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x475569),
    headerFill: pixiHexColor(colors.accentBg, 0xe2e8f0),
    alternateFill: pixiHexColor(colors.hoverBg, 0xf1f5f9),
  };
}
