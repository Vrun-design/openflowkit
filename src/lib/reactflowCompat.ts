// Structural stand-ins for the React Flow node/edge shapes the legacy graph
// model (`FlowNode`/`FlowEdge` in ./types) was built on. React Flow itself is
// gone; these keep the mermaid/ELK services and the V1 JSON import compiling.
import type { CSSProperties, ReactNode } from 'react';

export const MarkerType = {
  Arrow: 'arrow',
  ArrowClosed: 'arrowclosed',
} as const;
export type MarkerType = (typeof MarkerType)[keyof typeof MarkerType];

export interface EdgeMarker {
  type: MarkerType;
  color?: string;
  width?: number;
  height?: number;
  markerUnits?: string;
  orient?: string;
  strokeWidth?: number;
}

export type Position = 'left' | 'top' | 'right' | 'bottom';

export interface Node<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
> {
  id: string;
  position: { x: number; y: number };
  data: TData;
  type?: TType;
  sourcePosition?: Position;
  targetPosition?: Position;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  dragHandle?: string;
  width?: number;
  height?: number;
  initialWidth?: number;
  initialHeight?: number;
  parentId?: string;
  zIndex?: number;
  extent?: 'parent' | [[number, number], [number, number]];
  expandParent?: boolean;
  ariaLabel?: string;
  origin?: [number, number];
  handles?: unknown[];
  measured?: { width?: number; height?: number };
  style?: CSSProperties;
  className?: string;
  resizing?: boolean;
  focusable?: boolean;
}

export interface Edge<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  selectable?: boolean;
  data?: TData;
  selected?: boolean;
  markerStart?: EdgeMarker | string;
  markerEnd?: EdgeMarker | string;
  zIndex?: number;
  ariaLabel?: string;
  interactionWidth?: number;
  label?: ReactNode;
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  style?: CSSProperties;
  className?: string;
  reconnectable?: boolean | 'source' | 'target';
  focusable?: boolean;
}

export type LegacyNode<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
> = Node<TData, TType>;

export type LegacyEdge<TData extends Record<string, unknown> = Record<string, unknown>> = Edge<TData>;
