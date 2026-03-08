import { useCallback, useRef } from 'react';
import { getCompatibleNodesBounds, useReactFlow } from '@/lib/reactflowCompat';
import { toPng, toJpeg } from 'html-to-image';
import { useFlowStore } from '../store';
import { useCanvasActions, useCanvasState } from '@/store/canvasHooks';
import { useActiveTabId, useTabActions } from '@/store/tabHooks';
import { useViewSettings } from '@/store/viewHooks';
import { orderGraphForSerialization } from '@/services/canonicalSerialization';
import { createDiagramDocument, parseDiagramDocumentImport } from '@/services/diagramDocument';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import {
  buildImportFidelityReport,
  mapErrorToIssue,
  mapWarningToIssue,
  persistLatestImportReport,
  summarizeImportReport,
} from '@/services/importFidelity';

import { useToast } from '../components/ui/ToastContext';

export const useFlowExport = (
  recordHistory: () => void,
  reactFlowWrapper: React.RefObject<HTMLDivElement>
) => {
  const { nodes, edges } = useCanvasState();
  const { setNodes, setEdges } = useCanvasActions();
  const viewSettings = useViewSettings();
  const activeTabId = useActiveTabId();
  const { updateTab } = useTabActions();
  const { fitView } = useReactFlow();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback((format: 'png' | 'jpeg' = 'png') => {
    if (!reactFlowWrapper.current) return;
    reactFlowWrapper.current.classList.add('exporting');

    setTimeout(() => {
      const bounds = getCompatibleNodesBounds(nodes);
      const padding = 80;
      const width = (bounds.width || 800) + padding * 2;
      const height = (bounds.height || 600) + padding * 2;
      const flowViewport = document.querySelector('.react-flow__viewport') as HTMLElement;

      if (!flowViewport) {
        reactFlowWrapper.current?.classList.remove('exporting');
        return;
      }

      const options = {
        backgroundColor: format === 'png' ? null : '#ffffff', // PNG transparent, JPG white
        width,
        height,
        style: {
          transform: `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(1)`,
          width: `${width}px`,
          height: `${height}px`,
        },
        pixelRatio: 3, // Default to High-Res (4K)
        filter: (node: HTMLElement) => {
          if (node.classList) {
            if (
              node.classList.contains('react-flow__controls') ||
              node.classList.contains('react-flow__minimap') ||
              node.classList.contains('react-flow__attribution') ||
              node.classList.contains('react-flow__background')
            ) {
              return false;
            }
          }
          return true;
        },
      };

      const exportPromise = format === 'png' ? toPng(flowViewport, options) : toJpeg(flowViewport, options);

      exportPromise
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `flowmind-diagram.${format === 'jpeg' ? 'jpg' : 'png'}`;
          link.href = dataUrl;
          link.click();
          addToast(`Diagram exported as ${format.toUpperCase()}!`, 'success');
        })
        .catch((err) => {
          console.error('Export failed:', err);
          addToast('Failed to export. Please try again.', 'error');
        })
        .finally(() => {
          reactFlowWrapper.current?.classList.remove('exporting');
        });
    }, 300);
  }, [nodes, reactFlowWrapper, addToast]);

  // --- JSON Export ---
  const handleExportJSON = useCallback(() => {
    const { nodes: orderedNodes, edges: orderedEdges } = orderGraphForSerialization(
      nodes,
      edges,
      viewSettings.exportSerializationMode
    );
    const doc = createDiagramDocument(orderedNodes, orderedEdges);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'flowmind-diagram.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, viewSettings.exportSerializationMode]);

  // --- JSON Import ---
  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const importStart = performance.now();
        void (async () => {
          try {
            const raw = JSON.parse(ev.target?.result as string);
            const parsed = parseDiagramDocumentImport(raw);
            const { nodes: composedNodes, edges: composedEdges } = await composeDiagramForDisplay(
              parsed.nodes,
              parsed.edges,
              {
                diagramType: parsed.diagramType,
              }
            );
            recordHistory();
            setNodes(composedNodes);
            setEdges(composedEdges);
            updateTab(activeTabId, { diagramType: parsed.diagramType });
            parsed.warnings.forEach((message) => addToast(message, 'warning'));
            const report = buildImportFidelityReport({
              source: 'json',
              nodeCount: composedNodes.length,
              edgeCount: composedEdges.length,
              elapsedMs: Math.round(performance.now() - importStart),
              issues: parsed.warnings.map((warning) => mapWarningToIssue(warning)),
            });
            persistLatestImportReport(report);
            addToast(summarizeImportReport(report), report.summary.warningCount > 0 ? 'warning' : 'success');
            addToast('Diagram loaded successfully!', 'success');
            setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to parse JSON file. Please check the format.';
            const report = buildImportFidelityReport({
              source: 'json',
              nodeCount: 0,
              edgeCount: 0,
              elapsedMs: Math.round(performance.now() - importStart),
              issues: [mapErrorToIssue(message)],
            });
            persistLatestImportReport(report);
            addToast(summarizeImportReport(report), 'error');
            addToast(message, 'error');
          }
        })();
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [recordHistory, setNodes, setEdges, fitView, addToast, activeTabId, updateTab]
  );

  return { fileInputRef, handleExport, handleExportJSON, handleImportJSON, onFileImport };
};
