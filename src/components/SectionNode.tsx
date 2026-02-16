import React, { memo, useMemo } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '@/lib/types';
import { ChevronDown, ChevronRight, Group } from 'lucide-react';

import { ICON_MAP } from './IconMap';
import { SECTION_COLOR_PALETTE } from '../theme';



const SectionNode = ({ data, selected }: NodeProps<NodeData>) => {
  const color = data.color || 'blue';
  const theme = SECTION_COLOR_PALETTE[color] || SECTION_COLOR_PALETTE.blue;
  const Icon = data.icon && ICON_MAP[data.icon] ? ICON_MAP[data.icon] : Group;

  return (
    <>
      <NodeResizer
        color={theme.border}
        isVisible={selected}
        minWidth={350}
        minHeight={250}
        lineStyle={{ borderStyle: 'dashed', borderWidth: 2 }}
        handleStyle={{ width: 12, height: 12, borderRadius: 6 }}
      />
      <div
        className={`
          w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200
          ${selected ? 'ring-2 ring-offset-2 z-10' : ''}
        `}
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          minWidth: 350,
          minHeight: 250,
          pointerEvents: 'none',
        }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-t-2xl"
          style={{ borderBottom: `1px dashed ${theme.border}`, pointerEvents: 'auto' }}
        >
          <Icon className="w-4 h-4" style={{ color: theme.title }} />
          <span
            className="font-bold text-sm tracking-tight"
            style={{ color: theme.title }}
          >
            {data.label || 'Section'}
          </span>
          {data.subLabel && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${theme.badge}`}>
              {data.subLabel}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(SectionNode);
