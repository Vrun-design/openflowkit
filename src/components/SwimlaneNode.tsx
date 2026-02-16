import React, { memo } from 'react';
import { NodeProps, NodeResizer, Handle, Position } from 'reactflow';
import { NodeData } from '@/lib/types';
import { Rows3 } from 'lucide-react';
import { ICON_MAP } from './IconMap';

const LANE_COLORS = [
    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', label: 'Blue' },
    { bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'Green' },
    { bg: '#fefce8', border: '#fde047', text: '#854d0e', label: 'Yellow' },
    { bg: '#fdf2f8', border: '#f9a8d4', text: '#9d174d', label: 'Pink' },
    { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6', label: 'Violet' },
];

const SwimlaneNode = ({ id, data, selected }: NodeProps<NodeData>) => {
    const colorIndex = parseInt(id.replace(/\D/g, ''), 10) || 0;
    const lane = LANE_COLORS[colorIndex % LANE_COLORS.length];

    const Icon = data.icon && ICON_MAP[data.icon] ? ICON_MAP[data.icon] : Rows3;

    return (
        <>
            <NodeResizer
                color={lane.border}
                isVisible={selected}
                minWidth={300}
                minHeight={200}
                lineStyle={{ borderStyle: 'solid', borderWidth: 2 }}
                handleStyle={{ width: 10, height: 10, borderRadius: 5 }}
            />
            <div
                className={`
          w-full h-full rounded-xl border-2 transition-all duration-200 overflow-hidden
          ${selected ? 'ring-2 ring-offset-2' : ''}
        `}
                style={{
                    backgroundColor: lane.bg,
                    borderColor: lane.border,
                    minWidth: 300,
                    minHeight: 200,
                }}
            >
                {/* Lane header */}
                <div
                    className="flex items-center gap-2 px-4 py-2.5"
                    style={{
                        borderBottom: `2px solid ${lane.border}`,
                        backgroundColor: `${lane.border}20`,
                        pointerEvents: 'auto',
                    }}
                >
                    <Icon className="w-4 h-4" style={{ color: lane.text }} />
                    <span
                        className="font-bold text-sm uppercase tracking-wider"
                        style={{ color: lane.text }}
                    >
                        {data.label || 'Swimlane'}
                    </span>
                    {data.subLabel && (
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto"
                            style={{
                                backgroundColor: `${lane.border}30`,
                                color: lane.text,
                            }}
                        >
                            {data.subLabel}
                        </span>
                    )}
                </div>

                {/* Lane body - content area for child nodes */}
                <div
                    className="w-full flex-1 p-4"
                    style={{ minHeight: 150, pointerEvents: 'none' }}
                />
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity" style={{ backgroundColor: lane.border }} />
            <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity" style={{ backgroundColor: lane.border }} />
            <Handle type="target" position={Position.Left} id="left-target" className="!w-3 !h-3 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity" style={{ backgroundColor: lane.border }} />
            <Handle type="source" position={Position.Right} id="right-source" className="!w-3 !h-3 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity" style={{ backgroundColor: lane.border }} />
        </>
    );
};

export default memo(SwimlaneNode);
