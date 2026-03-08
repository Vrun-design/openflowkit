import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Edge, Node } from '@/lib/reactflowCompat';
import type { ContextMenuProps } from '@/components/ContextMenu';

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
        setContextMenu({
            id: node.id,
            type: 'node',
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
        onPaneContextMenu,
        onEdgeContextMenu,
        onPaneClick,
        onCloseContextMenu,
    };
}
