import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import { serializeCanvasContextForAI } from '@/services/ai/contextSerializer';
import { generateDiagramFromChat, type ChatMessage } from '@/services/aiService';
import type { FlowEdge, FlowNode, GlobalEdgeOptions } from '@/lib/types';
import type { AISettings } from '@/store/types';
import {
  buildIdMap,
  parseDslOrThrow,
  toFinalEdges,
  toFinalNodes,
} from './graphComposer';

interface GenerateAIFlowResultParams {
  chatMessages: ChatMessage[];
  prompt: string;
  imageBase64?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  aiSettings: AISettings;
  globalEdgeOptions: GlobalEdgeOptions;
}

export interface GenerateAIFlowResult {
  dslText: string;
  userMessage: ChatMessage;
  layoutedNodes: FlowNode[];
  layoutedEdges: FlowEdge[];
}

export function buildUserChatMessage(prompt: string, imageBase64?: string): ChatMessage {
  return {
    role: 'user',
    parts: [{
      text: imageBase64 ? `${prompt} [Image Attached]` : prompt,
    }],
  };
}

export function appendChatExchange(
  previousMessages: ChatMessage[],
  userMessage: ChatMessage,
  dslText: string
): ChatMessage[] {
  return [
    ...previousMessages,
    userMessage,
    { role: 'model', parts: [{ text: dslText }] },
  ];
}

export async function generateAIFlowResult({
  chatMessages,
  prompt,
  imageBase64,
  nodes,
  edges,
  aiSettings,
  globalEdgeOptions,
}: GenerateAIFlowResultParams): Promise<GenerateAIFlowResult> {
  const currentGraph = serializeCanvasContextForAI(nodes, edges);
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

  const parsed = parseDslOrThrow(dslText);
  const idMap = buildIdMap(parsed.nodes, nodes);
  const finalNodes = toFinalNodes(parsed.nodes, idMap);
  const finalEdges = toFinalEdges(parsed.edges, idMap, globalEdgeOptions);
  const { nodes: layoutedNodes, edges: layoutedEdges } = await composeDiagramForDisplay(finalNodes, finalEdges, {
    direction: 'TB',
    algorithm: 'mrtree',
    spacing: 'loose',
  });

  return {
    dslText,
    userMessage: buildUserChatMessage(prompt, imageBase64),
    layoutedNodes,
    layoutedEdges,
  };
}
