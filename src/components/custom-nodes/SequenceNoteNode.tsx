import React, { memo } from 'react';
import { MessageSquare } from 'lucide-react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';

function SequenceNoteNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');

  return (
    <div className="flex min-w-[120px] max-w-[180px] flex-col rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        <MessageSquare className="h-3 w-3 text-amber-600" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">
          Note
        </span>
      </div>
      <InlineTextEditSurface
        isEditing={labelEdit.isEditing}
        draft={labelEdit.draft}
        displayValue={data.label || 'Note'}
        onBeginEdit={labelEdit.beginEdit}
        onDraftChange={labelEdit.setDraft}
        onCommit={labelEdit.commit}
        onKeyDown={labelEdit.handleKeyDown}
        className="w-full text-[11px] leading-4 text-amber-900"
        inputClassName="text-[11px]"
        isSelected={Boolean(selected)}
      />
    </div>
  );
}

export default memo(SequenceNoteNode);
