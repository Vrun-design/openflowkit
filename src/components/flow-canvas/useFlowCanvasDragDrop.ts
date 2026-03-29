import { useCallback } from 'react';

interface UseFlowCanvasDragDropParams {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  handleAddImage: (imageUrl: string, position: { x: number; y: number }) => void;
  onFileDrop?: (file: File, content: string) => void;
}

interface UseFlowCanvasDragDropResult {
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const CODE_EXTENSIONS = new Set([
  'sql',
  'tfstate',
  'tf',
  'hcl',
  'yaml',
  'yml',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'py',
  'go',
  'java',
  'rb',
  'cs',
  'cpp',
  'cc',
  'cxx',
  'rs',
  'json',
]);

export function useFlowCanvasDragDrop({
  screenToFlowPosition,
  handleAddImage,
  onFileDrop,
}: UseFlowCanvasDragDropParams): UseFlowCanvasDragDropResult {
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      if (file.type.startsWith('image/')) {
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
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (CODE_EXTENSIONS.has(ext) && onFileDrop) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const content = loadEvent.target?.result;
          if (typeof content === 'string') {
            onFileDrop(file, content);
          }
        };
        reader.readAsText(file);
      }
    },
    [handleAddImage, screenToFlowPosition, onFileDrop]
  );

  return { onDragOver, onDrop };
}
