import { resolveContainerVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveWireframeNodePresentation,
  type WireframeNodePresentation,
} from '../../domain/nodes/wireframeNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiWireframeNodeVisual {
  readonly presentation: WireframeNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly accentFill: number;
  readonly groundFill: number;
}

export function projectWireframeNodeVisual(node: SceneNode): PixiWireframeNodeVisual | null {
  const presentation = resolveWireframeNodePresentation(node);
  if (!presentation) return null;
  const colors = resolveContainerVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor,
    'slate'
  );
  return {
    presentation,
    fill: pixiHexColor(colors.bg, 0xffffff),
    stroke: pixiHexColor(colors.border, 0xcbd5e1),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x64748b),
    accentFill: pixiHexColor(colors.badgeBg, 0xe2e8f0),
    groundFill: 0xf8fafc,
  };
}
