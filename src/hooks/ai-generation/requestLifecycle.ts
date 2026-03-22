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
import { applyAIResultToCanvas, positionNewNodesSmartly, restoreExistingPositions } from './positionPreservingApply';

interface GenerateAIFlowResultParams {
  chatMessages: ChatMessage[];
  prompt: string;
  imageBase64?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeIds?: string[];
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
  dslText: string,
  editMode = false
): ChatMessage[] {
  const modelText = editMode ? '[Diagram updated]' : dslText;
  return [
    ...previousMessages,
    userMessage,
    { role: 'model', parts: [{ text: modelText }] },
  ];
}

function buildSelectionPromptSuffix(selectedNodeIds: string[], nodes: FlowNode[]): string {
  const selectedLabels = selectedNodeIds
    .map((id) => nodes.find((n) => n.id === id)?.data.label)
    .filter(Boolean)
    .join(', ');

  return selectedLabels
    ? `\n\nFOCUSED EDIT: The user has selected ${selectedNodeIds.length} node(s): ${selectedLabels}. Apply changes to these nodes and their connections. Preserve all other nodes using their exact existing IDs.`
    : '';
}

export async function generateAIFlowResult({
  chatMessages,
  prompt,
  imageBase64,
  nodes,
  edges,
  selectedNodeIds,
  aiSettings,
  globalEdgeOptions,
}: GenerateAIFlowResultParams): Promise<GenerateAIFlowResult> {
  const hasSelection = (selectedNodeIds?.length ?? 0) > 0;
  const currentGraph = serializeCanvasContextForAI(nodes, edges, selectedNodeIds);
  const fullPrompt = hasSelection
    ? prompt + buildSelectionPromptSuffix(selectedNodeIds!, nodes)
    : prompt;

  const isEditMode = nodes.length > 0;

  const dslText = await generateDiagramFromChat(
    chatMessages,
    fullPrompt,
    currentGraph,
    imageBase64,
    aiSettings.apiKey,
    aiSettings.model,
    aiSettings.provider || 'gemini',
    aiSettings.customBaseUrl,
    isEditMode
  );

  const parsed = parseDslOrThrow(dslText);
  const idMap = buildIdMap(parsed.nodes, nodes);
  const finalNodes = toFinalNodes(parsed.nodes, idMap);
  const finalEdges = toFinalEdges(parsed.edges, idMap, globalEdgeOptions);

  const isEmptyCanvas = nodes.length === 0;
  if (isEmptyCanvas) {
    const { nodes: layoutedNodes, edges: layoutedEdges } = await composeDiagramForDisplay(
      finalNodes,
      finalEdges,
      { direction: 'TB', algorithm: 'mrtree', spacing: 'loose' }
    );
    return { dslText, userMessage: buildUserChatMessage(prompt, imageBase64), layoutedNodes, layoutedEdges };
  }

  // Position-preserving apply: matched nodes keep their positions, new nodes get ELK positions
  const { mergedNodes, mergedEdges, newNodeIds, existingById } = applyAIResultToCanvas(
    finalNodes,
    finalEdges,
    nodes,
    idMap
  );

  if (newNodeIds.size === 0) {
    return {
      dslText,
      userMessage: buildUserChatMessage(prompt, imageBase64),
      layoutedNodes: mergedNodes,
      layoutedEdges: mergedEdges,
    };
  }

  // Smart placement: position new nodes near their existing neighbors
  const smartPositioned = positionNewNodesSmartly(mergedNodes, mergedEdges, newNodeIds, existingById);
  const unplacedIds = [...newNodeIds].filter((id) => {
    const node = smartPositioned.find((n) => n.id === id);
    return !node?.position || (node.position.x === 0 && node.position.y === 0);
  });

  if (unplacedIds.length === 0) {
    return {
      dslText,
      userMessage: buildUserChatMessage(prompt, imageBase64),
      layoutedNodes: smartPositioned,
      layoutedEdges: mergedEdges,
    };
  }

  // Fallback: ELK for nodes that couldn't be placed smartly
  const { nodes: elkNodes, edges: elkEdges } = await composeDiagramForDisplay(
    smartPositioned,
    mergedEdges,
    { direction: 'TB', algorithm: 'mrtree', spacing: 'loose' }
  );

  const layoutedNodes = restoreExistingPositions(elkNodes, newNodeIds, existingById);

  return {
    dslText,
    userMessage: buildUserChatMessage(prompt, imageBase64),
    layoutedNodes,
    layoutedEdges: elkEdges,
  };
}
