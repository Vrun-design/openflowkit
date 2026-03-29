import React, { memo } from 'react';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import { useTranslation } from 'react-i18next';
import { NodeData } from '@/lib/types';
import { Lock } from 'lucide-react';
import { NodeChrome } from '@/components/NodeChrome';
import { renderBrowserVariantContent } from './browserVariantRenderer';

import { getNodeColorPalette } from '../../theme';

const BrowserNode = ({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement => {
  const { t } = useTranslation();
  const nodeColorPalette = getNodeColorPalette(true);
  const style = nodeColorPalette[data.color || 'slate'] || nodeColorPalette.slate;

  return (
    <NodeChrome
      nodeId={id}
      selected={Boolean(selected)}
      minWidth={200}
      minHeight={150}
      handleClassName="!w-3 !h-3 !border-2 !border-white transition-all duration-150 hover:scale-125"
      handleVisibilityOptions={{ includeConnectingState: false }}
    >
      <div
        className={`
                    relative flex flex-col w-full h-full 
                    bg-white rounded-xl shadow-sm border ${style.border}
                    overflow-hidden transition-all duration-200
                `}
        style={{ minWidth: 200, minHeight: 150 }}
      >
        {/* Browser Header - Cleaner, Monochrome */}
        <div
          className={`h-9 bg-white border-b ${style.border} flex items-center px-3 gap-3 shrink-0`}
        >
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          {/* URL Bar */}
          <div
            className={`flex-1 h-6 ${style.iconBg} rounded-md border ${style.border} border-opacity-50 flex items-center px-2 text-slate-300 text-[10px]`}
          >
            {data.icon === 'lock' && <Lock className="w-2.5 h-2.5 mr-1.5 opacity-50" />}
            <span className="truncate">{data.label || 'example.com'}</span>
          </div>
        </div>

        {/* Content Area */}
        {renderBrowserVariantContent({
          imageUrl: data.imageUrl,
          variant: data.variant,
          label: data.label,
          style,
          lockIconVisible: data.icon === 'lock',
          imageAlt: t('customNodes.browserContent'),
        })}
      </div>
    </NodeChrome>
  );
};

export default memo(BrowserNode);
