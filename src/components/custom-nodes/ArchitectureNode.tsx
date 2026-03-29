import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from '@/components/InlineTextEditSurface';
import { NodeChrome } from '@/components/NodeChrome';
import { getTransformDiagnosticsAttrs } from '@/components/transformDiagnostics';
import { resolveNodeVisualStyle } from '@/theme';
import { useProviderShapePreview } from '@/hooks/useProviderShapePreview';
import type { DomainLibraryCategory } from '@/services/domainLibrary';
import type { LucideIcon } from 'lucide-react';
import {
  Box,
  Database,
  Diamond,
  Folder,
  Globe,
  Globe2,
  Network,
  Package,
  Puzzle,
  Router,
  Scale,
  Server,
  Shield,
  User,
} from 'lucide-react';

function ArchitectureNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '');
  const provider = (data.archProvider || 'custom') as DomainLibraryCategory | 'custom';
  const providerLabel =
    provider === 'custom' ? String(data.archProviderLabel || 'Custom') : provider;
  const resourceType = data.archResourceType || 'service';
  const environment = data.archEnvironment || 'default';
  const zone = data.archZone as string | undefined;
  const trustDomain = data.archTrustDomain as string | undefined;
  const architectureMinHeight = environment ? 96 : 88;
  const activeColor = data.color || 'white';
  const activeColorMode = data.colorMode || 'subtle';
  const visualStyle = resolveNodeVisualStyle(activeColor, activeColorMode, data.customColor);
  const resourceIconMap: Record<string, LucideIcon> = {
    group: Folder,
    junction: Diamond,
    service: Server,
    person: User,
    system: Box,
    container: Package,
    component: Puzzle,
    database_container: Database,
    router: Router,
    switch: Network,
    firewall: Shield,
    load_balancer: Scale,
    cdn: Globe,
    dns: Globe2,
  };
  const ResourceIcon: LucideIcon = resourceIconMap[resourceType] ?? Server;
  const customIconUrl = typeof data.customIconUrl === 'string' ? data.customIconUrl : undefined;
  const providerPreviewUrl = useProviderShapePreview(
    typeof data.archIconPackId === 'string' ? data.archIconPackId : undefined,
    typeof data.archIconShapeId === 'string' ? data.archIconShapeId : undefined,
    customIconUrl
  );
  const resolvedProviderIconUrl =
    provider === 'custom' && customIconUrl ? customIconUrl : providerPreviewUrl;

  return (
    <NodeChrome
      nodeId={id}
      selected={Boolean(selected)}
      minWidth={180}
      minHeight={architectureMinHeight}
      handleClassName="!w-3 !h-3 !border-2 !border-[var(--brand-surface)] transition-all duration-150 hover:scale-125"
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
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold"
            style={{
              backgroundColor: visualStyle.iconBg,
              borderColor: visualStyle.border,
              color: visualStyle.iconColor,
            }}
          >
            {resolvedProviderIconUrl ? (
              <img
                src={resolvedProviderIconUrl}
                alt={`${providerLabel} ${resourceType} icon`}
                className="h-3.5 w-3.5 object-contain"
                loading="lazy"
              />
            ) : (
              <ResourceIcon className="h-3.5 w-3.5" />
            )}
            <span>{providerLabel}</span>
          </span>
          <span className="font-semibold" style={{ color: visualStyle.subText }}>
            {resourceType}
          </span>
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
          {[environment, zone, trustDomain].filter(Boolean).map((label) => (
            <span
              key={label}
              className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: visualStyle.iconBg,
                color: visualStyle.subText,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </NodeChrome>
  );
}

export default memo(ArchitectureNode);
