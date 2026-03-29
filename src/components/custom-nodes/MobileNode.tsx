import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import { useTranslation } from 'react-i18next';
import { NodeData } from '@/lib/types';
import { NodeChrome } from '@/components/NodeChrome';
import { renderMobileVariantContent } from './mobileVariantRenderer';
import { getNodeColorPalette } from '../../theme';

function MobileNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
  const { t } = useTranslation();
  const nodeColorPalette = getNodeColorPalette(true);
  const style = nodeColorPalette[data.color || 'slate'] || nodeColorPalette.slate;

  return (
    <NodeChrome
      nodeId={id}
      selected={Boolean(selected)}
      minWidth={300}
      minHeight={600}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
      handleVisibilityOptions={{ includeConnectingState: false }}
    >
      <div
        className={`
                    relative flex flex-col w-full h-full 
                    bg-[var(--brand-surface)] rounded-[2.5rem] shadow-sm border ${style.border}
                    overflow-hidden transition-all duration-200
                `}
        style={{ minWidth: 300, minHeight: 600 }}
      >
        {/* Notch / Status Bar Area */}
        <div
          className={`h-10 bg-[var(--brand-surface)] flex items-center justify-center px-6 relative shrink-0 border-b ${style.border} border-opacity-30`}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[var(--brand-background)] rounded-b-2xl border-b border-l border-r border-[var(--color-brand-border)]" />
          <div className="w-full flex justify-between items-center text-[10px] text-[var(--brand-secondary)] pt-2 px-2">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-2 bg-[var(--color-brand-border)] rounded-[1px]" />
              <div className="w-3 h-2 bg-[var(--color-brand-border)] rounded-[1px]" />
              <div className="w-4 h-2 bg-[var(--color-brand-border)] rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 bg-[var(--brand-surface)] relative overflow-hidden flex flex-col">
          {renderMobileVariantContent({
            imageUrl: data.imageUrl,
            variant: data.variant,
            style,
            imageAlt: t('customNodes.mobileContent'),
          })}

          {/* Dynamic Label Overlay - Subtler */}
          {data.label && !['list', 'profile'].includes(data.variant || '') && (
            <div className="absolute top-2 left-0 right-0 text-center font-medium text-[var(--brand-secondary)] pointer-events-none text-[10px] uppercase tracking-wider">
              {data.label}
            </div>
          )}
        </div>

        {/* Home Indicator */}
        <div className="h-6 bg-[var(--brand-surface)] shrink-0 flex items-center justify-center pt-2 pb-2">
          <div className="w-28 h-1 bg-[var(--color-brand-border)] rounded-full" />
        </div>
      </div>
    </NodeChrome>
  );
}

export default memo(MobileNode);
