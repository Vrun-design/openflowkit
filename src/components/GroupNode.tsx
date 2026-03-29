import React, { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, useReactFlow, useNodes } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { ChevronDown, ChevronRight, FolderOpen, FolderClosed } from 'lucide-react';
import {
  getConnectorHandleStyle,
  getHandlePointerEvents,
  getV2HandleVisibilityClass,
} from './handleInteraction';
import { NodeTransformControls } from './NodeTransformControls';
import { useActiveNodeSelection } from './useActiveNodeSelection';
import { resolveSectionVisualStyle } from '@/theme';

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
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const visualStyle = resolveSectionVisualStyle(data.color, data.colorMode, data.customColor, 'violet');
  const handlePointerEvents = getHandlePointerEvents(true, isActiveSelected);
  const handleVisibilityClass = getV2HandleVisibilityClass(isActiveSelected, {
    includeConnectingState: false,
    includeScale: false,
  });

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
          backgroundColor: visualStyle.bg,
          borderColor: visualStyle.border,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none transition-colors"
          onClick={toggleCollapse}
          style={{
            borderBottom: collapsed ? 'none' : `2px dashed ${visualStyle.border}`,
            pointerEvents: 'auto',
            backgroundColor: collapsed ? 'transparent' : `${visualStyle.badgeBg}55`,
          }}
        >
          <button className="p-0.5 rounded transition-colors" style={{ color: visualStyle.title }}>
            {collapsed ? (
              <ChevronRight className="w-4 h-4 flow-lod-far-target" />
            ) : (
              <ChevronDown className="w-4 h-4 flow-lod-far-target" />
            )}
          </button>
          {collapsed ? (
            <FolderClosed className="w-4 h-4 flow-lod-far-target" style={{ color: visualStyle.title }} />
          ) : (
            <FolderOpen className="w-4 h-4 flow-lod-far-target" style={{ color: visualStyle.title }} />
          )}
          <span className="font-bold text-sm tracking-tight" style={{ color: visualStyle.title }}>
            {data.label || 'Group'}
          </span>
          {data.subLabel && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flow-lod-secondary"
              style={{
                backgroundColor: visualStyle.badgeBg,
                color: visualStyle.badgeText,
              }}
            >
              {data.subLabel}
            </span>
          )}
          <span className="ml-auto text-[10px] font-medium flow-lod-secondary" style={{ color: visualStyle.title }}>
            {childCount} {childCount === 1 ? 'node' : 'nodes'}
          </span>
        </div>

        {/* Collapsed summary */}
        {collapsed && (
          <div
            className="px-4 py-1 text-xs text-[var(--brand-secondary)] flow-lod-secondary"
            style={{ pointerEvents: 'auto' }}
          >
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
