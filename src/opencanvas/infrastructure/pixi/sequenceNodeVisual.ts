import { resolveAnnotationVisualStyle, resolveContainerVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveSequenceNodePresentation,
  type SequenceNodePresentation,
} from '../../domain/nodes/sequenceNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiSequenceNodeVisual {
  readonly presentation: SequenceNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly accentFill: number;
}

export function projectSequenceNodeVisual(node: SceneNode): PixiSequenceNodeVisual | null {
  const presentation = resolveSequenceNodePresentation(node);
  if (!presentation) return null;
  if (presentation.kind === 'sequence_note') {
    const colors = resolveAnnotationVisualStyle('yellow', 'subtle');
    return {
      presentation,
      fill: pixiHexColor(colors.containerBg, 0xfef9c3),
      stroke: pixiHexColor(colors.containerBorder, 0xeab308),
      text: pixiHexColor(colors.titleText, 0x713f12),
      subText: pixiHexColor(colors.bodyText, 0x854d0e),
      accentFill: pixiHexColor(colors.foldBg, 0xfef08a),
    };
  }
  const colors = resolveContainerVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor,
    presentation.kind === 'sequence_fragment' ? 'violet' : 'slate'
  );
  return {
    presentation,
    fill: pixiHexColor(colors.bg, 0xffffff),
    stroke: pixiHexColor(colors.border, 0x94a3b8),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x64748b),
    accentFill: pixiHexColor(colors.badgeBg, 0xe2e8f0),
  };
}
