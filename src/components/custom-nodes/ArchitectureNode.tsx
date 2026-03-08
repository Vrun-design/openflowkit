import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { NodeChrome } from '@/components/NodeChrome';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { resolveNodeVisualStyle } from '@/theme';

function ArchitectureNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const provider = data.archProvider || 'custom';
  const resourceType = data.archResourceType || 'service';
  const environment = data.archEnvironment || 'default';
  const architectureMinHeight = environment ? 96 : 88;
  const activeColor = data.color || 'white';
  const activeColorMode = data.colorMode || 'subtle';
  const visualStyle = resolveNodeVisualStyle(activeColor, activeColorMode, data.customColor);
  const resourceIcon = {
    group: '◼',
    junction: '◆',
    service: '▣',
  }[resourceType] ?? '▣';

  return (
    <NodeChrome
      selected={Boolean(selected)}
      minWidth={180}
      minHeight={architectureMinHeight}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
    >
      <div
        className="group min-w-[180px] rounded-xl border px-3 py-2 shadow-sm"
        style={{
          minHeight: architectureMinHeight,
          backgroundColor: visualStyle.bg,
          borderColor: visualStyle.border,
          color: visualStyle.text,
        }}
        {...getTransformDiagnosticsAttrs({
          nodeFamily: 'architecture',
          selected: Boolean(selected),
          minHeight: architectureMinHeight,
          hasSubLabel: Boolean(environment),
        })}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-500">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold"
            style={{
              backgroundColor: visualStyle.iconBg,
              borderColor: visualStyle.border,
              color: visualStyle.iconColor,
            }}
          >
            <span>{resourceIcon}</span>
            <span>{provider}</span>
          </span>
          <span className="font-semibold" style={{ color: visualStyle.subText }}>{resourceType}</span>
        </div>
        <InlineTextEditSurface
          isEditing={labelEdit.isEditing}
          draft={labelEdit.draft}
          displayValue={data.label || 'Architecture Node'}
          onBeginEdit={labelEdit.beginEdit}
          onDraftChange={labelEdit.setDraft}
          onCommit={labelEdit.commit}
          onKeyDown={labelEdit.handleKeyDown}
          className="mt-1 text-sm font-semibold break-words"
          isSelected={Boolean(selected)}
        />
        <div
          className="mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: visualStyle.iconBg,
            color: visualStyle.subText,
          }}
        >
          {environment}
        </div>
      </div>
    </NodeChrome>
  );
}

export default memo(ArchitectureNode);
