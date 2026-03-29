import React, { Suspense, lazy } from 'react';
import { useViewport } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import type { ConnectMenuState, ContextMenuState } from './useFlowCanvasMenus';
import type { UseFlowCanvasContextActionsResult } from './useFlowCanvasContextActions';
import { FlowCanvasAlignmentGuidesOverlay } from './FlowCanvasAlignmentGuidesOverlay';
import type { AlignmentGuides, SelectionDragPreview } from './alignmentGuides';
import type { FlowNode } from '@/lib/types';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { ConnectedEdgePreset } from '@/hooks/edge-operations/utils';

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
  connectMenu: ConnectMenuState | null;
  setConnectMenu: (menu: ConnectMenuState | null) => void;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  handleAddAndConnect: (
    type: string,
    position: { x: number; y: number },
    sourceId?: string,
    sourceHandle?: string,
    shape?: NodeData['shape'],
    edgePreset?: ConnectedEdgePreset
  ) => void;
  handleAddDomainLibraryItemAndConnect: (
    item: DomainLibraryItem,
    position: { x: number; y: number },
    sourceId?: string,
    sourceHandle?: string
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
  connectMenu,
  setConnectMenu,
  screenToFlowPosition,
  handleAddAndConnect,
  handleAddDomainLibraryItemAndConnect,
  contextMenu,
  onCloseContextMenu,
  copySelection,
  contextActions,
}: FlowCanvasOverlaysProps): React.ReactElement {
  const { zoom, x: viewportX, y: viewportY } = useViewport();
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
            sourceId={connectMenu.sourceId}
            sourceType={connectMenu.sourceType}
            onClose={() => setConnectMenu(null)}
            onSelect={(type, shape, edgePreset) => {
              const flowPos = screenToFlowPosition(connectMenu.position);
              handleAddAndConnect(
                type,
                flowPos,
                connectMenu.sourceId,
                connectMenu.sourceHandle,
                shape as NodeData['shape'],
                edgePreset
              );
            }}
            onSelectAsset={(item) => {
              const flowPos = screenToFlowPosition(connectMenu.position);
              handleAddDomainLibraryItemAndConnect(
                item,
                flowPos,
                connectMenu.sourceId,
                connectMenu.sourceHandle
              );
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
            onChangeNodeType={contextActions.onChangeNodeType}
            onEditLabel={contextActions.onEditLabel}
            onFitSectionToContents={contextActions.onFitSectionToContents}
            onBringContentsIntoSection={contextActions.onBringContentsIntoSection}
            onReleaseFromSection={contextActions.onReleaseFromSection}
            onToggleSectionLock={contextActions.onToggleSectionLock}
            onToggleSectionHidden={contextActions.onToggleSectionHidden}
            canPaste={true}
            selectedCount={contextActions.selectedCount}
            onAlignNodes={contextActions.onAlignNodes}
            onDistributeNodes={contextActions.onDistributeNodes}
            onGroupSelected={contextActions.onGroupSelected}
            onWrapInSection={contextActions.onWrapInSection}
          />
        </Suspense>
      ) : null}
    </>
  );
}
