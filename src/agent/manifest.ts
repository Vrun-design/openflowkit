// Capability manifest: every shipped v2 editor operation, the agent action that
// performs it (or the gap), and the test proving agent and manual records are
// equivalent. External clients read this; the test keeps it honest.
// Owns no behaviour — actions live in ./actions.
import { AGENT_ACTIONS } from './actions';

export const MANIFEST_VERSION = 1;

export type CapabilityStatus = 'shipped' | 'gap';

export interface CapabilityRow {
  /** Editor operation as the user sees it. */
  readonly operation: string;
  /** Surface that ships the manual path. */
  readonly surface: 'toolbar' | 'context-bar' | 'keyboard' | 'document-bar' | 'canvas';
  /** Agent action name, or null while it is a gap. */
  readonly action: string | null;
  /** Test file (repo-relative) asserting agent and manual records match. */
  readonly equivalenceTest: string | null;
  readonly status: CapabilityStatus;
  /** Slice that closes the gap. */
  readonly closes?: string;
}

const shipped = (operation: string, surface: CapabilityRow['surface'], action: string, equivalenceTest: string): CapabilityRow =>
  ({ operation, surface, action, equivalenceTest, status: 'shipped' });
const gap = (operation: string, surface: CapabilityRow['surface'], closes: string): CapabilityRow =>
  ({ operation, surface, action: null, equivalenceTest: null, status: 'gap', closes });

export const CAPABILITY_MANIFEST: readonly CapabilityRow[] = [
  shipped('Read document and page', 'canvas', 'get_document', 'src/opencanvas/application/session/commit-path.test.ts'),
  shipped('Create rectangle / ellipse / text', 'toolbar', 'add_node', 'src/agent/actions/addNode.test.ts'),
  shipped('Connect two nodes / free arrow', 'toolbar', 'connect', 'src/agent/actions/parity.test.ts'),
  shipped('Rename node', 'keyboard', 'set_label', 'src/opencanvas/application/session/commit-path.test.ts'),
  shipped('Fill / stroke / width / dash / opacity', 'context-bar', 'set_style', 'src/agent/actions/setStyle.test.ts'),
  shipped('Move / nudge node', 'canvas', 'move_node', 'src/agent/actions/parity.test.ts'),
  shipped('Delete node', 'keyboard', 'delete_node', 'src/agent/actions/parity.test.ts'),
  shipped('Duplicate selection', 'context-bar', 'duplicate_nodes', 'src/agent/actions/parity.test.ts'),
  shipped('Delete connector', 'context-bar', 'delete_connector', 'src/agent/actions/parity.test.ts'),
  shipped('Rename document', 'document-bar', 'rename_document', 'src/agent/actions/parity.test.ts'),
  shipped('Resize / rotate', 'canvas', 'transform_node', 'src/agent/actions/parity.test.ts'),
  gap('Connector endpoint re-bind / waypoints', 'canvas', 'V2-05'),
];

export function manifestCoverage(): { readonly shipped: number; readonly total: number } {
  return { shipped: CAPABILITY_MANIFEST.filter(({ status }) => status === 'shipped').length,
    total: CAPABILITY_MANIFEST.length };
}

/** Actions registered but absent from the manifest (a manifest row is part of "done"). */
export function unlistedActions(): readonly string[] {
  const listed = new Set(CAPABILITY_MANIFEST.map(({ action }) => action));
  return AGENT_ACTIONS.map(({ name }) => name).filter((name) => !listed.has(name));
}
