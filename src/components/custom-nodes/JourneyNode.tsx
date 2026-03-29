import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useFlowStore } from '@/store';
import { NodeChrome } from '@/components/NodeChrome';
import { JourneyScoreControl } from '@/components/journey/JourneyScoreControl';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';

function JourneyNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const titleEdit = useInlineNodeTextEdit(id, 'label', data.label || '', {
    getPatch: (nextValue) => ({ label: nextValue, journeyTask: nextValue }),
  });
  const actorEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '', {
    getPatch: (nextValue) => ({ subLabel: nextValue, journeyActor: nextValue }),
  });
  const sectionEdit = useInlineNodeTextEdit(id, 'label', data.journeySection || '', {
    getPatch: (nextValue) => ({ journeySection: nextValue || 'General' }),
  });
  const setNodes = useFlowStore((state) => state.setNodes);
  const sectionLabel = data.journeySection || 'General';
  const score = data.journeyScore;

  function updateScore(nextScore: number): void {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                journeyScore: nextScore,
              },
            }
          : node
      )
    );
  }

  return (
    <NodeChrome
      nodeId={id}
      selected={Boolean(selected)}
      minWidth={220}
      minHeight={120}
      handleClassName="!w-3 !h-3 !border-2 !border-[var(--brand-surface)] transition-all duration-150 hover:scale-125"
    >
      <div className="group min-w-[220px] max-w-[280px] rounded-xl border border-violet-300/50 bg-[var(--brand-surface)] px-3 py-3 shadow-sm transition-all">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="cursor-text rounded-md bg-violet-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300"
            onClick={(event) => {
              event.stopPropagation();
              sectionEdit.beginEdit();
            }}
          >
            {sectionEdit.isEditing ? (
              <input
                autoFocus
                value={sectionEdit.draft}
                onChange={(event) => sectionEdit.setDraft(event.target.value)}
                onBlur={sectionEdit.commit}
                onKeyDown={sectionEdit.handleKeyDown}
                onMouseDown={(event) => event.stopPropagation()}
                className="w-24 rounded border border-violet-400/60 bg-[var(--brand-surface)] px-1 py-0.5 text-[10px] uppercase tracking-wide text-[var(--brand-text)] outline-none"
              />
            ) : (
              sectionLabel
            )}
          </span>
          <JourneyScoreControl
            score={score}
            onChange={updateScore}
            className="rounded-md bg-[var(--brand-background)] px-2 py-1"
            starClassName="text-sm leading-none"
          />
        </div>

        <div
          className="break-words text-sm font-semibold leading-snug text-[var(--brand-text)]"
          onClick={(event) => {
            event.stopPropagation();
            titleEdit.beginEdit();
          }}
        >
          {titleEdit.isEditing ? (
            <input
              autoFocus
              value={titleEdit.draft}
              onChange={(event) => titleEdit.setDraft(event.target.value)}
              onBlur={titleEdit.commit}
              onKeyDown={titleEdit.handleKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full rounded border border-violet-400/60 bg-[var(--brand-surface)] px-1 py-0.5 text-[var(--brand-text)] outline-none"
            />
          ) : (
            data.label || 'Journey Step'
          )}
        </div>

        <div
          className="mt-1 break-words text-xs text-[var(--brand-secondary)]"
          onClick={(event) => {
            event.stopPropagation();
            actorEdit.beginEdit();
          }}
        >
          {actorEdit.isEditing ? (
            <input
              autoFocus
              value={actorEdit.draft}
              onChange={(event) => actorEdit.setDraft(event.target.value)}
              onBlur={actorEdit.commit}
              onKeyDown={actorEdit.handleKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full rounded border border-violet-300/50 bg-[var(--brand-surface)] px-1 py-0.5 text-[var(--brand-text)] outline-none"
            />
          ) : (
            data.subLabel || 'Actor'
          )}
        </div>
      </div>
    </NodeChrome>
  );
}

export default memo(JourneyNode);
