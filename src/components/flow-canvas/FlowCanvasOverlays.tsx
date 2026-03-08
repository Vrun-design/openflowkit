import React, { Suspense, lazy } from 'react';
import type { NodeData } from '@/lib/types';
import type { ConnectMenuState, ContextMenuState } from './useFlowCanvasMenus';
import type { UseFlowCanvasContextActionsResult } from './useFlowCanvasContextActions';
import { FlowCanvasAlignmentGuidesOverlay } from './FlowCanvasAlignmentGuidesOverlay';
import type { AlignmentGuides, SelectionDragPreview } from './alignmentGuides';
import type { FlowNode } from '@/lib/types';

const LazyConnectMenu = lazy(async () => {
    const module = await import('../ConnectMenu');
    return { default: module.ConnectMenu };
});

const LazyContextMenu = lazy(async () => {
    const module = await import('../ContextMenu');
    return { default: module.ContextMenu };
});

interface FlowCanvasOverlaysProps {
    alignmentGuidesEnabled: boolean;
    alignmentGuides: AlignmentGuides;
    overlayNodes: FlowNode[];
    selectionDragPreview: SelectionDragPreview;
    zoom: number;
    viewportX: number;
    viewportY: number;
    connectMenu: ConnectMenuState | null;
    setConnectMenu: (menu: ConnectMenuState | null) => void;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    handleAddAndConnect: (
        type: string,
        position: { x: number; y: number },
        sourceId?: string,
        sourceHandle?: string,
        shape?: NodeData['shape']
    ) => void;
    contextMenu: ContextMenuState;
    onCloseContextMenu: () => void;
    copySelection: () => void;
    contextActions: UseFlowCanvasContextActionsResult;
}

export function FlowCanvasOverlays({
    alignmentGuidesEnabled,
    alignmentGuides,
    overlayNodes,
    selectionDragPreview,
    zoom,
    viewportX,
    viewportY,
    connectMenu,
    setConnectMenu,
    screenToFlowPosition,
    handleAddAndConnect,
    contextMenu,
    onCloseContextMenu,
    copySelection,
    contextActions,
}: FlowCanvasOverlaysProps): React.ReactElement {
    return (
        <>
            <FlowCanvasAlignmentGuidesOverlay
                enabled={alignmentGuidesEnabled}
                alignmentGuides={alignmentGuides}
                selectionDragPreview={selectionDragPreview}
                nodes={overlayNodes}
                zoom={zoom}
                viewportX={viewportX}
                viewportY={viewportY}
            />

            {connectMenu ? (
                <Suspense fallback={null}>
                    <LazyConnectMenu
                        position={connectMenu.position}
                        sourceType={connectMenu.sourceType}
                        onClose={() => setConnectMenu(null)}
                        onSelect={(type, shape) => {
                            const flowPos = screenToFlowPosition(connectMenu.position);
                            handleAddAndConnect(type, flowPos, connectMenu.sourceId, connectMenu.sourceHandle, shape as NodeData['shape']);
                        }}
                    />
                </Suspense>
            ) : null}

            {contextMenu.isOpen ? (
                <Suspense fallback={null}>
                    <LazyContextMenu
                        {...contextMenu}
                        onClose={onCloseContextMenu}
                        onCopy={copySelection}
                        onPaste={contextActions.onPaste}
                        onDuplicate={contextActions.onDuplicate}
                        onDelete={contextActions.onDelete}
                        onSendToBack={contextActions.onSendToBack}
                        canPaste={true}
                        selectedCount={contextActions.selectedCount}
                        onAlignNodes={contextActions.onAlignNodes}
                        onDistributeNodes={contextActions.onDistributeNodes}
                        onGroupSelected={contextActions.onGroupSelected}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
