import React, { memo } from 'react';
import { Handle, Position } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import { NodeData } from '@/lib/types';
import { Rows3 } from 'lucide-react';
import { NamedIcon } from './IconMap';
import {
  getConnectorHandleStyle,
  getHandlePointerEvents,
  getV2HandleVisibilityClass,
} from './handleInteraction';
import { NodeTransformControls } from './NodeTransformControls';
import { useActiveNodeSelection } from './useActiveNodeSelection';

const LANE_COLORS = [
  { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', label: 'Blue' },
  { bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'Green' },
  { bg: '#fefce8', border: '#fde047', text: '#854d0e', label: 'Yellow' },
  { bg: '#fdf2f8', border: '#f9a8d4', text: '#9d174d', label: 'Pink' },
  { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6', label: 'Violet' },
];

const SwimlaneNode = ({ id, data, selected }: LegacyNodeProps<NodeData>) => {
  const isActiveSelected = useActiveNodeSelection(Boolean(selected));
  const handlePointerEvents = getHandlePointerEvents(true, isActiveSelected);
  const handleVisibilityClass = getV2HandleVisibilityClass(isActiveSelected, {
    includeConnectingState: false,
    includeScale: false,
  });
  const colorIndex = parseInt(id.replace(/\D/g, ''), 10) || 0;
  const lane = LANE_COLORS[colorIndex % LANE_COLORS.length];

  const iconName = data.icon || 'Rows3';

  return (
    <>
      <NodeTransformControls isVisible={Boolean(selected)} minWidth={300} minHeight={200} />
      <div
        className={`
          w-full h-full rounded-xl border-2 transition-all duration-200 overflow-hidden
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
          {iconName ? (
            <NamedIcon
              name={iconName}
              fallbackName="Rows3"
              className="w-4 h-4 flow-lod-far-target"
              style={{ color: lane.text }}
            />
          ) : (
            <Rows3 className="w-4 h-4 flow-lod-far-target" style={{ color: lane.text }} />
          )}
          <span className="font-bold text-sm uppercase tracking-wider" style={{ color: lane.text }}>
            {data.label || 'Swimlane'}
          </span>
          {data.subLabel && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto flow-lod-secondary"
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
        <div className="w-full flex-1 p-4" style={{ minHeight: 150, pointerEvents: 'none' }} />
      </div>

      {/* Handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-target"
        className={`!w-3 !h-3 !border-2 !border-white transition-opacity ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('top', isActiveSelected, handlePointerEvents)}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={`!w-3 !h-3 !border-2 !border-white transition-opacity ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('bottom', isActiveSelected, handlePointerEvents)}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-target"
        className={`!w-3 !h-3 !border-2 !border-white transition-opacity ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('left', isActiveSelected, handlePointerEvents)}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={`!w-3 !h-3 !border-2 !border-white transition-opacity ${handleVisibilityClass}`}
        style={getConnectorHandleStyle('right', isActiveSelected, handlePointerEvents)}
      />
    </>
  );
};

export default memo(SwimlaneNode);
