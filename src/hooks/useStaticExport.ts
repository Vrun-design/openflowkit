import { useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import { buildExportFileName } from '@/lib/exportFileName';
import { copyDataUrlToClipboard } from './flow-export/exportCapture';
import { CanvasCaptureError, captureActiveCanvas } from './flow-export/activeCanvasCapture';
import type { FlowNode } from '@/lib/types';

const logger = createLogger({ scope: 'useStaticExport' });

export interface StaticImageExportOptions {
  transparentBackground?: boolean;
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export const useStaticExport = (
  nodes: FlowNode[],
  reactFlowWrapper: React.RefObject<HTMLDivElement>,
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  exportBaseName: string | undefined
) => {
  const run = useCallback(
    async (
      format: 'png' | 'jpeg' | 'svg',
      exportOptions: StaticImageExportOptions | undefined,
      verb: 'download' | 'copy',
      deliver: (dataUrl: string) => Promise<void> | void
    ) => {
      const label = format.toUpperCase();
      addToast(`Preparing ${label} ${verb}…`, 'info');
      try {
        const dataUrl = await captureActiveCanvas(nodes, reactFlowWrapper.current, format, {
          transparentBackground: exportOptions?.transparentBackground,
        });
        await deliver(dataUrl);
        addToast(verb === 'copy' ? `Diagram copied as ${label}!` : `Diagram exported as ${label}!`, 'success');
      } catch (error) {
        logger.error('Export failed.', { error, format, verb });
        addToast(
          error instanceof CanvasCaptureError
            ? error.message
            : verb === 'copy' ? `Failed to copy ${label}. Please try again.` : `Failed to export ${label}. Please try again.`,
          'error'
        );
      }
    },
    [addToast, nodes, reactFlowWrapper]
  );

  const handleExport = useCallback(
    (format: 'png' | 'jpeg' = 'png', exportOptions?: StaticImageExportOptions) =>
      void run(format, exportOptions, 'download', (dataUrl) =>
        downloadDataUrl(dataUrl, buildExportFileName(exportBaseName, format === 'jpeg' ? 'jpg' : 'png'))),
    [exportBaseName, run]
  );

  const handleCopyImage = useCallback(
    (format: 'png' | 'jpeg' = 'png', exportOptions?: StaticImageExportOptions) =>
      void run(format, exportOptions, 'copy', copyDataUrlToClipboard),
    [run]
  );

  const handleSvgExport = useCallback(
    () => void run('svg', undefined, 'download', (dataUrl) =>
      downloadDataUrl(dataUrl, buildExportFileName(exportBaseName, 'svg'))),
    [exportBaseName, run]
  );

  const handleCopySvg = useCallback(
    () => void run('svg', undefined, 'copy', copyDataUrlToClipboard),
    [run]
  );

  return { handleExport, handleCopyImage, handleSvgExport, handleCopySvg };
};
