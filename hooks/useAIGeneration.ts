import { useState, useCallback } from 'react';
import { Node, Edge, MarkerType } from 'reactflow';
import { generateDiagramFromPrompt } from '../services/geminiService';
import { EDGE_STYLE, EDGE_LABEL_STYLE, EDGE_LABEL_BG_STYLE } from '../constants';

import { useToast } from '../components/ui/ToastContext';

export const useAIGeneration = (
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  recordHistory: () => void,
  fitView: (opts?: any) => void
) => {
  const { addToast } = useToast();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIRequest = useCallback(async (prompt: string) => {
    recordHistory();
    setIsGenerating(true);
    try {
      // ... logic ...
      const simplifiedNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data.label,
        description: n.data.subLabel,
        x: n.position.x,
        y: n.position.y
      }));

      const currentGraph = JSON.stringify({
        nodes: simplifiedNodes,
        edges: edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
      });

      const selectedNodes = simplifiedNodes.filter(n => nodes.find(orig => orig.id === n.id)?.selected);
      const focusedContextJSON = selectedNodes.length > 0 ? JSON.stringify(selectedNodes) : undefined;

      const result = await generateDiagramFromPrompt(prompt, currentGraph, focusedContextJSON);

      const newNodes: Node[] = result.nodes.map((n) => ({
        id: n.id,
        type: n.type || 'process',
        position: { x: n.x, y: n.y },
        data: { label: n.label, subLabel: n.description },
      }));

      const newEdges: Edge[] = result.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        style: EDGE_STYLE,
        labelStyle: EDGE_LABEL_STYLE,
        labelBgStyle: EDGE_LABEL_BG_STYLE,
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
      }));

      setNodes(newNodes);
      setEdges(newEdges);
      setIsAIOpen(false);
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
      addToast('Diagram generated successfully!', 'success');
    } catch (error) {
      console.error('AI Generation failed:', error);
      addToast('Failed to generate diagram. Please check your API key or try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [nodes, edges, recordHistory, setNodes, setEdges, fitView, addToast]);

  return { isAIOpen, setIsAIOpen, isGenerating, handleAIRequest };
};
