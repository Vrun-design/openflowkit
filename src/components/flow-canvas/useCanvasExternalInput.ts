import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/ToastContext';
import { useCanvasActions } from '@/store/canvasHooks';
import { useMermaidDiagnosticsActions, useSelectionActions } from '@/store/selectionHooks';
import { useActiveTabId, useTabActions } from '@/store/tabHooks';
import { useCanvasViewSettings } from '@/store/viewHooks';
import { useFlowCanvasDragDrop } from './useFlowCanvasDragDrop';
import { useFlowCanvasPaste } from './useFlowCanvasPaste';

interface UseCanvasExternalInputParams {
  readonly recordHistory: () => void;
  readonly screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  readonly fitView: (options?: { duration?: number; padding?: number }) => void;
  readonly handleAddImage: (
    imageUrl: string,
    position: { x: number; y: number },
    imageAssetId?: string
  ) => void;
  readonly pasteSelection: (center?: { x: number; y: number }) => void;
  /** Client-space centre of the visible canvas, for pastes with no pointer. */
  readonly getCanvasCenterScreen: () => { x: number; y: number };
  /** Client-space point of the last pointer interaction, if any. */
  readonly getLastInteractionScreen: () => { x: number; y: number } | null;
}

/**
 * Everything that enters the canvas from outside — dropped files and
 * clipboard text/Mermaid/JSON — composed once so React Flow and OpenCanvas
 * accept the same input the same way.
 */
export function useCanvasExternalInput({
  recordHistory,
  screenToFlowPosition,
  fitView,
  handleAddImage,
  pasteSelection,
  getCanvasCenterScreen,
  getLastInteractionScreen,
}: UseCanvasExternalInputParams) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { setNodes, setEdges } = useCanvasActions();
  const { setSelectedNodeId } = useSelectionActions();
  const { setMermaidDiagnostics, clearMermaidDiagnostics } = useMermaidDiagnosticsActions();
  const activeTabId = useActiveTabId();
  const { updateTab } = useTabActions();
  const { architectureStrictMode, mermaidImportMode } = useCanvasViewSettings();

  const { onDragOver, onDrop } = useFlowCanvasDragDrop({
    screenToFlowPosition,
    handleAddImage,
    onImageDropError: (message) => addToast(message, 'error'),
  });

  const getCanvasCenterFlowPosition = useCallback(
    () => screenToFlowPosition(getCanvasCenterScreen()),
    [getCanvasCenterScreen, screenToFlowPosition]
  );
  const getLastInteractionFlowPosition = useCallback(() => {
    const position = getLastInteractionScreen();
    return position ? screenToFlowPosition(position) : null;
  }, [getLastInteractionScreen, screenToFlowPosition]);

  const { handleCanvasPaste } = useFlowCanvasPaste({
    architectureStrictMode,
    mermaidImportMode,
    activeTabId,
    fitView,
    updateTab,
    recordHistory,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setMermaidDiagnostics,
    clearMermaidDiagnostics,
    addToast,
    strictModePasteBlockedMessage: t(
      'flowCanvas.strictModePasteBlocked',
      'Architecture strict mode blocked Mermaid paste. Open Code view, fix diagnostics, then retry.'
    ),
    pasteSelection,
    getLastInteractionFlowPosition,
    getCanvasCenterFlowPosition,
  });

  return { onDragOver, onDrop, onPasteCapture: handleCanvasPaste };
}
