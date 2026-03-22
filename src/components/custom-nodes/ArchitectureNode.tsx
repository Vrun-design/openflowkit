import React, { memo, useEffect, useState } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { NodeChrome } from '@/components/NodeChrome';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { resolveNodeVisualStyle } from '@/theme';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';

function ArchitectureNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const provider = data.archProvider || 'custom';
  const resourceType = data.archResourceType || 'service';
  const environment = data.archEnvironment || 'default';
  const zone = data.archZone as string | undefined;
  const trustDomain = data.archTrustDomain as string | undefined;
  const architectureMinHeight = environment ? 96 : 88;
  const activeColor = data.color || 'white';
  const activeColorMode = data.colorMode || 'subtle';
  const visualStyle = resolveNodeVisualStyle(activeColor, activeColorMode, data.customColor);
  const resourceIcon = {
    group: '◼',
    junction: '◆',
    service: '▣',
  }[resourceType] ?? '▣';
  const packId = typeof data.archIconPackId === 'string' ? data.archIconPackId : undefined;
  const shapeId = typeof data.archIconShapeId === 'string' ? data.archIconShapeId : undefined;
  const previewKey = packId && shapeId ? `${packId}:${shapeId}` : null;
  const [providerPreviewState, setProviderPreviewState] = useState<{ key: string | null; url: string | null }>({ key: null, url: null });
  const providerPreviewUrl = providerPreviewState.key === previewKey ? providerPreviewState.url : null;

  useEffect(() => {
    let cancelled = false;

    if (!ROLLOUT_FLAGS.shapeLibraryV1 || !packId || !shapeId || !previewKey) {
      return;
    }

    loadProviderShapePreview(packId, shapeId)
      .then((preview) => {
        if (!cancelled) {
          setProviderPreviewState({ key: previewKey, url: preview?.previewUrl ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviderPreviewState({ key: previewKey, url: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [packId, previewKey, shapeId]);

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
            {providerPreviewUrl ? (
              <img src={providerPreviewUrl} alt={`${provider} ${resourceType} icon`} className="h-3.5 w-3.5 object-contain" loading="lazy" />
            ) : (
              <span>{resourceIcon}</span>
            )}
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
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span
            className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{
              backgroundColor: visualStyle.iconBg,
              color: visualStyle.subText,
            }}
          >
            {environment}
          </span>
          {zone && (
            <span
              className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: visualStyle.iconBg,
                color: visualStyle.subText,
              }}
            >
              {zone}
            </span>
          )}
          {trustDomain && (
            <span
              className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: visualStyle.iconBg,
                color: visualStyle.subText,
              }}
            >
              {trustDomain}
            </span>
          )}
        </div>
      </div>
    </NodeChrome>
  );
}

export default memo(ArchitectureNode);
