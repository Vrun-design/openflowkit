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
  seedDsl?: string;
  imageBase64?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeIds?: string[];
  aiSettings: AISettings;
  globalEdgeOptions: GlobalEdgeOptions;
  onChunk?: (delta: string) => void;
  onRetry?: (attempt: number) => void;
  signal?: AbortSignal;
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Retry on rate-limit and network errors, not on auth or parse errors
    return msg.includes('429') || msg.includes('rate') || msg.includes('network') || msg.includes('fetch');
  }
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  signal: AbortSignal | undefined,
  onRetry?: (attempt: number) => void,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      return await fn();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) throw error;
      onRetry?.(attempt + 1);
      const delay = RETRY_BASE_MS * 2 ** attempt;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retries exhausted');
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
  seedDsl,
  imageBase64,
  nodes,
  edges,
  selectedNodeIds,
  aiSettings,
  globalEdgeOptions,
  onChunk,
  onRetry,
  signal,
}: GenerateAIFlowResultParams): Promise<GenerateAIFlowResult> {
  const hasSelection = (selectedNodeIds?.length ?? 0) > 0;
  const currentGraph = serializeCanvasContextForAI(nodes, edges, selectedNodeIds) || seedDsl || '';
  const fullPrompt = hasSelection
    ? prompt + buildSelectionPromptSuffix(selectedNodeIds!, nodes)
    : prompt;

  const isEditMode = nodes.length > 0 || Boolean(seedDsl);

  let activePrompt = fullPrompt;
  let dslText = '';
  let parsed: ReturnType<typeof parseDslOrThrow>;

  for (let attempt = 0; attempt <= 1; attempt++) {
    dslText = await withRetry(
      () => generateDiagramFromChat(
        chatMessages,
        activePrompt,
        currentGraph,
        imageBase64,
        aiSettings.apiKey,
        aiSettings.model,
        aiSettings.provider || 'gemini',
        aiSettings.customBaseUrl,
        isEditMode,
        onChunk,
        signal,
        aiSettings.temperature,
      ),
      signal,
      onRetry,
    );
    try {
      parsed = parseDslOrThrow(dslText);
      break;
    } catch (parseErr) {
      if (attempt === 1) throw parseErr;
      const msg = parseErr instanceof Error ? parseErr.message : 'DSL syntax error';
      activePrompt = `${fullPrompt}\n\nFIX REQUIRED: Previous output had a DSL error: "${msg}". Output ONLY valid OpenFlow DSL — no prose, no markdown fences.`;
      onRetry?.(3);
    }
  }
  parsed = parsed!;
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
