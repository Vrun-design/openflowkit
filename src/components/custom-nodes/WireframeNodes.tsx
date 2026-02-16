import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { NodeData } from '@/lib/types';
import * as Icons from 'lucide-react';

// --- Helper for Handles ---
const DefaultHandles = () => (
    <>
        <Handle type="target" position={Position.Top} className="opacity-0 hover:opacity-100 w-2 h-2 bg-indigo-400" />
        <Handle type="target" position={Position.Left} className="opacity-0 hover:opacity-100 w-2 h-2 bg-indigo-400" />
        <Handle type="source" position={Position.Right} className="opacity-0 hover:opacity-100 w-2 h-2 bg-indigo-400" />
        <Handle type="source" position={Position.Bottom} className="opacity-0 hover:opacity-100 w-2 h-2 bg-indigo-400" />
    </>
);

// --- Wireframe Button ---
export const WireframeButtonNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    return (
        <div className={`relative px-4 py-2 bg-blue-500 rounded text-white font-medium text-sm shadow-sm flex items-center justify-center text-center
            ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
            style={{ minWidth: 80 }}
        >
            <DefaultHandles />
            {data.label || 'Button'}
        </div>
    );
});

// --- Wireframe Input ---
export const WireframeInputNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    return (
        <div className={`relative px-3 py-2 bg-white border border-slate-300 rounded text-slate-500 text-sm shadow-sm flex items-center text-left
             ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
            style={{ minWidth: 120 }}
        >
            <DefaultHandles />
            {data.label || 'Input field...'}
        </div>
    );
});

// --- Wireframe Image ---
export const WireframeImageNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    return (
        <>
            <NodeResizer isVisible={selected} minWidth={50} minHeight={50} />
            <div className={`relative bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 overflow-hidden
                 ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                style={{ width: '100%', height: '100%', minWidth: 50, minHeight: 50 }}
            >
                <DefaultHandles />
                <Icons.Image size={24} />
                {data.label && <span className="absolute bottom-1 text-[10px]">{data.label}</span>}
            </div>
        </>
    );
});

// --- Wireframe Icon (Placeholder) ---
// This is different from the specific IconNode which uses the full Lucide library.
// This is for generic wireframing.
export const WireframeIconNode = memo(({ data, selected }: NodeProps<NodeData>) => {
    const IconComponent = (Icons as any)[data.label] || Icons.Circle;

    return (
        <div className={`relative p-1 text-slate-700 flex items-center justify-center
             ${selected ? 'ring-2 ring-indigo-500 ring-offset-1 rounded' : ''}`}
        >
            <DefaultHandles />
            <IconComponent size={32} />
        </div>
    );
});
