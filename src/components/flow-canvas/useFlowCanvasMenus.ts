import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Edge, Node } from '@/lib/reactflowCompat';
import type { ContextMenuProps } from '@/components/ContextMenu';
import { useFlowStore } from '@/store';

export interface ConnectMenuState {
    position: { x: number; y: number };
    sourceId: string;
    sourceHandle: string | null;
    sourceType: string | null;
}

export type ContextMenuState = ContextMenuProps & { isOpen: boolean };

interface UseFlowCanvasMenusParams {
    initialContextType?: ContextMenuProps['type'];
    onPaneSelectionClear?: () => void;
}

export interface UseFlowCanvasMenusResult {
    connectMenu: ConnectMenuState | null;
    setConnectMenu: (value: ConnectMenuState | null) => void;
    contextMenu: ContextMenuState;
    onNodeContextMenu: (event: MouseEvent, node: Node) => void;
    onSelectionContextMenu: (event: MouseEvent, nodes: Node[]) => void;
    onPaneContextMenu: (event: MouseEvent) => void;
    onEdgeContextMenu: (event: MouseEvent, edge: Edge) => void;
    onPaneClick: () => void;
    onCloseContextMenu: () => void;
}

export function useFlowCanvasMenus({
    initialContextType = 'pane',
    onPaneSelectionClear,
}: UseFlowCanvasMenusParams = {}): UseFlowCanvasMenusResult {
    const [connectMenu, setConnectMenu] = useState<ConnectMenuState | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        id: null,
        type: initialContextType,
        position: { x: 0, y: 0 },
        onClose: () => undefined,
        isOpen: false,
    });

    const onCloseContextMenu = useCallback(() => {
        setContextMenu((previous) => ({ ...previous, isOpen: false }));
    }, []);

    const onNodeContextMenu = useCallback((event: MouseEvent, node: Node) => {
        event.preventDefault();
        // If multiple nodes are selected, show multi-select menu instead
        const { nodes: allNodes } = useFlowStore.getState();
        const selectedCount = allNodes.filter((n) => n.selected).length;
        if (selectedCount > 1) {
            setContextMenu({
                id: node.id,
                type: 'multi',
                position: { x: event.clientX, y: event.clientY },
                onClose: onCloseContextMenu,
                isOpen: true,
            });
            return;
        }
        setContextMenu({
            id: node.id,
            type: 'node',
            currentNodeType: node.type ?? null,
            isSectionLocked: node.type === 'section' && node.data?.sectionLocked === true,
            isSectionHidden: node.type === 'section' && node.data?.sectionHidden === true,
            hasParentSection: typeof node.parentId === 'string' && node.parentId.length > 0,
            position: { x: event.clientX, y: event.clientY },
            onClose: onCloseContextMenu,
            isOpen: true,
        });
    }, [onCloseContextMenu]);

    const onSelectionContextMenu = useCallback((event: MouseEvent, nodes: Node[]) => {
        event.preventDefault();
        setContextMenu({
            id: nodes[0]?.id ?? null,
            type: 'multi',
            position: { x: event.clientX, y: event.clientY },
            onClose: onCloseContextMenu,
            isOpen: true,
        });
    }, [onCloseContextMenu]);

    const onPaneContextMenu = useCallback((event: MouseEvent) => {
        event.preventDefault();
        setContextMenu({
            id: null,
            type: 'pane',
            position: { x: event.clientX, y: event.clientY },
            onClose: onCloseContextMenu,
            isOpen: true,
        });
    }, [onCloseContextMenu]);

    const onEdgeContextMenu = useCallback((event: MouseEvent, edge: Edge) => {
        event.preventDefault();
        setContextMenu({
            id: edge.id,
            type: 'edge',
            position: { x: event.clientX, y: event.clientY },
            onClose: onCloseContextMenu,
            isOpen: true,
        });
    }, [onCloseContextMenu]);

    const onPaneClick = useCallback(() => {
        onCloseContextMenu();
        onPaneSelectionClear?.();
    }, [onCloseContextMenu, onPaneSelectionClear]);

    return {
        connectMenu,
        setConnectMenu,
        contextMenu,
        onNodeContextMenu,
        onSelectionContextMenu,
        onPaneContextMenu,
        onEdgeContextMenu,
        onPaneClick,
        onCloseContextMenu,
    };
}
