import { useCallback, useRef } from 'react';
import { Node, Edge, getRectOfNodes } from 'reactflow';
import { toPng, toJpeg } from 'html-to-image';

import { useToast } from '../components/ui/ToastContext';

export const useFlowExport = (
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  recordHistory: () => void,
  fitView: (opts?: any) => void,
  reactFlowWrapper: React.RefObject<HTMLDivElement>
) => {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback((format: 'png' | 'jpeg' = 'png') => {
    if (!reactFlowWrapper.current) return;
    reactFlowWrapper.current.classList.add('exporting');

    setTimeout(() => {
      const bounds = getRectOfNodes(nodes);
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
        filter: (node: any) => {
          if (node?.classList) {
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
    const doc = {
      version: '1.0',
      name: 'FlowMind Diagram',
      createdAt: new Date().toISOString(),
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'flowmind-diagram.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

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
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (!parsed.nodes || !parsed.edges) {
            addToast('Invalid flow file: missing nodes or edges.', 'error');
            return;
          }
          recordHistory();
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          addToast('Diagram loaded successfully!', 'success');
          setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
        } catch {
          addToast('Failed to parse JSON file. Please check the format.', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [recordHistory, setNodes, setEdges, fitView, addToast]
  );

  return { fileInputRef, handleExport, handleExportJSON, handleImportJSON, onFileImport };
};
