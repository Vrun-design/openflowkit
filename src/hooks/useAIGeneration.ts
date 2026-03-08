import { useCallback, useState } from 'react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import { useFlowStore } from '@/store';
import { useToast } from '@/components/ui/ToastContext';
import { trackEvent } from '@/lib/analytics';
import { toErrorMessage } from './ai-generation/graphComposer';
import {
  appendChatExchange,
  generateAIFlowResult,
} from './ai-generation/requestLifecycle';

export function useAIGeneration(
  recordHistory: () => void,
  applyComposedGraph: (nodes: FlowNode[], edges: FlowEdge[]) => void
) {
  const { nodes, edges, aiSettings, globalEdgeOptions } = useFlowStore();
  const {
    apiKey,
    model,
    provider,
    customBaseUrl,
  } = aiSettings;
  const { addToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const handleAIRequest = useCallback(async (prompt: string, imageBase64?: string) => {
    recordHistory();
    setIsGenerating(true);

    try {
      const {
        dslText,
        userMessage,
        layoutedNodes,
        layoutedEdges,
      } = await generateAIFlowResult({
        chatMessages,
        prompt,
        imageBase64,
        nodes,
        edges,
        aiSettings: {
          ...aiSettings,
          apiKey,
          model,
          provider,
          customBaseUrl,
        },
        globalEdgeOptions,
      });

      setChatMessages((previousMessages) => [
        ...appendChatExchange(previousMessages, userMessage, dslText),
      ]);

      applyComposedGraph(layoutedNodes, layoutedEdges);

      trackEvent('ai_generate_success', { model, provider });
      addToast('Diagram generated successfully!', 'success');
    } catch (error: unknown) {
      const errorMessage = toErrorMessage(error);
      trackEvent('ai_generate_error', {
        error_message: errorMessage,
        model,
        provider,
      });
      console.error('AI Generation failed:', error);
      addToast(`Failed to generate: ${errorMessage}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [
    addToast,
    aiSettings,
    apiKey,
    customBaseUrl,
    model,
    provider,
    chatMessages,
    edges,
    globalEdgeOptions,
    nodes,
    recordHistory,
    applyComposedGraph,
  ]);

  return { isGenerating, handleAIRequest, chatMessages, clearChat };
}
