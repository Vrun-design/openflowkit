import { resolveContainerVisualStyle, resolveNodeVisualStyle } from '@/theme';
import type { SceneNode } from '../../domain/document/types';
import {
  resolveJourneyNodePresentation,
  type JourneyNodePresentation,
} from '../../domain/nodes/journeyNodePresentation';
import { pixiHexColor } from './pixiColor';

export interface PixiJourneyNodeVisual {
  readonly presentation: JourneyNodePresentation;
  readonly fill: number;
  readonly stroke: number;
  readonly text: number;
  readonly subText: number;
  readonly headerFill: number;
  readonly scoreFill: number;
  readonly emptyScoreFill: number;
}

function scoreColor(score: number | undefined): 'red' | 'amber' | 'emerald' | 'slate' {
  if (score === undefined) return 'slate';
  if (score <= 2) return 'red';
  if (score === 3) return 'amber';
  return 'emerald';
}

export function projectJourneyNodeVisual(node: SceneNode): PixiJourneyNodeVisual | null {
  const presentation = resolveJourneyNodePresentation(node);
  if (!presentation) return null;
  const colors = resolveContainerVisualStyle(
    presentation.colorKey,
    presentation.colorMode,
    presentation.customColor,
    'violet'
  );
  const scoreColors = resolveNodeVisualStyle(scoreColor(presentation.score), 'subtle');
  return {
    presentation,
    fill: pixiHexColor(colors.bg, 0xffffff),
    stroke: pixiHexColor(colors.border, 0xcbd5e1),
    text: pixiHexColor(colors.text, 0x0f172a),
    subText: pixiHexColor(colors.subText, 0x64748b),
    headerFill: pixiHexColor(colors.accentBg, 0xf1f5f9),
    scoreFill: pixiHexColor(scoreColors.iconColor, 0x64748b),
    emptyScoreFill: pixiHexColor(colors.badgeBg, 0xe2e8f0),
  };
}
