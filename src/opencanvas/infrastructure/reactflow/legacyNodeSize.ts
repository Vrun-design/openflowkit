import { NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import type { FlowNode } from '@/lib/types';
import { estimateNodeSize } from '@/services/elk-layout/graphBuilding';
import type { JsonObject } from '../../domain/document/json';
import type { Size2d } from '../../domain/geometry/types';

/**
 * Size for a legacy node that states none. React Flow measures such nodes in
 * the DOM; OpenCanvas never mounts them, so it uses the layout engine's text
 * estimate instead. Both projection directions call this so an unmeasured
 * node round-trips without gaining explicit dimensions.
 */
// ponytail: estimate only, never DOM `measured` — measured differs per
// session and would make the reverse projection write sizes into legacy data.
export function resolveLegacyNodeSize(node: JsonObject): Size2d | null {
  const size = estimateNodeSize(node as unknown as FlowNode, NODE_WIDTH, NODE_HEIGHT);
  return size.width > 0 && size.height > 0 ? size : null;
}
