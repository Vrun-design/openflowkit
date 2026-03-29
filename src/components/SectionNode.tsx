import React, { memo, useMemo } from 'react';
import { useNodes, type LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { Group, Lock, EyeOff } from 'lucide-react';
import { NamedIcon } from './IconMap';
import { resolveSectionVisualStyle } from '../theme';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';
import { useSelectionState } from '@/store/selectionHooks';

function SectionNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const allNodes = useNodes();
  const { hoveredSectionId } = useSelectionState();
  const theme = resolveSectionVisualStyle(data.color, data.colorMode, data.customColor, 'blue');
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

  const borderColor = isDropTarget ? theme.title : theme.border;
  const bgColor = isDropTarget
    ? `color-mix(in srgb, ${theme.bg} 85%, white 15%)`
    : theme.bg;

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
        className={`group relative w-full h-full ${selected ? 'z-10' : ''}`}
        style={{ minWidth: 350, minHeight: 250 }}
      >
        {/* Floating title — sits ABOVE the section border, FigJam-style */}
        <div
          className="pointer-events-auto absolute left-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{
            top: -36,
            backgroundColor: `${borderColor}22`,
            maxWidth: 'calc(100% - 8px)',
          }}
        >
          {iconName ? (
            <NamedIcon name={iconName} fallbackName="Group" className="w-3.5 h-3.5 shrink-0 flow-lod-far-target" style={{ color: theme.title }} />
          ) : (
            <Group className="w-3.5 h-3.5 shrink-0 flow-lod-far-target" style={{ color: theme.title }} />
          )}
          <InlineTextEditSurface
            isEditing={labelEdit.isEditing}
            draft={labelEdit.draft}
            displayValue={data.label || 'Section'}
            onBeginEdit={labelEdit.beginEdit}
            onDraftChange={labelEdit.setDraft}
            onCommit={labelEdit.commit}
            onKeyDown={labelEdit.handleKeyDown}
            className="font-semibold text-[13px] leading-tight tracking-tight whitespace-nowrap"
            style={{ color: theme.title }}
            inputClassName="font-semibold"
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
              className="text-[11px] font-medium px-1.5 py-0.5 rounded-full flow-lod-secondary"
              style={{
                backgroundColor: theme.badgeBg,
                color: theme.badgeText,
              }}
              inputClassName="px-0"
              isSelected={Boolean(selected)}
            />
          )}
          {(isLocked || isHidden) && (
            <div className="flex items-center gap-1 ml-0.5">
              {isLocked && <Lock className="h-3 w-3 flow-lod-secondary shrink-0" style={{ color: theme.title }} />}
              {isHidden && <EyeOff className="h-3 w-3 flow-lod-secondary shrink-0" style={{ color: theme.title }} />}
            </div>
          )}
        </div>

        {/* Section body — clean border, no internal header bar */}
        <div
          className="absolute inset-0 rounded-xl transition-all duration-150"
          style={{
            backgroundColor: bgColor,
            border: `1.5px solid ${borderColor}`,
            boxShadow: selected
              ? `0 0 0 2px ${theme.title}33, 0 2px 8px rgba(0,0,0,0.06)`
              : isDropTarget
                ? `0 0 0 1px ${theme.title}55, 0 4px 16px rgba(0,0,0,0.10)`
                : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        />

        {/* Edge drag-handle strips for resize */}
        <div className="pointer-events-auto absolute inset-x-0 top-0 h-3 rounded-t-xl" />
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-3 rounded-b-xl" />
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-3 rounded-l-xl" />
        <div className="pointer-events-auto absolute inset-y-0 right-0 w-3 rounded-r-xl" />

        {/* Child count — subtle bottom-right badge */}
        {childCount > 0 && (
          <span
            className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium flow-lod-secondary select-none"
            style={{ color: theme.title, opacity: 0.55 }}
          >
            {childCount} {childCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>
    </NodeChrome>
  );
}

export default memo(SectionNode);
