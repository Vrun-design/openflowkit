import { useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { buildExportFileName } from '@/lib/exportFileName';
import { copyDataUrlToClipboard, createExportOptions } from './flow-export/exportCapture';
import { resolveFlowExportViewport } from './flowExportViewport';
import type { FlowNode } from '@/lib/types';

const logger = createLogger({ scope: 'useStaticExport' });

export const useStaticExport = (
  nodes: FlowNode[],
  reactFlowWrapper: React.RefObject<HTMLDivElement>,
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  exportBaseName: string | undefined
) => {
  const handleExport = useCallback(
    (format: 'png' | 'jpeg' = 'png') => {
      const { viewport: flowViewport, message } = resolveFlowExportViewport(
        reactFlowWrapper.current
      );
      if (!flowViewport) {
        addToast(message ?? 'The canvas viewport could not be found.', 'error');
        return;
      }

      reactFlowWrapper.current.classList.add('exporting');
      addToast(`Preparing ${format.toUpperCase()} download…`, 'info');

      setTimeout(() => {
        const { options } = createExportOptions(nodes, format);

        const exportPromise =
          format === 'png' ? toPng(flowViewport, options) : toJpeg(flowViewport, options);

        exportPromise
          .then((dataUrl) => {
            const link = document.createElement('a');
            link.download = buildExportFileName(exportBaseName, format === 'jpeg' ? 'jpg' : 'png');
            link.href = dataUrl;
            link.click();
            addToast(`Diagram exported as ${format.toUpperCase()}!`, 'success');
          })
          .catch((err) => {
            logger.error('Export failed.', { error: err, format });
            addToast('Failed to export. Please try again.', 'error');
          })
          .finally(() => {
            reactFlowWrapper.current?.classList.remove('exporting');
          });
      }, 300);
    },
    [nodes, reactFlowWrapper, addToast, exportBaseName]
  );

  const handleCopyImage = useCallback(
    (format: 'png' | 'jpeg' = 'png') => {
      const { viewport: flowViewport, message } = resolveFlowExportViewport(
        reactFlowWrapper.current
      );
      if (!flowViewport) {
        addToast(message ?? 'The canvas viewport could not be found.', 'error');
        return;
      }

      reactFlowWrapper.current.classList.add('exporting');
      addToast(`Preparing ${format.toUpperCase()} copy…`, 'info');

      setTimeout(() => {
        const { options } = createExportOptions(nodes, format);
        const exportPromise =
          format === 'png' ? toPng(flowViewport, options) : toJpeg(flowViewport, options);

        exportPromise
          .then(async (dataUrl) => {
            await copyDataUrlToClipboard(dataUrl);
            addToast(`Diagram copied as ${format.toUpperCase()}!`, 'success');
          })
          .catch((err) => {
            logger.error('Clipboard image export failed.', { error: err, format });
            addToast('Failed to copy image. Please try again.', 'error');
          })
          .finally(() => {
            reactFlowWrapper.current?.classList.remove('exporting');
          });
      }, 300);
    },
    [nodes, reactFlowWrapper, addToast]
  );

  const handleSvgExport = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');
    addToast('Preparing SVG download…', 'info');

    setTimeout(() => {
      const { options } = createExportOptions(nodes, 'png');

      toSvg(flowViewport, { ...options, backgroundColor: null })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = buildExportFileName(exportBaseName, 'svg');
          link.href = dataUrl;
          link.click();
          addToast('Diagram exported as SVG!', 'success');
        })
        .catch((err) => {
          logger.error('SVG export failed.', { error: err });
          addToast('Failed to export SVG. Please try again.', 'error');
        })
        .finally(() => {
          reactFlowWrapper.current?.classList.remove('exporting');
        });
    }, 300);
  }, [nodes, reactFlowWrapper, addToast, exportBaseName]);

  const handleCopySvg = useCallback(() => {
    const { viewport: flowViewport, message } = resolveFlowExportViewport(reactFlowWrapper.current);
    if (!flowViewport) {
      addToast(message ?? 'The canvas viewport could not be found.', 'error');
      return;
    }

    reactFlowWrapper.current.classList.add('exporting');
    addToast('Preparing SVG copy…', 'info');

    setTimeout(() => {
      const { options } = createExportOptions(nodes, 'png');

      toSvg(flowViewport, { ...options, backgroundColor: null })
        .then(async (dataUrl) => {
          await copyDataUrlToClipboard(dataUrl);
          addToast('Diagram copied as SVG!', 'success');
        })
        .catch((err) => {
          logger.error('SVG clipboard export failed.', { error: err });
          addToast('Failed to copy SVG. Please try again.', 'error');
        })
        .finally(() => {
          reactFlowWrapper.current?.classList.remove('exporting');
        });
    }, 300);
  }, [nodes, reactFlowWrapper, addToast]);

  return { handleExport, handleCopyImage, handleSvgExport, handleCopySvg };
};
