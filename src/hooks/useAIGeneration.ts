
import { useState, useCallback } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { generateDiagramFromChat, ChatMessage } from '../services/geminiService';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import { getElkLayout } from '../services/elkLayout';
import { createDefaultEdge } from '../constants';
import { useFlowStore } from '../store';

import { useToast } from '../components/ui/ToastContext';

export const useAIGeneration = (
  recordHistory: () => void
) => {
  const { nodes, edges, setNodes, setEdges, brandConfig, globalEdgeOptions } = useFlowStore();
  const { fitView } = useReactFlow();
  const { addToast } = useToast();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const clearChat = useCallback(() => setChatMessages([]), []);

  const handleAIRequest = useCallback(async (prompt: string, imageBase64?: string) => {
    recordHistory();
    setIsGenerating(true);

    // Create user message
    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: prompt }]
    };

    try {
      // 1. Prepare context
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
      // const focusedContextJSON = selectedNodes.length > 0 ? JSON.stringify(selectedNodes) : undefined;

      // 2. Call AI (now using chat)
      const dslText = await generateDiagramFromChat(chatMessages, prompt, currentGraph, imageBase64, brandConfig.apiKey);

      // 3. Update Chat History
      const finalUserMessage = { ...userMessage };
      if (imageBase64) {
        finalUserMessage.parts[0].text += " [Image Attached]";
      }

      const modelMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: dslText }]
      };

      setChatMessages(prev => [...prev, finalUserMessage, modelMessage]);

      // 4. Parse DSL
      // Strip markdown code blocks if present
      const cleanDSL = dslText.replace(/```(yaml|flowmind|)?/g, '').replace(/```/g, '').trim();

      // Use the wrapped V2 parser
      const parseResult = parseOpenFlowDSL(cleanDSL);

      if (parseResult.error) {
        throw new Error(parseResult.error);
      }

      // 5. Merge Logic: Preserve IDs for existing labels
      // We expect the AI to try and preserve labels.
      // V2 parser prefers explicit IDs but handles implicit ones via label mapping.

      const idMap = new Map<string, string>();

      parseResult.nodes.forEach(newNode => {
        // Try to match by label to preserve existing node states if possible
        const existingNode = nodes.find(n => n.data.label?.toLowerCase() === newNode.data.label?.toLowerCase());
        if (existingNode) {
          idMap.set(newNode.id, existingNode.id);
        } else {
          // New node
          idMap.set(newNode.id, newNode.id);
        }
      });

      // Reconstruct nodes with mapped IDs
      const finalNodes = parseResult.nodes.map(n => ({
        ...n,
        id: idMap.get(n.id)!,
        type: n.type || 'process'
      }));

      // Reconstruct edges with mapped IDs
      const finalEdges = parseResult.edges.map(e => {
        const sourceId = idMap.get(e.source);
        const targetId = idMap.get(e.target);

        if (!sourceId || !targetId) {
          console.warn(`Skipping edge with missing node: ${e.source} -> ${e.target}`);
          return null;
        }

        // Apply Global Default if parser returns 'default'
        let edgeType = e.type;
        if (edgeType === 'default' || !edgeType) {
          edgeType = globalEdgeOptions.type === 'default' ? undefined : globalEdgeOptions.type;
        }

        // Preserve specific styles (curved/dashed) if recognized by attributes
        if (e.data?.styleType === 'curved') edgeType = 'default'; // ReactFlow default is bezier/curved

        return {
          ...e,
          source: sourceId,
          target: targetId,
          type: edgeType,
          animated: e.animated || globalEdgeOptions.animated,
          style: {
            ...e.style,
            strokeWidth: globalEdgeOptions.strokeWidth,
            ...(globalEdgeOptions.color ? { stroke: globalEdgeOptions.color } : {})
          },
          id: `e-${sourceId}-${targetId}-${Date.now()}` // Ensure unique edge ID
        };
      }).filter(Boolean) as Edge[];


      // 6. Apply Auto-Layout (ELK) - CRITICAL for V2 which returns (0,0)
      const layoutedNodes = await getElkLayout(finalNodes, finalEdges, {
        direction: 'TB',
        algorithm: 'layered',
        spacing: 'normal'
      });

      setNodes(layoutedNodes);
      setEdges(finalEdges);

      // Wait for render then fit view
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);

      addToast('Diagram generated successfully!', 'success');
    } catch (error: any) {
      console.error('AI Generation failed:', error);
      addToast(`Failed to generate: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [nodes, edges, recordHistory, setNodes, setEdges, fitView, addToast, chatMessages, brandConfig.apiKey, globalEdgeOptions]);

  return { isAIOpen, setIsAIOpen, isGenerating, handleAIRequest, chatMessages, clearChat };
};
