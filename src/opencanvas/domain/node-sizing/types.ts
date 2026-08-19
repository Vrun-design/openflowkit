import type { Size2d } from '../geometry/types';
import type { TextOverflowPolicy } from '../text/measurement';

export const NODE_SIZING_POLICY_VERSION = 1 as const;
export type NodeSizingMode = 'auto' | 'fixed' | 'responsive';

export interface NodeSizingPolicyV1 {
  readonly version: typeof NODE_SIZING_POLICY_VERSION;
  readonly mode: NodeSizingMode;
  readonly minSize: Size2d;
  readonly maxSize: Size2d;
  readonly overflow: TextOverflowPolicy;
  readonly clipContent: boolean;
  readonly maxLines: number;
}
