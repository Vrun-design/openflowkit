import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '@/lib/logger';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { captureAnalyticsEvent } from '@/services/analytics/analytics';
import type { ChatMessage } from '@/services/aiService';
import { useFlowStore } from '@/store';
import { useToast } from '@/components/ui/ToastContext';
import { toErrorMessage } from './ai-generation/graphComposer';
import {
  appendChatExchange,
  generateAIFlowResult,
  type GenerateAIFlowResult,
} from './ai-generation/requestLifecycle';
import { parseStreamingDsl } from './ai-generation/streamingParser';
import { setStreamingGraph, setStreamingActive } from './ai-generation/streamingStore';
import {
  buildCodeToArchitecturePrompt,
  buildCodebaseToArchitecturePrompt,
  type SupportedLanguage,
} from './ai-generation/codeToArchitecture';
import type { CodebaseAnalysis } from './ai-generation/codebaseAnalyzer';
import { buildCodebaseNativeDiagram } from './ai-generation/codebaseToNativeDiagram';
import { buildSqlToErdPrompt } from './ai-generation/sqlToErd';
import {
  buildTerraformToCloudPrompt,
  type TerraformInputFormat,
} from './ai-generation/terraformToCloud';
import { buildOpenApiToSequencePrompt } from './ai-generation/openApiToSequence';
import { getAIReadinessState } from './ai-generation/readiness';
import {
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
} from './ai-generation/chatHistoryStorage';
import { notifyOperationOutcome } from '@/services/operationFeedback';

const logger = createLogger({ scope: 'useAIGeneration' });

export interface ImportDiff {
  addedCount: number;
  removedCount: number;
  updatedCount: number;
  previewTitle: string;
  previewDetail?: string;
  previewStats?: string[];
  result: GenerateAIFlowResult;
}

type PreviewRequestKind =
  | 'prompt'
  | 'focused-edit'
  | 'code-import'
  | 'sql-import'
  | 'terraform-import'
  | 'openapi-import';

interface PreviewDescriptor {
  title: string;
  detail?: string;
  stats?: string[];
}

function buildPreviewCopy(
  requestKind: PreviewRequestKind,
  addedCount: number,
  updatedCount: number,
  previewDescriptor?: PreviewDescriptor
): Pick<ImportDiff, 'previewTitle' | 'previewDetail' | 'previewStats'> {
  if (previewDescriptor) {
    return {
      previewTitle: previewDescriptor.title,
      previewDetail: previewDescriptor.detail,
      previewStats: previewDescriptor.stats,
    };
  }

  if (requestKind === 'code-import') {
    return {
      previewTitle: 'Codebase enhancement ready — review the upgraded diagram.',
      previewDetail:
        addedCount > 0 || updatedCount > 0
          ? 'Started from the native repository map and layered in AI architecture improvements.'
          : 'The native repository map is ready and no additional AI upgrades were needed.',
      previewStats: undefined,
    };
  }

  return {
    previewTitle: 'Import ready — review changes before applying.',
    previewStats: undefined,
  };
}

function computeImportDiff(
  currentNodes: FlowNode[],
  result: GenerateAIFlowResult,
  requestKind: PreviewRequestKind,
  previewDescriptor?: PreviewDescriptor
): ImportDiff {
  const currentIds = new Set(currentNodes.map((n) => n.id));
  const newIds = new Set(result.layoutedNodes.map((n) => n.id));
  const addedCount = result.layoutedNodes.filter((n) => !currentIds.has(n.id)).length;
  const removedCount = currentNodes.filter((n) => !newIds.has(n.id)).length;
  const updatedCount = result.layoutedNodes.filter((n) => currentIds.has(n.id)).length;

  return {
    addedCount,
    removedCount,
    updatedCount,
    ...buildPreviewCopy(requestKind, addedCount, updatedCount, previewDescriptor),
    result,
  };
}

function buildCodebasePreviewDescriptor(
  analysis: CodebaseAnalysis,
  nativeDiagram: ReturnType<typeof buildCodebaseNativeDiagram>
): PreviewDescriptor {
  const platformLabel =
    analysis.cloudPlatform === 'unknown'
      ? 'Platform: app-only'
      : `Platform: ${analysis.cloudPlatform}`;
  const serviceLabel =
    nativeDiagram.platformServiceCount > 0
      ? `${nativeDiagram.platformServiceCount} platform service${nativeDiagram.platformServiceCount === 1 ? '' : 's'}`
      : `${analysis.detectedServices.length} detected service${analysis.detectedServices.length === 1 ? '' : 's'}`;

  return {
    title: 'Codebase enhancement ready — review the upgraded diagram.',
    detail:
      'Started from the native repository map, then layered in AI architecture upgrades for services, sections, and labeled flows.',
    stats: [
      platformLabel,
      `${nativeDiagram.sectionCount} native section${nativeDiagram.sectionCount === 1 ? '' : 's'}`,
      serviceLabel,
      `${nativeDiagram.edgeCount} preview edge${nativeDiagram.edgeCount === 1 ? '' : 's'}`,
    ],
  };
}

function getSuccessSummary(existingNodeCount: number, focusedNodeIds?: string[]): string {
  if ((focusedNodeIds?.length ?? 0) > 0) {
    return 'Applied AI changes to the selected nodes.';
  }

  if (existingNodeCount > 0) {
    return 'Applied AI changes to the current diagram.';
  }

  return 'Created a new AI diagram draft.';
}

function getFailureSummary(existingNodeCount: number, focusedNodeIds?: string[]): string {
  if ((focusedNodeIds?.length ?? 0) > 0) {
    return 'Could not update the selected nodes.';
  }

  if (existingNodeCount > 0) {
    return 'Could not update the current diagram.';
  }

  return 'Could not generate the requested diagram.';
}

export function useAIGeneration(
  recordHistory: () => void,
  applyComposedGraph: (nodes: FlowNode[], edges: FlowEdge[]) => void
) {
  const { nodes, edges, aiSettings, globalEdgeOptions, activeTabId } = useFlowStore();
  const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
  const { addToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingDiff, setPendingDiff] = useState<ImportDiff | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let isDisposed = false;

    void loadChatHistory(activeTabId).then((messages) => {
      if (!isDisposed) {
        setChatMessages(messages);
      }
    });

    return () => {
      isDisposed = true;
    };
  }, [activeTabId]);
  const [lastError, setLastError] = useState<string | null>(null);
  const readiness = getAIReadinessState(aiSettings);

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    void clearChatHistory(activeTabId);
    setChatMessages([]);
  }, [activeTabId]);

  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  const confirmPendingDiff = useCallback(() => {
    if (!pendingDiff) return;
    recordHistory();
    applyComposedGraph(pendingDiff.result.layoutedNodes, pendingDiff.result.layoutedEdges);
    notifyOperationOutcome(addToast, { status: 'success', summary: 'Import applied to canvas.' });
    setPendingDiff(null);
  }, [pendingDiff, applyComposedGraph, addToast, recordHistory]);

  const discardPendingDiff = useCallback(() => {
    setPendingDiff(null);
  }, []);

  const runAIRequest = useCallback(
    async (
      prompt: string,
      imageBase64?: string,
      focusedNodeIds?: string[],
      showPreview = false,
      requestKind: PreviewRequestKind = 'prompt',
      seedDsl?: string,
      previewDescriptor?: PreviewDescriptor
    ): Promise<boolean> => {
      if (!readiness.canGenerate && readiness.blockingIssue) {
        setLastError(readiness.blockingIssue.detail);
        notifyOperationOutcome(addToast, {
          status: readiness.blockingIssue.tone,
          summary: readiness.blockingIssue.title,
          detail: readiness.blockingIssue.detail,
        });
        return false;
      }

      setLastError(null);
      setStreamingText('');
      setStreamingGraph(null);
      setStreamingActive(true);
      setRetryCount(0);
      if (!showPreview) recordHistory();
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      captureAnalyticsEvent('ai_generation_started', {
        provider: aiSettings.provider || 'gemini',
        has_image: Boolean(imageBase64),
        is_preview: showPreview,
        request_kind: requestKind,
        selected_count: focusedNodeIds?.length ?? selectedNodeIds.length,
      });

      try {
        const result = await generateAIFlowResult({
          chatMessages,
          prompt,
          seedDsl,
          imageBase64,
          nodes,
          edges,
          selectedNodeIds: focusedNodeIds ?? selectedNodeIds,
          aiSettings,
          globalEdgeOptions,
          onChunk: (delta) => {
            setStreamingText((prev) => {
              const next = (prev ?? '') + delta;
              const parsed = parseStreamingDsl(next);
              if (parsed.nodeCount > 0) {
                setStreamingGraph(parsed);
              }
              return next;
            });
          },
          onRetry: (attempt) => {
            setRetryCount(attempt);
            setStreamingText('');
          },
          signal: controller.signal,
        });

        const { dslText, userMessage, layoutedNodes, layoutedEdges } = result;
        const isEditMode = nodes.length > 0 || Boolean(seedDsl);
        setChatMessages((previousMessages) => {
          const next = appendChatExchange(previousMessages, userMessage, dslText, isEditMode);
          void saveChatHistory(activeTabId, next);
          return next;
        });

        if (showPreview) {
          const previewDiff = computeImportDiff(nodes, result, requestKind, previewDescriptor);
          setPendingDiff(previewDiff);
          notifyOperationOutcome(addToast, {
            status: 'success',
            summary: previewDiff.previewTitle,
            detail: previewDiff.previewDetail,
          });
          captureAnalyticsEvent('import_preview_ready', {
            provider: aiSettings.provider || 'gemini',
            request_kind: requestKind,
          });
        } else {
          applyComposedGraph(layoutedNodes, layoutedEdges);
          notifyOperationOutcome(addToast, {
            status: 'success',
            summary: getSuccessSummary(nodes.length, focusedNodeIds),
          });
        }
        captureAnalyticsEvent('ai_generation_succeeded', {
          provider: aiSettings.provider || 'gemini',
          has_image: Boolean(imageBase64),
          is_preview: showPreview,
          request_kind: requestKind,
          selected_count: focusedNodeIds?.length ?? selectedNodeIds.length,
        });
        return true;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          captureAnalyticsEvent('ai_generation_cancelled', {
            provider: aiSettings.provider || 'gemini',
            is_preview: showPreview,
            request_kind: requestKind,
          });
          return false;
        }
        const errorMessage = toErrorMessage(error);
        logger.error('AI generation failed.', { error });
        setLastError(errorMessage);
        captureAnalyticsEvent('ai_generation_failed', {
          provider: aiSettings.provider || 'gemini',
          is_preview: showPreview,
          request_kind: requestKind,
          error_name: error instanceof Error ? error.name : 'UnknownError',
        });
        notifyOperationOutcome(addToast, {
          status: 'error',
          summary: getFailureSummary(nodes.length, focusedNodeIds),
          detail: errorMessage,
        });
        return false;
      } finally {
        abortControllerRef.current = null;
        setIsGenerating(false);
        setStreamingText(null);
        setStreamingGraph(null);
        setStreamingActive(false);
        setRetryCount(0);
      }
    },
    [
      addToast,
      aiSettings,
      activeTabId,
      chatMessages,
      edges,
      globalEdgeOptions,
      readiness,
      nodes,
      selectedNodeIds,
      recordHistory,
      applyComposedGraph,
    ]
  );

  const handleAIRequest = useCallback(
    async (prompt: string, imageBase64?: string): Promise<boolean> => {
      return runAIRequest(prompt, imageBase64, undefined, false, 'prompt');
    },
    [runAIRequest]
  );

  const handleFocusedAIRequest = useCallback(
    async (prompt: string, focusedNodeIds: string[], imageBase64?: string): Promise<boolean> => {
      return runAIRequest(prompt, imageBase64, focusedNodeIds, false, 'focused-edit');
    },
    [runAIRequest]
  );

  const handleCodeAnalysis = useCallback(
    async (code: string, language: SupportedLanguage): Promise<boolean> => {
      return runAIRequest(
        buildCodeToArchitecturePrompt({ code, language }),
        undefined,
        undefined,
        true,
        'code-import'
      );
    },
    [runAIRequest]
  );

  const handleSqlAnalysis = useCallback(
    async (sql: string): Promise<boolean> => {
      return runAIRequest(buildSqlToErdPrompt(sql), undefined, undefined, true, 'sql-import');
    },
    [runAIRequest]
  );

  const handleTerraformAnalysis = useCallback(
    async (input: string, format: TerraformInputFormat): Promise<boolean> => {
      return runAIRequest(
        buildTerraformToCloudPrompt(input, format),
        undefined,
        undefined,
        true,
        'terraform-import'
      );
    },
    [runAIRequest]
  );

  const handleOpenApiAnalysis = useCallback(
    async (spec: string): Promise<boolean> => {
      return runAIRequest(
        buildOpenApiToSequencePrompt(spec),
        undefined,
        undefined,
        true,
        'openapi-import'
      );
    },
    [runAIRequest]
  );

  const handleCodebaseAnalysis = useCallback(
    async (analysis: CodebaseAnalysis): Promise<boolean> => {
      const nativeDiagram = buildCodebaseNativeDiagram(analysis);

      return runAIRequest(
        buildCodebaseToArchitecturePrompt({
          summary: analysis.summary,
          cloudPlatform: analysis.cloudPlatform,
          detectedServices: analysis.detectedServices,
          infraFiles: analysis.infraFiles,
        }) +
          '\n\nUse the provided native repository diagram as the starting point. Preserve useful sections and module structure, then enhance it with platform services, clearer labels, and semantic edges.',
        undefined,
        undefined,
        true,
        'code-import',
        nativeDiagram.dsl,
        buildCodebasePreviewDescriptor(analysis, nativeDiagram)
      );
    },
    [runAIRequest]
  );

  return {
    isGenerating,
    streamingText,
    retryCount,
    cancelGeneration,
    pendingDiff,
    confirmPendingDiff,
    discardPendingDiff,
    readiness,
    lastError,
    handleAIRequest,
    handleFocusedAIRequest,
    handleCodeAnalysis,
    handleSqlAnalysis,
    handleTerraformAnalysis,
    handleOpenApiAnalysis,
    handleCodebaseAnalysis,
    chatMessages,
    clearChat,
    clearLastError,
  };
}
