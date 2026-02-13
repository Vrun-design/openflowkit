import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types';
import { ICON_MAP } from '../IconMap';
import { HelpCircle } from 'lucide-react';

const IconNode = ({ data, selected }: NodeProps<NodeData>) => {
    // Determine the icon component
    const IconComponent = ICON_MAP[data.label] || HelpCircle;

    // Size logic could be enhanced, default to 48 for good visibility
    const size = 48;
    const color = data.color || 'slate';

    // Map color names to tailwind classes if needed, or use inline styles 
    // For now simple mapping
    const colorMap: Record<string, string> = {
        slate: 'text-slate-600',
        blue: 'text-blue-600',
        red: 'text-red-600',
        green: 'text-green-600',
        emerald: 'text-emerald-600',
        amber: 'text-amber-600',
        purple: 'text-purple-600',
        pink: 'text-pink-600',
    };
    const textColor = colorMap[color] || 'text-slate-600';

    return (
        <div className={`relative p-2 rounded flex items-center justify-center
            ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
            ${textColor}
        `}>
            <Handle type="target" position={Position.Top} className="opacity-0 hover:opacity-100 w-2 h-2 bg-current" />
            <Handle type="target" position={Position.Left} className="opacity-0 hover:opacity-100 w-2 h-2 bg-current" />

            <IconComponent size={size} strokeWidth={1.5} />

            <Handle type="source" position={Position.Right} className="opacity-0 hover:opacity-100 w-2 h-2 bg-current" />
            <Handle type="source" position={Position.Bottom} className="opacity-0 hover:opacity-100 w-2 h-2 bg-current" />
        </div>
    );
};

export default memo(IconNode);
