import React from 'react';
import { useDiagramDiff } from '@/context/DiagramDiffContext';
import { useArchitectureLint } from '@/context/ArchitectureLintContext';

export function DiffBadge({ nodeId }: { nodeId: string }): React.ReactElement | null {
  const { isActive, addedNodeIds, changedNodeIds } = useDiagramDiff();
  if (!isActive) return null;
  const isAdded = addedNodeIds.has(nodeId);
  const isChanged = !isAdded && changedNodeIds.has(nodeId);
  if (!isAdded && !isChanged) return null;
  return (
    <div
      className="absolute -top-2 -left-2 z-20 h-4 w-4 rounded-full shadow-md pointer-events-none"
      style={{ backgroundColor: isAdded ? '#22c55e' : '#f59e0b' }}
      title={isAdded ? 'Added in current version' : 'Changed since snapshot'}
    />
  );
}

export function LintViolationBadge({ nodeId }: { nodeId: string }): React.ReactElement | null {
  const { violations, violatingNodeIds } = useArchitectureLint();
  if (!violatingNodeIds.has(nodeId)) return null;

  const nodeViolations = violations.filter((v) => v.nodeIds.includes(nodeId));
  const hasError = nodeViolations.some((v) => v.severity === 'error');
  const title = nodeViolations.map((v) => v.message).join('\n');

  return (
    <div
      className="absolute -top-2 -right-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-md pointer-events-auto select-none"
      style={{ backgroundColor: hasError ? '#ef4444' : '#f59e0b' }}
      title={title}
    >
      {nodeViolations.length > 1 ? nodeViolations.length : '!'}
    </div>
  );
}
