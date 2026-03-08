import { useNodeOperations } from './useNodeOperations';
import { useEdgeOperations } from './useEdgeOperations';
import { useLayoutOperations } from './useLayoutOperations';
import { useClipboardOperations } from './useClipboardOperations';
import { useTranslation } from 'react-i18next';
import { useFlowCoreActions } from './flow-operations/useFlowCoreActions';
import { useCanvasActions } from '@/store/canvasHooks';
import { useSelectionActions } from '@/store/selectionHooks';

export const useFlowOperations = (
  recordHistory: () => void,
  onShowConnectMenu?: (position: { x: number; y: number }, sourceId: string, sourceHandle: string | null, sourceType: string | null) => void
) => {
  const { t } = useTranslation();
  const { setNodes, setEdges } = useCanvasActions();
  const { setSelectedNodeId, setSelectedEdgeId } = useSelectionActions();

  // Compose specialized hooks
  const nodeOps = useNodeOperations(recordHistory);
  const edgeOps = useEdgeOperations(recordHistory, onShowConnectMenu);
  const layoutOps = useLayoutOperations(recordHistory);
  const clipboardOps = useClipboardOperations(recordHistory);
  const coreOps = useFlowCoreActions({
    setSelectedNodeId,
    setSelectedEdgeId,
    setNodes,
    setEdges,
    recordHistory,
    clearCanvasConfirmText: t('actions.clearCanvasConfirm'),
  });

  return {
    ...nodeOps,
    ...edgeOps,
    ...layoutOps,
    ...clipboardOps,
    ...coreOps,
  };
};
