import React, { memo, useCallback, useState } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useFlowStore } from '@/store';
import { NodeChrome } from '@/components/NodeChrome';

function getScoreTone(score: number | undefined): string {
  if (typeof score !== 'number') return 'bg-slate-100 text-slate-600';
  if (score >= 4) return 'bg-emerald-100 text-emerald-700';
  if (score >= 2) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function useInlineJourneyEdit(
  nodeId: string,
  initialValue: string,
  getPatch: (nextValue: string) => Partial<NodeData>
): {
  isEditing: boolean;
  draft: string;
  beginEdit: () => void;
  setDraft: (value: string) => void;
  commit: () => void;
  cancel: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
} {
  const { setNodes } = useFlowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue ?? '');

  const beginEdit = useCallback(() => {
    setDraft(initialValue ?? '');
    setIsEditing(true);
  }, [initialValue]);

  const commit = useCallback(() => {
    const nextValue = draft.trim();
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...getPatch(nextValue),
              },
            }
          : node
      )
    );
    setIsEditing(false);
  }, [draft, getPatch, nodeId, setNodes]);

  const cancel = useCallback(() => {
    setDraft(initialValue ?? '');
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
  }, [cancel, commit]);

  return { isEditing, draft, beginEdit, setDraft, commit, cancel, handleKeyDown };
}

function JourneyNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const titleEdit = useInlineJourneyEdit(id, data.label || '', (nextValue) => ({
    label: nextValue,
    journeyTask: nextValue,
  }));
  const actorEdit = useInlineJourneyEdit(id, data.subLabel || '', (nextValue) => ({
    subLabel: nextValue,
    journeyActor: nextValue,
  }));
  const sectionEdit = useInlineJourneyEdit(id, data.journeySection || '', (nextValue) => ({
    journeySection: nextValue || 'General',
  }));
  const sectionLabel = data.journeySection || 'General';
  const score = data.journeyScore;

  return (
    <NodeChrome
      selected={Boolean(selected)}
      minWidth={220}
      minHeight={120}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
    >
      <div className="group min-w-[220px] max-w-[280px] rounded-xl border border-violet-200 bg-white px-3 py-3 shadow-sm transition-all">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 cursor-text"
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
                className="w-24 rounded border border-violet-300 bg-white px-1 py-0.5 text-[10px] uppercase tracking-wide outline-none"
              />
            ) : (
              sectionLabel
            )}
          </span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getScoreTone(score)}`}>
            {typeof score === 'number' ? `${score}/5` : 'Unscored'}
          </span>
        </div>

        <div
          className="text-sm font-semibold leading-snug text-slate-900 break-words"
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
              className="w-full rounded border border-violet-300 bg-white px-1 py-0.5 outline-none"
            />
          ) : (
            data.label || 'Journey Step'
          )}
        </div>

        <div
          className="mt-1 text-xs text-slate-600 break-words"
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
              className="w-full rounded border border-violet-200 bg-white px-1 py-0.5 outline-none"
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
