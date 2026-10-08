import { resolveAnnotationVisualStyle, resolveContainerVisualStyle } from '@/theme';
import { hasExplicitColor, nodePaletteName } from '../../domain/nodes/nodePalette';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveSequenceNodePresentation,
  type SequenceNodePresentation,
} from '../../domain/nodes/sequenceNodePresentation';
import { normalizeHex } from '@/lib/colorUtils';
import { isDarkCanvas, washOnDark } from '../../domain/color/adaptiveColor';
import { pixiHexColor } from './pixiColor';

export interface PixiSequenceNodeVisual {
  readonly presentation: SequenceNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly accentFill: number;
}

/** Sequence ink as hex, shared by the canvas and the SVG export so the two cannot drift. */
export interface SequenceNodeColors {
  readonly presentation: SequenceNodePresentation;
  readonly fill: string;
  readonly stroke: string;
  readonly text: string;
  readonly subText: string;
  readonly accentFill: string;
}

const pick = (value: string | undefined, fallback: string) => normalizeHex(value ?? '') ?? fallback;

export function sequenceNodeColors(node: SceneNode, canvasColor?: string): SequenceNodeColors | null {
  const presentation = resolveSequenceNodePresentation(node);
  if (!presentation) return null;
  if (presentation.kind === 'sequence_note') {
    const colors = resolveAnnotationVisualStyle('yellow', 'subtle', undefined, nodePaletteName(node));
    return {
      presentation,
      fill: pick(colors.containerBg, '#fef9c3'),
      stroke: pick(colors.containerBorder, '#eab308'),
      text: pick(colors.titleText, '#713f12'),
      subText: pick(colors.bodyText, '#854d0e'),
      accentFill: pick(colors.foldBg, '#fef08a'),
    };
  }
  const colors = resolveContainerVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor,
    presentation.kind === 'sequence_fragment' ? 'violet' : 'slate',
    nodePaletteName(node)
  );
  const ink = {
    presentation,
    fill: pick(colors.bg, '#ffffff'),
    stroke: pick(colors.border, '#94a3b8'),
    text: pick(colors.text, '#0f172a'),
    subText: pick(colors.subText, '#64748b'),
    accentFill: pick(colors.badgeBg, '#e2e8f0'),
  };
  // Only the default tint washes; a colour the author picked stays as it is.
  const isDefault = presentation.colorMode === 'subtle'
    && !hasExplicitColor(node, presentation.kind === 'sequence_fragment' ? presentation.colorKey : 'slate');
  return isDefault && isDarkCanvas(canvasColor) ? washOnDark(ink, canvasColor) : ink;
}

export function projectSequenceNodeVisual(node: SceneNode, canvasColor?: string): PixiSequenceNodeVisual | null {
  const colors = sequenceNodeColors(node, canvasColor);
  if (!colors) return null;
  return {
    presentation: colors.presentation,
    fill: pixiHexColor(colors.fill, 0xffffff),
    stroke: pixiHexColor(colors.stroke, 0x94a3b8),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x64748b),
    accentFill: pixiHexColor(colors.accentFill, 0xe2e8f0),
  };
}
