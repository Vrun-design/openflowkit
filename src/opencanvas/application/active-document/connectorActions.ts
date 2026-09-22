import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import { buildDeleteSelectionCommand } from '../../domain/commands/sceneEdits';

export function buildConnectorObjectAction(
  page: ScenePage, id: string, action: 'hide' | 'lock' | 'duplicate' | 'delete', mintId: (prefix: string) => string,
): DocumentCommand | null {
  const before = page.connectors.find((connector) => connector.id === id);
  if (!before) return null;
  if (action === 'delete') return buildDeleteSelectionCommand(page, [], [id]);
  if (action === 'duplicate') {
    const copyId = mintId('connector');
    return { kind: 'insert-connector', id: `duplicate:${copyId}`, label: 'Duplicate connection',
      pageId: page.id, index: page.connectors.length,
      connector: { ...before, id: copyId, metadata: { ...before.metadata, hidden: false, locked: false } } };
  }
  const field = action === 'hide' ? 'hidden' : 'locked';
  const enabled = before.metadata[field] !== true;
  const label = action === 'hide' ? (enabled ? 'Hide connection' : 'Show connection') : (enabled ? 'Lock connection' : 'Unlock connection');
  return { kind: 'set-connector', id: `${action}:${id}`, label, pageId: page.id, before,
    after: { ...before, metadata: { ...before.metadata, [field]: enabled } } };
}
