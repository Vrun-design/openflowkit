import React from 'react';
import { NodeResizer, useNodeId } from '@/lib/reactflowCompat';
import { useSelectedNodeId } from '@/store/selectionHooks';

interface NodeTransformControlsProps {
  isVisible?: boolean;
  minWidth: number;
  minHeight: number;
  keepAspectRatio?: boolean;
}

export function NodeTransformControls({
  isVisible = false,
  minWidth,
  minHeight,
  keepAspectRatio = false,
}: NodeTransformControlsProps): React.ReactElement | null {
  const nodeId = useNodeId();
  const selectedNodeId = useSelectedNodeId();
  const isStoreSelected = Boolean(nodeId) && selectedNodeId === nodeId;
  const shouldShow = Boolean(nodeId) && (isVisible || isStoreSelected);

  if (!shouldShow) {
    return null;
  }

  return (
    <NodeResizer
      isVisible={shouldShow}
      minWidth={minWidth}
      minHeight={minHeight}
      keepAspectRatio={keepAspectRatio}
      lineClassName="flow-node-resizer-line"
      handleClassName="flow-node-resizer-handle"
    />
  );
}
