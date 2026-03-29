import React, { memo, useMemo } from 'react';
import { useNodes, type LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { Group, Lock, EyeOff } from 'lucide-react';
import { NamedIcon } from './IconMap';
import { SECTION_COLOR_PALETTE } from '../theme';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';
import { useSelectionState } from '@/store/selectionHooks';

function SectionNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const allNodes = useNodes();
  const { hoveredSectionId } = useSelectionState();
  const color = data.color || 'blue';
  const theme = SECTION_COLOR_PALETTE[color] || SECTION_COLOR_PALETTE.blue;
  const iconName = data.icon || 'Group';
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const subLabelEdit = useInlineNodeTextEdit(id, 'subLabel', data.subLabel || '');
  const childCount = useMemo(
    () => allNodes.filter((node) => getNodeParentId(node) === id).length,
    [allNodes, id]
  );
  const isDropTarget = hoveredSectionId === id;
  const isLocked = data.sectionLocked === true;
  const isHidden = data.sectionHidden === true;
  const outlineBorder = isDropTarget ? theme.title : theme.border;
  const outlineBackground = isDropTarget
    ? `color-mix(in srgb, ${theme.bg} 78%, white 22%)`
    : theme.bg;
  const badgeBackground = isDropTarget
    ? 'color-mix(in srgb, white 32%, transparent)'
    : 'color-mix(in srgb, white 24%, transparent)';

  return (
    <NodeChrome
      nodeId={id}
      selected={Boolean(selected)}
      minWidth={350}
      minHeight={250}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-opacity"
      handleVisibilityOptions={{ includeConnectingState: false }}
    >
      <div
        className={`
          group relative w-full h-full rounded-2xl transition-all duration-200 pointer-events-none
          ${selected ? 'z-10' : ''}
        `}
        style={{
          minWidth: 350,
          minHeight: 250,
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl border-2 border-dashed"
          style={{
            backgroundColor: outlineBackground,
            borderColor: outlineBorder,
            boxShadow: isDropTarget ? `0 0 0 1px ${theme.title}` : undefined,
          }}
        />
        <div className="pointer-events-auto absolute inset-x-0 top-0 h-3 rounded-t-2xl" />
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-3 rounded-b-2xl" />
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-3 rounded-l-2xl" />
        <div className="pointer-events-auto absolute inset-y-0 right-0 w-3 rounded-r-2xl" />
        {/* Title Bar */}
        <div
          className={`pointer-events-auto relative flex items-center gap-2 rounded-t-2xl px-4 py-3 ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
          style={{
            borderBottom: `1px dashed ${outlineBorder}`,
            backgroundColor: isDropTarget ? 'color-mix(in srgb, white 10%, transparent)' : undefined,
          }}
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
          {isLocked ? (
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold flow-lod-secondary" style={{ color: theme.title, backgroundColor: badgeBackground }}>
              <Lock className="inline-block h-3 w-3" />
            </span>
          ) : null}
          {isHidden ? (
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold flow-lod-secondary" style={{ color: theme.title, backgroundColor: badgeBackground }}>
              <EyeOff className="inline-block h-3 w-3" />
            </span>
          ) : null}
          <span
            className="ml-auto rounded-full px-2 py-1 text-[10px] font-semibold flow-lod-secondary"
            style={{
              color: theme.title,
              backgroundColor: badgeBackground,
            }}
          >
            {childCount} {childCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>
    </NodeChrome>
  );
};

export default memo(SectionNode);
