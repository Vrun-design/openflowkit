import { useCallback } from 'react';

interface UseFlowCanvasDragDropParams {
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
    handleAddImage: (imageUrl: string, position: { x: number; y: number }) => void;
}

interface UseFlowCanvasDragDropResult {
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
}

export function useFlowCanvasDragDrop({
    screenToFlowPosition,
    handleAddImage,
}: UseFlowCanvasDragDropParams): UseFlowCanvasDragDropResult {
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const imageUrl = loadEvent.target?.result as string;
            if (!imageUrl) return;
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            handleAddImage(imageUrl, position);
        };
        reader.readAsDataURL(file);
    }, [handleAddImage, screenToFlowPosition]);

    return { onDragOver, onDrop };
}
