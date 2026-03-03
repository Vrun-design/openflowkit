import { useCallback, useState } from 'react';
import type { Edge } from 'reactflow';
import { useReactFlow } from 'reactflow';
import type { FlowNode } from '@/lib/types';
import { createId } from '@/lib/id';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import { createDefaultEdge } from '@/constants';
import { getElkLayout } from '@/services/elkLayout';
import { generateDiagramFromChat, type ChatMessage } from '@/services/aiService';
import { useFlowStore } from '@/store';
import { useToast } from '@/components/ui/ToastContext';
import { trackEvent } from '@/lib/analytics';

interface SimplifiedNode {
  id: string;
  type?: string;
  label?: string;
  description?: string;
  x: number;
  y: number;
}

interface ParsedFlowResult {
  nodes: FlowNode[];
  edges: Edge[];
}

function buildSimplifiedNodes(nodes: FlowNode[]): SimplifiedNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    label: node.data.label,
    description: node.data.subLabel,
    x: node.position.x,
    y: node.position.y,
  }));
}

function buildCurrentGraphPayload(nodes: SimplifiedNode[], edges: Edge[]): string {
  return JSON.stringify({
    nodes,
    edges: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
  });
}

function parseDslOrThrow(dslText: string): ParsedFlowResult {
  const cleanDsl = dslText.replace(/```(yaml|flowmind|)?/g, '').replace(/```/g, '').trim();
  const parseResult = parseOpenFlowDSL(cleanDsl);
  if (parseResult.error) {
    throw new Error(parseResult.error);
  }
  return {
    nodes: parseResult.nodes as FlowNode[],
    edges: parseResult.edges,
  };
}

function buildIdMap(parsedNodes: FlowNode[], existingNodes: FlowNode[]): Map<string, string> {
  const idMap = new Map<string, string>();
  parsedNodes.forEach((parsedNode) => {
    const existingNode = existingNodes.find((node) => {
      return node.data.label?.toLowerCase() === parsedNode.data.label?.toLowerCase();
    });
    idMap.set(parsedNode.id, existingNode ? existingNode.id : parsedNode.id);
  });
  return idMap;
}

function toFinalNodes(parsedNodes: FlowNode[], idMap: Map<string, string>): FlowNode[] {
  return parsedNodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) || node.id,
    type: node.type || 'process',
  }));
}

function toFinalEdges(parsedEdges: Edge[], idMap: Map<string, string>, globalEdgeOptions: ReturnType<typeof useFlowStore.getState>['globalEdgeOptions']): Edge[] {
  return parsedEdges
    .map((edge) => {
      const sourceId = idMap.get(edge.source);
      const targetId = idMap.get(edge.target);

      if (!sourceId || !targetId) {
        console.warn(`Skipping edge with missing node: ${edge.source} -> ${edge.target}`);
        return null;
      }

      const defaultEdge = createDefaultEdge(sourceId, targetId);
      let edgeType = edge.type;
      if (edgeType === 'default' || !edgeType) {
        edgeType = globalEdgeOptions.type === 'default' ? undefined : globalEdgeOptions.type;
      }
      if (edge.data?.styleType === 'curved') {
        edgeType = 'default';
      }

      return {
        ...defaultEdge,
        ...edge,
        id: createId(`e-${sourceId}-${targetId}`),
        source: sourceId,
        target: targetId,
        type: edgeType,
        animated: edge.animated || globalEdgeOptions.animated,
        style: {
          ...defaultEdge.style,
          ...edge.style,
          strokeWidth: globalEdgeOptions.strokeWidth,
          ...(globalEdgeOptions.color ? { stroke: globalEdgeOptions.color } : {}),
        },
      } as Edge;
    })
    .filter((edge): edge is Edge => edge !== null);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unknown error';
}

export function useAIGeneration(recordHistory: () => void) {
  const { nodes, edges, setNodes, setEdges, aiSettings, globalEdgeOptions } = useFlowStore();
  const { fitView } = useReactFlow();
  const { addToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const handleAIRequest = useCallback(async (prompt: string, imageBase64?: string) => {
    recordHistory();
    setIsGenerating(true);

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: prompt }],
    };

    try {
      const simplifiedNodes = buildSimplifiedNodes(nodes);
      const currentGraph = buildCurrentGraphPayload(simplifiedNodes, edges);
      const dslText = await generateDiagramFromChat(
        chatMessages,
        prompt,
        currentGraph,
        imageBase64,
        aiSettings.apiKey,
        aiSettings.model,
        aiSettings.provider || 'gemini',
        aiSettings.customBaseUrl
      );

      if (imageBase64) {
        userMessage.parts[0].text += ' [Image Attached]';
      }

      setChatMessages((previousMessages) => [
        ...previousMessages,
        userMessage,
        { role: 'model', parts: [{ text: dslText }] },
      ]);

      const parsed = parseDslOrThrow(dslText);
      const idMap = buildIdMap(parsed.nodes, nodes);
      const finalNodes = toFinalNodes(parsed.nodes, idMap);
      const finalEdges = toFinalEdges(parsed.edges, idMap, globalEdgeOptions);

      const layoutedNodes = await getElkLayout(finalNodes, finalEdges, {
        direction: 'TB',
        algorithm: 'mrtree',
        spacing: 'loose',
      });

      setNodes(layoutedNodes);
      setEdges(finalEdges);
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);

      trackEvent('ai_generate_success', { model: aiSettings.model, provider: aiSettings.provider });
      addToast('Diagram generated successfully!', 'success');
    } catch (error: unknown) {
      const errorMessage = toErrorMessage(error);
      trackEvent('ai_generate_error', {
        error_message: errorMessage,
        model: aiSettings.model,
        provider: aiSettings.provider,
      });
      console.error('AI Generation failed:', error);
      addToast(`Failed to generate: ${errorMessage}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [
    addToast,
    aiSettings.apiKey,
    aiSettings.customBaseUrl,
    aiSettings.model,
    aiSettings.provider,
    chatMessages,
    edges,
    fitView,
    globalEdgeOptions,
    nodes,
    recordHistory,
    setEdges,
    setNodes,
  ]);

  return { isGenerating, handleAIRequest, chatMessages, clearChat };
}
