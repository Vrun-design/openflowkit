import React, { memo, useMemo } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '../types';
import { ChevronDown, ChevronRight, Group } from 'lucide-react';

const SECTION_COLORS: Record<string, { bg: string; border: string; title: string; badge: string }> = {
  slate: { bg: 'rgba(241,245,249,0.35)', border: '#94a3b8', title: '#334155', badge: 'bg-slate-200 text-slate-700' },
  blue: { bg: 'rgba(219,234,254,0.35)', border: '#60a5fa', title: '#1e40af', badge: 'bg-blue-200 text-blue-700' },
  emerald: { bg: 'rgba(209,250,229,0.35)', border: '#34d399', title: '#065f46', badge: 'bg-emerald-200 text-emerald-700' },
  amber: { bg: 'rgba(254,243,199,0.35)', border: '#fbbf24', title: '#92400e', badge: 'bg-amber-200 text-amber-700' },
  violet: { bg: 'rgba(237,233,254,0.35)', border: '#8b5cf6', title: '#5b21b6', badge: 'bg-violet-200 text-violet-700' },
  red: { bg: 'rgba(254,226,226,0.35)', border: '#f87171', title: '#991b1b', badge: 'bg-red-200 text-red-700' },
  pink: { bg: 'rgba(252,231,243,0.35)', border: '#f472b6', title: '#9d174d', badge: 'bg-pink-200 text-pink-700' },
};

const SectionNode = ({ data, selected }: NodeProps<NodeData>) => {
  const color = data.color || 'blue';
  const theme = SECTION_COLORS[color] || SECTION_COLORS.blue;

  return (
    <>
      <NodeResizer
        color={theme.border}
        isVisible={selected}
        minWidth={350}
        minHeight={250}
        lineStyle={{ borderStyle: 'dashed', borderWidth: 2 }}
        handleStyle={{ width: 10, height: 10, borderRadius: 5 }}
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
          className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl"
          style={{ borderBottom: `1px dashed ${theme.border}`, pointerEvents: 'auto' }}
        >
          <Group className="w-4 h-4" style={{ color: theme.title }} />
          <span
            className="font-bold text-sm tracking-tight"
            style={{ color: theme.title }}
          >
            {data.label || 'Section'}
          </span>
          {data.subLabel && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${theme.badge}`}>
              {data.subLabel}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(SectionNode);
