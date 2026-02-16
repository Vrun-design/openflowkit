import { useState, useCallback } from 'react';
import { Node, Edge, useReactFlow } from 'reactflow';
import { generateDiagramFromChat, ChatMessage } from '../services/geminiService';
import { parseOpenFlowDSL } from '../services/openFlowDSLParser';
import { getElkLayout } from '../services/elkLayout';
import { createDefaultEdge } from '../constants';
import { useFlowStore } from '../store';

import { useToast } from '../components/ui/ToastContext';

export const useAIGeneration = (
  recordHistory: () => void
) => {
  const { nodes, edges, setNodes, setEdges, brandConfig } = useFlowStore();
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

    // Note: Image handling for history display is currently simplified.
    // The actual image data is passed directly to the service layer.

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
      const focusedContextJSON = selectedNodes.length > 0 ? JSON.stringify(selectedNodes) : undefined;

      // 2. Call AI (now using chat)
      const dslText = await generateDiagramFromChat(chatMessages, prompt, currentGraph, imageBase64, brandConfig.apiKey);

      // 3. Update Chat History
      // Add User Message (with image if present)
      const finalUserMessage = { ...userMessage };
      if (imageBase64) {
        // We can add a marker that there was an image, or the actual image data
        // For now let's just append [Image Uploaded] to text or similar
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
      const parseResult = parseOpenFlowDSL(cleanDSL);

      if (parseResult.error) {
        throw new Error(parseResult.error);
      }

      // 5. Merge Logic: Preserve IDs for existing labels
      // ... (Merge logic remains the same)

      const idMap = new Map<string, string>();

      parseResult.nodes.forEach(newNode => {
        const existingNode = nodes.find(n => n.data.label?.toLowerCase() === newNode.data.label?.toLowerCase());
        if (existingNode) {
          idMap.set(newNode.id, existingNode.id);
        } else {
          idMap.set(newNode.id, newNode.id);
        }
      });

      const finalNodes = parseResult.nodes.map(n => ({
        ...n,
        id: idMap.get(n.id)!,
        type: n.type || 'process'
      }));

      const finalEdges = parseResult.edges.map(e => ({
        ...e,
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        id: `e-${idMap.get(e.source)}-${idMap.get(e.target)}`
      }));


      // 6. Apply Auto-Layout (ELK)
      const layoutedNodes = await getElkLayout(finalNodes, finalEdges, {
        direction: 'TB',
        algorithm: 'layered',
        spacing: 'normal'
      });

      setNodes(layoutedNodes);
      setEdges(finalEdges);
      // setIsAIOpen(false); // Can keep it open for chat now!

      // Wait for render then fit view
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);

      addToast('Diagram generated successfully!', 'success');
    } catch (error: any) {
      console.error('AI Generation failed:', error);
      addToast(`Failed to generate: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [nodes, edges, recordHistory, setNodes, setEdges, fitView, addToast, chatMessages]);

  return { isAIOpen, setIsAIOpen, isGenerating, handleAIRequest, chatMessages, clearChat };
};
