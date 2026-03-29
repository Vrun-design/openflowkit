import React from 'react';
import { Handle, Position } from '@/lib/reactflowCompat';
import {
  getConnectorHandleStyle,
  getHandlePointerEvents,
  getV2HandleVisibilityClass,
} from './handleInteraction';
import { useCinematicExportState } from '@/context/CinematicExportContext';
import { NodeTransformControls } from './NodeTransformControls';
import { useActiveNodeSelection } from './useActiveNodeSelection';
import { NodeQuickCreateButtons } from './NodeQuickCreateButtons';

type HandleSide = 'top' | 'right' | 'bottom' | 'left';

type HandleConfig = {
  id: string;
  position: Position;
  side: HandleSide;
};

type NodeChromeProps = {
  nodeId?: string;
  selected: boolean;
  minWidth: number;
  minHeight: number;
  keepAspectRatio?: boolean;
  showQuickCreateButtons?: boolean;
  handleClassName: string;
  handleVisibilityOptions?: {
    includeConnectingState?: boolean;
    includeScale?: boolean;
  };
  handleStyleExtras?: Partial<Record<HandleSide, React.CSSProperties>>;
  handles?: HandleConfig[];
  children: React.ReactNode;
};

const DEFAULT_HANDLES: HandleConfig[] = [
  { id: 'top', position: Position.Top, side: 'top' },
  { id: 'right', position: Position.Right, side: 'right' },
  { id: 'bottom', position: Position.Bottom, side: 'bottom' },
  { id: 'left', position: Position.Left, side: 'left' },
];

function getCinematicNodePresentation(params: {
  active: boolean;
  isVisible: boolean;
  isActive: boolean;
  progress: number;
}): Pick<React.CSSProperties, 'opacity' | 'transform' | 'filter'> {
  const { active, isVisible, isActive, progress } = params;

  if (!active) {
    return {
      opacity: 1,
      transform: 'translateY(0px) scale(1)',
      filter: undefined,
    };
  }

  if (!isActive) {
    return {
      opacity: isVisible ? 1 : 0,
      transform: 'translateY(0px) scale(1)',
      filter: undefined,
    };
  }

  const translateY = 8 * (1 - progress);
  const scale = 0.985 + 0.015 * progress;
  const glowRadius = 14 + Math.round(progress * 12);
  const bloomRadius = 5 + Math.round(progress * 7);

  return {
    opacity: Math.max(0, progress),
    transform: `translateY(${translateY}px) scale(${scale})`,
    filter: `drop-shadow(0 10px ${glowRadius}px rgba(59,130,246,0.18)) drop-shadow(0 0 ${bloomRadius}px rgba(96,165,250,0.24))`,
  };
}

export function NodeChrome({
  nodeId,
  selected,
  minWidth,
  minHeight,
  keepAspectRatio = false,
  showQuickCreateButtons = true,
  handleClassName,
  handleVisibilityOptions,
  handleStyleExtras,
  handles = DEFAULT_HANDLES,
  children,
}: NodeChromeProps): React.ReactElement {
  const cinematicExportState = useCinematicExportState();
  const isActiveSelected = useActiveNodeSelection(selected);
  const handlePointerEvents = getHandlePointerEvents(true, isActiveSelected);
  const handleVisibilityClass = getV2HandleVisibilityClass(
    isActiveSelected,
    handleVisibilityOptions
  );

  const isCinematicNodeVisible =
    !nodeId || !cinematicExportState.active || cinematicExportState.visibleNodeIds.has(nodeId);
  const isActiveCinematicNode =
    Boolean(nodeId) && cinematicExportState.active && cinematicExportState.activeNodeId === nodeId;
  const activeNodeProgress = isActiveCinematicNode ? cinematicExportState.activeNodeProgress : 0;
  const cinematicPresentation = getCinematicNodePresentation({
    active: cinematicExportState.active,
    isVisible: isCinematicNodeVisible,
    isActive: isActiveCinematicNode,
    progress: activeNodeProgress,
  });

  return (
    <div
      className="group relative h-full w-full"
      style={{
        opacity: cinematicPresentation.opacity,
        transform: cinematicPresentation.transform,
        transformOrigin: 'center center',
        filter: cinematicPresentation.filter,
      }}
    >
      <NodeTransformControls
        isVisible={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        keepAspectRatio={keepAspectRatio}
      />
      {nodeId && showQuickCreateButtons ? (
        <NodeQuickCreateButtons nodeId={nodeId} visible={selected} />
      ) : null}
      {children}
      {handles.map(({ id, position, side }) => (
        <Handle
          key={id}
          type="source"
          id={id}
          position={position}
          isConnectableStart
          isConnectableEnd
          className={`${handleClassName} ${handleVisibilityClass}`}
          style={getConnectorHandleStyle(
            side,
            isActiveSelected,
            handlePointerEvents,
            handleStyleExtras?.[side]
          )}
        />
      ))}
    </div>
  );
}
