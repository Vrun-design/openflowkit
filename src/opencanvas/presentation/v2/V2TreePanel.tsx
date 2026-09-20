import { useState } from 'react';
import type { CanvasSelection } from '../../application/selection/selection';
import { buildSemanticSceneItems } from '../../application/selection/semanticScene';
import type { ScenePage } from '../../domain/document/types';
import { Panel, Tree, type TreeNode } from '../design-system';
import { OpenCanvasSemanticSceneTree } from './OpenCanvasSemanticSceneTree';

interface V2TreePanelProps {
  readonly page: ScenePage;
  readonly selection: CanvasSelection;
  readonly selectedConnectorId: string | null;
  readonly onSelectNode: (nodeId: string, additive: boolean) => void;
  readonly onSelectConnector: (connectorId: string) => void;
  readonly onClose: () => void;
}

// Overlay, dismissible, non-destructive to camera context (I-33). The visible
// Tree serves sighted editing; the semantic scene tree mirrors the same
// selection for assistive tech and keyboard traversal.
export function V2TreePanel(props: V2TreePanelProps): React.JSX.Element {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set([props.page.id])
  );
  const nodes: readonly TreeNode[] = [
    {
      id: props.page.id,
      label: props.page.name,
      children: buildSemanticSceneItems(props.page).map((item) => ({
        id: `${item.kind}:${item.id}`,
        label: item.label || item.id,
        caption: item.kind,
      })),
    },
  ];
  const selectedId = props.selection.primaryNodeId
    ? `node:${props.selection.primaryNodeId}`
    : props.selectedConnectorId
      ? `connector:${props.selectedConnectorId}`
      : null;

  function handleSelect(id: string): void {
    if (id === props.page.id) return;
    const separator = id.indexOf(':');
    const kind = id.slice(0, separator);
    const targetId = id.slice(separator + 1);
    if (kind === 'connector') props.onSelectConnector(targetId);
    else props.onSelectNode(targetId, false);
  }

  return (
    <Panel title="Layers" side="end" onClose={props.onClose}>
      <Tree
        label="Layers"
        nodes={nodes}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={handleSelect}
        onToggle={(id) =>
          setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />
      <OpenCanvasSemanticSceneTree
        page={props.page}
        selection={props.selection}
        selectedConnectorId={props.selectedConnectorId}
        onSelectNode={props.onSelectNode}
        onSelectConnector={props.onSelectConnector}
      />
    </Panel>
  );
}
