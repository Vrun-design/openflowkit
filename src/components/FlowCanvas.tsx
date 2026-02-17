import React, { useMemo, useState, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    SelectionMode,
    MarkerType,
    useReactFlow,
    Node,
    Edge,
    ConnectionMode
} from 'reactflow';
import { useFlowStore } from '../store';
import { NodeData } from '../lib/types';
import { useFlowOperations } from '../hooks/useFlowOperations';
import { useModifierKeys } from '../hooks/useModifierKeys';
import { useEdgeInteractions } from '../hooks/useEdgeInteractions';
import CustomNode from './CustomNode';
import AnnotationNode from './AnnotationNode';
import SectionNode from './SectionNode';
import TextNode from './TextNode';
import GroupNode from './GroupNode';
import SwimlaneNode from './SwimlaneNode';
import ImageNode from './ImageNode';

import BrowserNode from './custom-nodes/BrowserNode';
import MobileNode from './custom-nodes/MobileNode';
import IconNode from './custom-nodes/IconNode';
import { WireframeButtonNode, WireframeInputNode, WireframeImageNode, WireframeIconNode } from './custom-nodes/WireframeNodes';
import { CustomBezierEdge, CustomSmoothStepEdge, CustomStepEdge } from './CustomEdge';
import CustomConnectionLine from './CustomConnectionLine';
import { ConnectMenu } from './ConnectMenu';
import { ContextMenu, ContextMenuProps } from './ContextMenu';
import { NavigationControls } from './NavigationControls';
import { MINIMAP_NODE_COLORS, NODE_WIDTH, NODE_HEIGHT } from '../constants';

interface FlowCanvasProps {
    undo: () => void;
    redo: () => void;
    canUndo: boolean; // For keyboard shortcuts check?
    canRedo: boolean;
    recordHistory: () => void;
    isSelectMode: boolean;
}

const nodeTypes = {
    start: CustomNode,
    process: CustomNode,
    decision: CustomNode,
    end: CustomNode,
    custom: CustomNode,
    annotation: AnnotationNode,
    section: SectionNode,
    text: TextNode,
    group: GroupNode,
    swimlane: SwimlaneNode,
    image: ImageNode,

    browser: BrowserNode,
    mobile: MobileNode,
    wireframe_button: WireframeButtonNode,
    wireframe_input: WireframeInputNode,
    wireframe_image: WireframeImageNode,
    wireframe_icon: WireframeIconNode,
    icon: IconNode,
};

const edgeTypes = {
    default: CustomBezierEdge,
    smoothstep: CustomSmoothStepEdge,
    step: CustomStepEdge,
};

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
    undo,
    redo,
    recordHistory,
    isSelectMode
}) => {
    const {
        nodes, edges,
        onNodesChange, onEdgesChange,
        selectedNodeId, selectedEdgeId,
        viewSettings: { showGrid, snapToGrid, showMiniMap },
        setSelectedNodeId // Used by context menu? No, operations handle it
    } = useFlowStore();

    const { fitView } = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // --- Connection Menu State ---
    const [connectMenu, setConnectMenu] = useState<{ position: { x: number; y: number }, sourceId: string, sourceHandle: string | null } | null>(null);

    // --- Context Menu State ---
    const [contextMenu, setContextMenu] = useState<ContextMenuProps & { isOpen: boolean }>({
        id: null,
        type: 'pane',
        position: { x: 0, y: 0 },
        onClose: () => { },
        isOpen: false,
    });

    const { screenToFlowPosition } = useReactFlow();

    // --- Operations ---
    const {
        onConnect, onSelectionChange, onNodeDoubleClick,
        onNodeDragStart, onNodeDragStop,
        onConnectStart, onConnectEnd,
        handleAddAndConnect, handleAddNode,
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

    // --- Drag & Drop ---
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const file = event.dataTransfer.files?.[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageUrl = e.target?.result as string;
                    if (imageUrl) {
                        const position = screenToFlowPosition({
                            x: event.clientX,
                            y: event.clientY,
                        });
                        handleAddImage(imageUrl, position);
                    }
                };
                reader.readAsDataURL(file);
            }
        },
        [screenToFlowPosition, handleAddImage]
    );

    // --- Keyboard Shortcuts ---
    const { isSelectionModifierPressed } = useModifierKeys();
    useEdgeInteractions();

    const isEffectiveSelectMode = isSelectMode || isSelectionModifierPressed;

    // --- Context Menu Handlers ---
    const closeContextMenu = useCallback(
        () => setContextMenu((prev) => ({ ...prev, isOpen: false })),
        []
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            setContextMenu({
                id: node.id,
                type: 'node',
                position: { x: event.clientX, y: event.clientY },
                onClose: closeContextMenu,
                isOpen: true,
            });
        },
        [closeContextMenu]
    );

    const onPaneContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            setContextMenu({
                id: null,
                type: 'pane',
                position: { x: event.clientX, y: event.clientY },
                onClose: closeContextMenu,
                isOpen: true,
            });
        },
        [closeContextMenu]
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.preventDefault();
            setContextMenu({
                id: edge.id,
                type: 'edge',
                position: { x: event.clientX, y: event.clientY },
                onClose: closeContextMenu,
                isOpen: true,
            });
        },
        [closeContextMenu]
    );

    const onCloseContextMenu = closeContextMenu;
    const onPaneClick = useCallback(() => {
        closeContextMenu();
    }, [closeContextMenu]);


    const [isConnecting, setIsConnecting] = useState(false);

    const onConnectStartWrapper = useCallback((event: any, params: any) => {
        setIsConnecting(true);
        onConnectStart(event, params);
    }, [onConnectStart]);

    const onConnectEndWrapper = useCallback((event: any) => {
        setIsConnecting(false);
        onConnectEnd(event);
    }, [onConnectEnd]);

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
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                className="bg-[var(--brand-background)]"
                minZoom={0.1}
                connectionMode={ConnectionMode.Loose}
                isValidConnection={(connection) => {
                    return !edges.some(e =>
                        e.source === connection.source &&
                        e.target === connection.target &&
                        e.sourceHandle === connection.sourceHandle &&
                        e.targetHandle === connection.targetHandle
                    );
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
                        onPaste={() => {
                            if (contextMenu.position) {
                                pasteSelection(screenToFlowPosition(contextMenu.position));
                            }
                            onCloseContextMenu();
                        }}
                        onDuplicate={() => {
                            if (contextMenu.id) duplicateNode(contextMenu.id);
                            onCloseContextMenu();
                        }}
                        onDelete={() => {
                            if (contextMenu.id) {
                                if (contextMenu.type === 'edge') deleteEdge(contextMenu.id);
                                else deleteNode(contextMenu.id);
                            }
                            onCloseContextMenu();
                        }}
                        onSendToBack={() => {
                            if (contextMenu.id) updateNodeZIndex(contextMenu.id, 'back');
                            onCloseContextMenu();
                        }}
                        canPaste={true}
                        selectedCount={nodes.filter(n => n.selected).length}
                        onAlignNodes={(dir) => { handleAlignNodes(dir); onCloseContextMenu(); }}
                        onDistributeNodes={(dir) => { handleDistributeNodes(dir); onCloseContextMenu(); }}
                        onGroupSelected={() => { handleGroupNodes(); onCloseContextMenu(); }}
                    />
                )
            }
        </div>
    );
};
