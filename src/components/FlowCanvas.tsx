import React, { useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    SelectionMode,
    MarkerType,
    useReactFlow,
    ConnectionMode
} from 'reactflow';
import { useFlowStore } from '../store';
import { NodeData } from '../lib/types';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useModifierKeys } from '../hooks/useModifierKeys';
import { useEdgeInteractions } from '../hooks/useEdgeInteractions';
import CustomConnectionLine from './CustomConnectionLine';
import { ConnectMenu } from './ConnectMenu';
import { ContextMenu } from './ContextMenu';
import { NavigationControls } from './NavigationControls';
import { MINIMAP_NODE_COLORS } from '../constants';
import { flowCanvasEdgeTypes, flowCanvasNodeTypes, isDuplicateConnection } from './flow-canvas/flowCanvasTypes';
import { useFlowCanvasMenus } from './flow-canvas/useFlowCanvasMenus';
import { useFlowCanvasDragDrop } from './flow-canvas/useFlowCanvasDragDrop';
import { useFlowCanvasConnectionState } from './flow-canvas/useFlowCanvasConnectionState';
import { useFlowCanvasContextActions } from './flow-canvas/useFlowCanvasContextActions';

interface FlowCanvasProps {
    recordHistory: () => void;
    isSelectMode: boolean;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
    recordHistory,
    isSelectMode
}) => {
    const {
        nodes, edges,
        onNodesChange, onEdgesChange,
        viewSettings: { showGrid, snapToGrid, showMiniMap },
    } = useFlowStore();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const { screenToFlowPosition } = useReactFlow();
    const {
        connectMenu,
        setConnectMenu,
        contextMenu,
        onNodeContextMenu,
        onPaneContextMenu,
        onEdgeContextMenu,
        onPaneClick,
        onCloseContextMenu,
    } = useFlowCanvasMenus();

    // --- Operations ---
    const {
        onConnect, onSelectionChange, onNodeDoubleClick,
        onNodeDragStart, onNodeDragStop,
        onConnectStart, onConnectEnd,
        handleAddAndConnect,
        deleteNode, deleteEdge, duplicateNode,
        updateNodeZIndex,
        pasteSelection, copySelection,
        handleAlignNodes, handleDistributeNodes, handleGroupNodes,
        onEdgeUpdate,
        onNodeDrag,
        handleAddImage
    } = useFlowOperations(
        recordHistory,
        (position, sourceId, sourceHandle) => setConnectMenu({ position, sourceId, sourceHandle })
    );

    const { onDragOver, onDrop } = useFlowCanvasDragDrop({
        screenToFlowPosition,
        handleAddImage,
    });

    // --- Keyboard Shortcuts ---
    const { isSelectionModifierPressed } = useModifierKeys();
    useEdgeInteractions();

    const isEffectiveSelectMode = isSelectMode || isSelectionModifierPressed;
    const { isConnecting, onConnectStartWrapper, onConnectEndWrapper } = useFlowCanvasConnectionState({
        onConnectStart: (event, params) => {
            onConnectStart(event as Parameters<typeof onConnectStart>[0], params as Parameters<typeof onConnectStart>[1]);
        },
        onConnectEnd: (event) => {
            onConnectEnd(event as Parameters<typeof onConnectEnd>[0]);
        },
    });
    const contextActions = useFlowCanvasContextActions({
        contextMenu,
        onCloseContextMenu,
        screenToFlowPosition,
        copySelection,
        pasteSelection,
        duplicateNode,
        deleteNode,
        deleteEdge,
        updateNodeZIndex,
        handleAlignNodes,
        handleDistributeNodes,
        handleGroupNodes,
        nodes,
    });

    return (
        <div className={`w-full h-full relative ${isConnecting ? 'is-connecting' : ''}`} ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeUpdate={onEdgeUpdate}
                onSelectionChange={onSelectionChange}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                onPaneClick={onPaneClick}

                onConnectStart={onConnectStartWrapper}
                onConnectEnd={onConnectEndWrapper}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={flowCanvasNodeTypes}
                edgeTypes={flowCanvasEdgeTypes}
                fitView
                className="bg-[var(--brand-background)]"
                minZoom={0.1}
                connectionMode={ConnectionMode.Loose}
                isValidConnection={(connection) => {
                    return !isDuplicateConnection(connection, edges);
                }}
                selectionOnDrag={isEffectiveSelectMode}
                panOnDrag={!isEffectiveSelectMode}
                selectionMode={isEffectiveSelectMode ? SelectionMode.Partial : undefined}
                multiSelectionKeyCode="Alt"
                defaultEdgeOptions={{
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                    animated: false,
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                }}
                connectionLineComponent={CustomConnectionLine}
                snapToGrid={snapToGrid}
            >
                {showGrid && <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />}
                <NavigationControls />
                {showMiniMap && (
                    <MiniMap
                        nodeColor={(n) => MINIMAP_NODE_COLORS[n.type ?? ''] ?? '#64748b'}
                        maskColor="rgba(241, 245, 249, 0.7)"
                        className="border border-slate-200 shadow-lg rounded-lg overflow-hidden"
                    />
                )}
            </ReactFlow>

            {connectMenu && (
                <ConnectMenu
                    position={connectMenu.position}
                    onClose={() => setConnectMenu(null)}
                    onSelect={(type, shape) => {
                        if (connectMenu) {
                            const flowPos = screenToFlowPosition(connectMenu.position);
                            handleAddAndConnect(type, flowPos, connectMenu.sourceId, connectMenu.sourceHandle, shape as NodeData['shape']);
                        }
                    }}
                />
            )}
            {
                contextMenu.isOpen && (
                    <ContextMenu
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
                )
            }
        </div>
    );
};
