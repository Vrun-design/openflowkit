import React, { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, useNodes } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { ChevronDown, ChevronRight, FolderOpen, FolderClosed } from 'lucide-react';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { getConnectorHandleStyle, getHandlePointerEvents, getV2HandleVisibilityClass } from './handleInteraction';
import { NodeTransformControls } from './NodeTransformControls';
import { useActiveNodeSelection } from './useActiveNodeSelection';

const GROUP_HANDLE_CONFIG: Array<{
    id: string;
    position: Position;
    side: 'top' | 'right' | 'bottom' | 'left';
}> = [
    { id: 'top-target', position: Position.Top, side: 'top' },
    { id: 'right-source', position: Position.Right, side: 'right' },
    { id: 'bottom-source', position: Position.Bottom, side: 'bottom' },
    { id: 'left-target', position: Position.Left, side: 'left' },
];

function GroupNode({ id, data, selected }: LegacyNodeProps<NodeData>): React.ReactElement {
    const [collapsed, setCollapsed] = useState(false);
    const { setNodes } = useReactFlow();
    const allNodes = useNodes();
    const visualQualityV2Enabled = ROLLOUT_FLAGS.visualQualityV2;
    const isActiveSelected = useActiveNodeSelection(Boolean(selected));
    const handlePointerEvents = getHandlePointerEvents(visualQualityV2Enabled, isActiveSelected);
    const handleVisibilityClass = visualQualityV2Enabled
        ? getV2HandleVisibilityClass(isActiveSelected, { includeConnectingState: false, includeScale: false })
        : 'opacity-0 hover:opacity-100';

    // Count children
    const childCount = useMemo(
        () => allNodes.filter((n) => getNodeParentId(n) === id).length,
        [allNodes, id]
    );

    const toggleCollapse = useCallback(() => {
        const next = !collapsed;
        setCollapsed(next);
        // Toggle visibility of child nodes
        setNodes((nds) =>
            nds.map((n) => {
                if (getNodeParentId(n) === id) {
                    return { ...n, hidden: next };
                }
                return n;
            })
        );
    }, [collapsed, id, setNodes]);

    return (
        <>
            <NodeTransformControls
                isVisible={Boolean(selected)}
                minWidth={300}
                minHeight={collapsed ? 60 : 200}
            />
            <div
                className={`
          w-full rounded-2xl border-2 transition-all duration-300 overflow-hidden
          ${collapsed ? 'border-solid' : 'border-dashed'}
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
                            <ChevronRight className="w-4 h-4 text-[var(--brand-primary)] flow-lod-far-target" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--brand-primary)] flow-lod-far-target" />
                        )}
                    </button>
                    {collapsed ? (
                        <FolderClosed className="w-4 h-4 text-[var(--brand-primary)] flow-lod-far-target" />
                    ) : (
                        <FolderOpen className="w-4 h-4 text-[var(--brand-primary)] flow-lod-far-target" />
                    )}
                    <span className="font-bold text-sm text-indigo-700 tracking-tight">
                        {data.label || 'Group'}
                    </span>
                    {data.subLabel && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 flow-lod-secondary">
                            {data.subLabel}
                        </span>
                    )}
                    <span className="ml-auto text-[10px] font-medium text-indigo-400 flow-lod-secondary">
                        {childCount} {childCount === 1 ? 'node' : 'nodes'}
                    </span>
                </div>

                {/* Collapsed summary */}
                {collapsed && (
                    <div className="px-4 py-1 text-xs text-slate-400 flow-lod-secondary" style={{ pointerEvents: 'auto' }}>
                        Click to expand
                    </div>
                )}
            </div>

            {/* Handles for group connections */}
            {GROUP_HANDLE_CONFIG.map(({ id: handleId, position, side }) => (
                <Handle
                    key={handleId}
                    type="source"
                    position={position}
                    id={handleId}
                    isConnectableStart
                    isConnectableEnd
                    className={`!w-3 !h-3 !border-2 !border-white transition-opacity ${handleVisibilityClass}`}
                    style={getConnectorHandleStyle(side, isActiveSelected, handlePointerEvents)}
                />
            ))}
        </>
    );
}

export default memo(GroupNode);
