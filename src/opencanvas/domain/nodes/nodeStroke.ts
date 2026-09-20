import type { SceneNode } from '../document/types';

export type NodeStrokeStyle = 'solid' | 'dashed' | 'dotted';

export function resolveNodeStroke(node: SceneNode): { width: number; style: NodeStrokeStyle; dash: readonly number[] } {
  const value = node.appearance.strokeWidth;
  const width = typeof value === 'number' && Number.isFinite(value) ? Math.min(24, Math.max(0, value)) : 1.5;
  const style = node.appearance.strokeStyle === 'dashed' || node.appearance.strokeStyle === 'dotted'
    ? node.appearance.strokeStyle : 'solid';
  const unit = Math.max(1, width);
  const dash = style === 'dashed' ? [unit * 4, unit * 3] : style === 'dotted' ? [unit, unit * 2] : [];
  return { width, style, dash };
}
