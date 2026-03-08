import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { Group } from 'lucide-react';
import { NamedIcon } from './IconMap';
import { SECTION_COLOR_PALETTE } from '../theme';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';

function SectionNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const color = data.color || 'blue';
  const theme = SECTION_COLOR_PALETTE[color] || SECTION_COLOR_PALETTE.blue;
  const iconName = data.icon || 'Group';
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const subLabelEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '');

  return (
    <NodeChrome
      selected={Boolean(selected)}
      minWidth={350}
      minHeight={250}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-opacity"
      handleVisibilityOptions={{ includeConnectingState: false }}
    >
      <div
        className={`
          group w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200
          ${selected ? 'z-10' : ''}
        `}
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          minWidth: 350,
          minHeight: 250,
        }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-t-2xl cursor-grab active:cursor-grabbing"
          style={{ borderBottom: `1px dashed ${theme.border}` }}
        >
          {iconName ? (
            <NamedIcon name={iconName} fallbackName="Group" className="w-4 h-4 flow-lod-far-target" style={{ color: theme.title }} />
          ) : (
            <Group className="w-4 h-4 flow-lod-far-target" style={{ color: theme.title }} />
          )}
          <InlineTextEditSurface
            isEditing={labelEdit.isEditing}
            draft={labelEdit.draft}
            displayValue={data.label || 'Section'}
            onBeginEdit={labelEdit.beginEdit}
            onDraftChange={labelEdit.setDraft}
            onCommit={labelEdit.commit}
            onKeyDown={labelEdit.handleKeyDown}
            className="font-bold text-sm tracking-tight"
            style={{ color: theme.title }}
            inputClassName="font-bold"
            isSelected={Boolean(selected)}
          />
          {data.subLabel && (
            <InlineTextEditSurface
              isEditing={subLabelEdit.isEditing}
              draft={subLabelEdit.draft}
              displayValue={data.subLabel}
              onBeginEdit={subLabelEdit.beginEdit}
              onDraftChange={subLabelEdit.setDraft}
              onCommit={subLabelEdit.commit}
              onKeyDown={subLabelEdit.handleKeyDown}
              className={`text-xs font-medium px-2 py-1 rounded-full flow-lod-secondary ${theme.badge}`}
              inputClassName="px-0"
              isSelected={Boolean(selected)}
            />
          )}
        </div>
      </div>
    </NodeChrome>
  );
};

export default memo(SectionNode);
