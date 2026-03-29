import {
  resolveAnnotationVisualStyle,
  resolveSharedColorKey,
  type NodeColorKey,
} from '@/theme';

export const ANNOTATION_COLOR_OPTIONS = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'emerald', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'pink', label: 'Pink' },
  { id: 'violet', label: 'Purple' },
  { id: 'amber', label: 'Orange' },
] as const satisfies ReadonlyArray<{ id: Exclude<NodeColorKey, 'custom'>; label: string }>;

export type AnnotationColorId = (typeof ANNOTATION_COLOR_OPTIONS)[number]['id'];

export function resolveAnnotationTheme(color?: string, customColor?: string): ReturnType<typeof resolveAnnotationVisualStyle> {
  const resolvedColor = resolveSharedColorKey(color, 'yellow');
  const resolvedCustomColor = resolvedColor === 'custom' ? customColor : undefined;
  return resolveAnnotationVisualStyle(resolvedColor, 'subtle', resolvedCustomColor);
}
