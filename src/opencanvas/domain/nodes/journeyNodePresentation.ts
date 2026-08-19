import type { SceneNode } from '../document/types';
import { optionalPresentationString, presentationString } from './nodePresentationValues';

export interface JourneyNodePresentation {
  readonly kind: 'journey';
  readonly title: string;
  readonly section: string;
  readonly task: string;
  readonly actor: string;
  readonly score?: number;
  readonly colorKey: string;
  readonly colorMode: 'subtle' | 'filled';
  readonly customColor?: string;
}

function score(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(5, Math.max(0, Math.round(value)));
}

export function resolveJourneyNodePresentation(node: SceneNode): JourneyNodePresentation | null {
  if (node.kind !== 'journey') return null;
  const customColor = optionalPresentationString(node.content.customColor);
  const resolvedScore = score(node.content.journeyScore);
  return {
    kind: 'journey',
    title: presentationString(node.content.journeyTitle, 'Journey'),
    section: presentationString(node.content.journeySection, 'General'),
    task: presentationString(
      node.content.journeyTask,
      presentationString(node.content.label, 'Journey Step')
    ),
    actor: presentationString(
      node.content.journeyActor,
      presentationString(node.content.subLabel, 'Actor')
    ),
    ...(resolvedScore !== undefined ? { score: resolvedScore } : {}),
    colorKey: presentationString(node.content.color, 'violet'),
    colorMode: node.content.colorMode === 'filled' ? 'filled' : 'subtle',
    ...(customColor ? { customColor } : {}),
  };
}
