import { resolveNodeSize } from '@/components/nodeHelpers';
import type { FlowNode } from '@/lib/types';
import type { JsonObject } from '../../domain/document/json';
import type { Size2d } from '../../domain/geometry/types';

/**
 * Size for a legacy node that states none. React Flow measures such nodes in
 * the DOM at their per-shape minimum; OpenCanvas never mounts them, so it
 * uses the same minimum the legacy geometry helpers (alignment, sections)
 * already assume. Both projection directions call this so an unmeasured node
 * round-trips without gaining explicit dimensions.
 */
// ponytail: min size only, never DOM `measured` (differs per session) and no
// text growth; wrapped-label measurement arrives with M3 rich text.
export function resolveLegacyNodeSize(node: JsonObject): Size2d | null {
  const size = resolveNodeSize(node as unknown as FlowNode);
  return size.width > 0 && size.height > 0 ? size : null;
}
