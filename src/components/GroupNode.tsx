import React, { memo, useState, useCallback, useMemo } from 'react';
import { NodeProps, NodeResizer, Handle, Position, useReactFlow, useNodes } from 'reactflow';
import { NodeData } from '@/lib/types';
import { ChevronDown, ChevronRight, FolderOpen, FolderClosed, Layers } from 'lucide-react';
import { ICON_MAP } from './IconMap';
import { NODE_COLOR_PALETTE } from '../theme';

const GroupNode = ({ id, data, selected }: NodeProps<NodeData>) => {
    const [collapsed, setCollapsed] = useState(false);
    const { setNodes } = useReactFlow();
    const allNodes = useNodes();

    const color = data.color || 'indigo';
    const style = NODE_COLOR_PALETTE[color] || NODE_COLOR_PALETTE.indigo || NODE_COLOR_PALETTE.slate;

    // Count children
    const childCount = useMemo(
        () => allNodes.filter((n) => n.parentNode === id).length,
        [allNodes, id]
    );

    const toggleCollapse = useCallback(() => {
        const next = !collapsed;
        setCollapsed(next);
        // Toggle visibility of child nodes
        setNodes((nds) =>
            nds.map((n) => {
                if (n.parentNode === id) {
                    return { ...n, hidden: next };
                }
                return n;
            })
        );
    }, [collapsed, id, setNodes]);

    const IconComponent = data.icon && ICON_MAP[data.icon] ? ICON_MAP[data.icon] : Layers;

    return (
        <>
            <NodeResizer
                color="#6366f1"
                isVisible={selected}
                minWidth={300}
                minHeight={collapsed ? 60 : 200}
                lineStyle={{ borderStyle: 'dashed', borderWidth: 2 }}
                handleStyle={{ width: 10, height: 10, borderRadius: 5 }}
            />
            <div
                className={`
          w-full rounded-2xl border-2 transition-all duration-300 overflow-hidden
          ${collapsed ? 'border-solid' : 'border-dashed'}
          ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
        `}
                style={{
                    minWidth: 300,
                    minHeight: collapsed ? 60 : 200,
                    height: collapsed ? 60 : '100%',
                    backgroundColor: collapsed ? '#f8fafc' : '#f1f5f9',
                    borderColor: '#a5b4fc',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none hover:bg-indigo-50/50 transition-colors"
                    onClick={toggleCollapse}
                    style={{ borderBottom: collapsed ? 'none' : '2px dashed #a5b4fc', pointerEvents: 'auto' }}
                >
                    <button className="p-0.5 rounded hover:bg-indigo-100 transition-colors">
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4 text-indigo-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-indigo-500" />
                        )}
                    </button>
                    {collapsed ? (
                        <FolderClosed className="w-4 h-4 text-indigo-500" />
                    ) : (
                        <FolderOpen className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="font-bold text-sm text-indigo-700 tracking-tight">
                        {data.label || 'Group'}
                    </span>
                    {data.subLabel && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                            {data.subLabel}
                        </span>
                    )}
                    <span className="ml-auto text-[10px] font-medium text-indigo-400">
                        {childCount} {childCount === 1 ? 'node' : 'nodes'}
                    </span>
                </div>

                {/* Collapsed summary */}
                {collapsed && (
                    <div className="px-4 py-1 text-xs text-slate-400" style={{ pointerEvents: 'auto' }}>
                        Click to expand
                    </div>
                )}
            </div>

            {/* Handles for group connections */}
            <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !border-2 !border-white !bg-indigo-400 opacity-0 hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !border-2 !border-white !bg-indigo-400 opacity-0 hover:opacity-100 transition-opacity" />
            <Handle type="target" position={Position.Left} id="left-target" className="!w-3 !h-3 !border-2 !border-white !bg-indigo-400 opacity-0 hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Right} id="right-source" className="!w-3 !h-3 !border-2 !border-white !bg-indigo-400 opacity-0 hover:opacity-100 transition-opacity" />
        </>
    );
};

export default memo(GroupNode);
