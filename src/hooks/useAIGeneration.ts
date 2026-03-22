import { useCallback, useState } from 'react';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { ChatMessage } from '@/services/aiService';
import { useFlowStore } from '@/store';
import { useToast } from '@/components/ui/ToastContext';
import { toErrorMessage } from './ai-generation/graphComposer';
import {
  appendChatExchange,
  generateAIFlowResult,
} from './ai-generation/requestLifecycle';
import { buildCodeToArchitecturePrompt, type SupportedLanguage } from './ai-generation/codeToArchitecture';
import { buildSqlToErdPrompt } from './ai-generation/sqlToErd';
import { buildTerraformToCloudPrompt, type TerraformInputFormat } from './ai-generation/terraformToCloud';
import { buildOpenApiToSequencePrompt } from './ai-generation/openApiToSequence';
import { notifyOperationOutcome } from '@/services/operationFeedback';

const logger = createLogger({ scope: 'useAIGeneration' });

export function useAIGeneration(
  recordHistory: () => void,
  applyComposedGraph: (nodes: FlowNode[], edges: FlowEdge[]) => void
) {
  const { nodes, edges, aiSettings, globalEdgeOptions } = useFlowStore();
  const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
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
        selectedNodeIds,
        aiSettings: {
          ...aiSettings,
          apiKey,
          model,
          provider,
          customBaseUrl,
        },
        globalEdgeOptions,
      });

      const isEditMode = nodes.length > 0;
      setChatMessages((previousMessages) => [
        ...appendChatExchange(previousMessages, userMessage, dslText, isEditMode),
      ]);

      applyComposedGraph(layoutedNodes, layoutedEdges);

      notifyOperationOutcome(addToast, {
        status: 'success',
        summary: 'Diagram generated successfully!',
      });
    } catch (error: unknown) {
      const errorMessage = toErrorMessage(error);
      logger.error('AI generation failed.', { error });
      notifyOperationOutcome(addToast, {
        status: 'error',
        summary: 'Failed to generate diagram.',
        detail: errorMessage,
      });
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
    selectedNodeIds,
    recordHistory,
    applyComposedGraph,
  ]);

  const handleCodeAnalysis = useCallback(async (code: string, language: SupportedLanguage) => {
    const prompt = buildCodeToArchitecturePrompt({ code, language });
    await handleAIRequest(prompt);
  }, [handleAIRequest]);

  const handleSqlAnalysis = useCallback(async (sql: string) => {
    await handleAIRequest(buildSqlToErdPrompt(sql));
  }, [handleAIRequest]);

  const handleTerraformAnalysis = useCallback(async (input: string, format: TerraformInputFormat) => {
    await handleAIRequest(buildTerraformToCloudPrompt(input, format));
  }, [handleAIRequest]);

  const handleOpenApiAnalysis = useCallback(async (spec: string) => {
    await handleAIRequest(buildOpenApiToSequencePrompt(spec));
  }, [handleAIRequest]);

  return { isGenerating, handleAIRequest, handleCodeAnalysis, handleSqlAnalysis, handleTerraformAnalysis, handleOpenApiAnalysis, chatMessages, clearChat };
}
