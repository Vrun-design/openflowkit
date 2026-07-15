import { useCallback } from 'react';
import { ingestUserMediaFile } from '@/services/storage/assetStore';

interface UseFlowCanvasDragDropParams {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  handleAddImage: (imageUrl: string, position: { x: number; y: number }, imageAssetId?: string) => void;
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
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        void ingestUserMediaFile(file, 'image', { fileName: file.name })
          .then((result) => {
            handleAddImage(
              result.assetId ? '' : result.displayUrl,
              position,
              result.assetId
            );
          })
          .catch(() => {
            // Ignore failed drops; user can retry via the add-image control.
          });
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
