export { ReactFlow as default } from '@xyflow/react';
export * from '@xyflow/react';

import type { CSSProperties, ReactNode } from 'react';
import type {
  Connection as ReactFlowConnection,
  EdgeChange as ReactFlowEdgeChange,
  Edge as ReactFlowEdge,
  NodeChange as ReactFlowNodeChange,
  Node as ReactFlowNode,
  Position as ReactFlowPosition,
  Rect as ReactFlowRect,
} from '@xyflow/react';
import {
  addEdge as addEdgeRuntime,
  applyEdgeChanges as applyEdgeChangesRuntime,
  applyNodeChanges as applyNodeChangesRuntime,
} from '@xyflow/react';
import * as ReactFlowCompatRuntime from '@xyflow/react';

interface ReactFlowRuntimeWithBounds {
  getNodesBounds?: (input: LegacyNode[]) => ReactFlowRect;
}

function hasGetNodesBounds(runtime: unknown): runtime is Required<Pick<ReactFlowRuntimeWithBounds, 'getNodesBounds'>> {
  return typeof (runtime as ReactFlowRuntimeWithBounds).getNodesBounds === 'function';
}

export type LegacyNode<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
> = ReactFlowNode<TData, TType>;

export type LegacyEdge<
  TData extends Record<string, unknown> = Record<string, unknown>
> = ReactFlowEdge<TData>;

export type LegacyNodeProps<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
> = {
  id: string;
  data: TData;
  type?: TType;
  selected?: boolean;
  dragging?: boolean;
  isConnectable?: boolean;
  sourcePosition?: ReactFlowPosition;
  targetPosition?: ReactFlowPosition;
  xPos?: number;
  yPos?: number;
  zIndex?: number;
  dragHandle?: string;
};

export type LegacyEdgeProps<
  TData extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  data?: TData;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: ReactFlowPosition;
  targetPosition: ReactFlowPosition;
  sourceHandleId?: string | null;
  targetHandleId?: string | null;
  selected?: boolean;
  animated?: boolean;
  style?: CSSProperties;
  markerStart?: string;
  markerEnd?: string;
  interactionWidth?: number;
  label?: ReactNode;
};

export function getCompatibleNodesBounds<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
>(nodes: LegacyNode<TData, TType>[]): ReactFlowRect {
  if (hasGetNodesBounds(ReactFlowCompatRuntime)) {
    return ReactFlowCompatRuntime.getNodesBounds(nodes);
  }

  return { x: 0, y: 0, width: 0, height: 0 };
}

export function applyFlowNodeChanges<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
>(changes: ReactFlowNodeChange[], nodes: LegacyNode<TData, TType>[]): LegacyNode<TData, TType>[] {
  return applyNodeChangesRuntime(changes, nodes) as LegacyNode<TData, TType>[];
}

export function applyFlowEdgeChanges<
  TData extends Record<string, unknown> = Record<string, unknown>
>(changes: ReactFlowEdgeChange[], edges: LegacyEdge<TData>[]): LegacyEdge<TData>[] {
  return applyEdgeChangesRuntime(changes, edges) as LegacyEdge<TData>[];
}

export function addFlowEdge<
  TData extends Record<string, unknown> = Record<string, unknown>
>(connection: ReactFlowConnection | LegacyEdge<TData>, edges: LegacyEdge<TData>[]): LegacyEdge<TData>[] {
  return addEdgeRuntime(connection as ReactFlowConnection, edges) as LegacyEdge<TData>[];
}

export function toFlowNode<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string
>(node: LegacyNode): LegacyNode<TData, TType> {
  return node as LegacyNode<TData, TType>;
}
