import { useCallback } from 'react';
import { ingestUserMediaFile } from '@/services/storage/assetStore';
import { reportStorageTelemetry } from '@/services/storage/storageTelemetry';

interface UseFlowCanvasDragDropParams {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  handleAddImage: (imageUrl: string, position: { x: number; y: number }, imageAssetId?: string) => void;
  onFileDrop?: (file: File, content: string) => void;
  onImageDropError?: (message: string) => void;
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
  onImageDropError,
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
          .catch((error) => {
            // Leave the canvas unchanged so the user can retry, but say so —
            // a drop that silently does nothing reads as a broken app.
            const message = error instanceof Error ? error.message : String(error);
            reportStorageTelemetry({
              area: 'persist',
              code: 'ASSET_DROP_INGEST_FAILED',
              severity: 'warning',
              message: `Image drop ingest failed: ${message}`,
            });
            onImageDropError?.(message || 'Could not add that image.');
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
    [handleAddImage, screenToFlowPosition, onFileDrop, onImageDropError]
  );

  return { onDragOver, onDrop };
}
