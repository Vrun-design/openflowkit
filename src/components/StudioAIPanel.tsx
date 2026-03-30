import { useEffect, useState, type ReactElement } from 'react';
import {
  ArrowUp,
  Edit3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IS_BEVELED } from '@/lib/brand';
import type { ChatMessage } from '@/services/aiService';
import type { ImportDiff } from '@/hooks/useAIGeneration';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';
import { useAIViewState } from './command-bar/useAIViewState';
import {
  EMPTY_CANVAS_EXAMPLES,
  ITERATION_EXAMPLES,
  EXAMPLE_ICON_COLORS,
} from './studioAiPanelExamples';
import {
  type AIGenerationMode,
  ChatHistoryView,
  ComposerSection,
  PendingDiffBanner,
} from './StudioAIPanelSections';

function getExampleIconColor(index: number): string {
  return EXAMPLE_ICON_COLORS[index % EXAMPLE_ICON_COLORS.length];
}

interface StudioAIPanelProps {
  onAIGenerate: (prompt: string, imageBase64?: string) => Promise<boolean>;
  isGenerating: boolean;
  streamingText: string | null;
  retryCount: number;
  onCancelGeneration: () => void;
  pendingDiff: ImportDiff | null;
  onConfirmDiff: () => void;
  onDiscardDiff: () => void;
  aiReadiness: AIReadinessState;
  lastError: string | null;
  onClearError: () => void;
  chatMessages: ChatMessage[];
  onClearChat: () => void;
  nodeCount?: number;
  selectedNodeCount?: number;
  initialPrompt?: string;
  onInitialPromptConsumed?: () => void;
}

function buildGenerationPrompt(prompt: string, mode: AIGenerationMode, nodeCount: number): string {
  if (nodeCount === 0 || mode === 'edit') {
    return prompt;
  }

  return [
    'Create a brand new diagram from scratch.',
    'Ignore the existing canvas and replace it with a new diagram that matches the request.',
    '',
    prompt,
  ].join('\n');
}

function getPromptPlaceholder(
  t: ReturnType<typeof useTranslation>['t'],
  generationMode: AIGenerationMode,
  nodeCount: number,
  selectedNodeCount: number
): string {
  if (generationMode === 'create') {
    return t(
      'commandBar.aiStudio.placeholders.create',
      'Describe the diagram you want to create from scratch...'
    );
  }

  if (selectedNodeCount > 0) {
    return t('commandBar.aiStudio.placeholders.selectedEdit', {
      count: selectedNodeCount,
      defaultValue: 'Describe what to change about the {{count}} selected node...',
    });
  }

  if (nodeCount > 0) {
    return t(
      'commandBar.aiStudio.placeholders.edit',
      "Describe a change, for example 'add Redis between API and DB'"
    );
  }

  return t(
    'commandBar.aiStudio.placeholders.empty',
    'Describe a diagram to generate from scratch...'
  );
}

function getPrimaryComposerClassName(isInputEmpty: boolean, isBeveled: boolean): string {
  if (isInputEmpty) {
    return 'cursor-not-allowed border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)] shadow-none';
  }

  return `border-[color-mix(in_srgb,var(--brand-primary),black_18%)] bg-[var(--brand-primary)] text-white shadow-sm hover:-translate-y-px hover:bg-[var(--brand-primary-600)] hover:shadow-md ${isBeveled ? 'btn-beveled' : ''}`;
}

function getGenerationModeButtonClassName(isActive: boolean): string {
  if (isActive) {
    return 'bg-[var(--brand-surface)] text-orange-600 border border-orange-200 shadow-sm';
  }

  return 'text-[var(--brand-secondary)] hover:bg-[var(--brand-surface)]/50 hover:text-[var(--brand-text)] border border-transparent';
}

function getInfoIconClassName(isActive: boolean): string {
  return `h-3.5 w-3.5 focus:outline-none ${isActive ? 'text-orange-400' : 'text-[var(--brand-secondary)]'}`;
}

export function StudioAIPanel({
  onAIGenerate,
  isGenerating,
  streamingText,
  retryCount,
  onCancelGeneration,
  pendingDiff,
  onConfirmDiff,
  onDiscardDiff,
  aiReadiness,
  lastError,
  onClearError,
  chatMessages,
  onClearChat,
  nodeCount = 0,
  selectedNodeCount = 0,
  initialPrompt,
  onInitialPromptConsumed,
}: StudioAIPanelProps): ReactElement {
  const { t } = useTranslation();
  const isBeveled = IS_BEVELED;
  const [generationMode, setGenerationMode] = useState<AIGenerationMode>(
    nodeCount === 0 ? 'create' : 'edit'
  );

  const {
    prompt,
    setPrompt,
    selectedImage,
    setSelectedImage,
    fileInputRef,
    scrollRef,
    handleGenerate,
    handleKeyDown,
    handleImageSelect,
  } = useAIViewState({
    searchQuery: '',
    isGenerating,
    onAIGenerate,
    onClose: () => undefined,
    chatMessageCount: chatMessages.length,
  });

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      onInitialPromptConsumed?.();
    }
  }, [initialPrompt, onInitialPromptConsumed, setPrompt]);

  const hasHistory = chatMessages.length > 0;
  const isCanvasEmpty = nodeCount === 0;
  const effectiveGenerationMode: AIGenerationMode = nodeCount === 0 ? 'create' : generationMode;
  const examplePrompts = isCanvasEmpty ? EMPTY_CANVAS_EXAMPLES : ITERATION_EXAMPLES;
  const isEditMode = effectiveGenerationMode === 'edit' && !isCanvasEmpty;
  const sendButtonLabel = isEditMode
    ? t('commandBar.aiStudio.applyEdit', 'Apply AI edit')
    : t('commandBar.aiStudio.generateDiagram', 'Generate diagram');
  const sendButtonIcon = isEditMode ? (
    <Edit3 className="h-4 w-4" />
  ) : (
    <ArrowUp className="h-4 w-4" />
  );

  async function submitPrompt(promptText?: string): Promise<void> {
    const resolvedPrompt = promptText ?? prompt;
    const finalPrompt = buildGenerationPrompt(resolvedPrompt, effectiveGenerationMode, nodeCount);
    await handleGenerate(finalPrompt);
  }

  function openAISettings(): void {
    window.dispatchEvent(new CustomEvent('open-ai-settings'));
  }

  function handleSubmit(): void {
    if (!aiReadiness.canGenerate) {
      openAISettings();
      return;
    }

    void submitPrompt();
  }

  const isInputEmpty = !prompt.trim() && !selectedImage;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {pendingDiff ? (
        <PendingDiffBanner
          pendingDiff={pendingDiff}
          onConfirmDiff={onConfirmDiff}
          onDiscardDiff={onDiscardDiff}
          t={t}
        />
      ) : null}
      <ChatHistoryView
        hasHistory={hasHistory}
        chatMessages={chatMessages}
        isGenerating={isGenerating}
        streamingText={streamingText}
        retryCount={retryCount}
        isCanvasEmpty={isCanvasEmpty}
        canGenerate={aiReadiness.canGenerate}
        examplePrompts={examplePrompts}
        getExampleIconColor={getExampleIconColor}
        onSelectExample={(examplePrompt) => {
          setPrompt(examplePrompt);
          void submitPrompt(examplePrompt);
        }}
        onOpenAISettings={openAISettings}
        onClearChat={onClearChat}
        scrollRef={scrollRef}
        t={t}
      />
      <ComposerSection
        nodeCount={nodeCount}
        selectedNodeCount={selectedNodeCount}
        effectiveGenerationMode={effectiveGenerationMode}
        selectedImage={selectedImage}
        prompt={prompt}
        placeholder={getPromptPlaceholder(
          t,
          effectiveGenerationMode,
          nodeCount,
          selectedNodeCount
        )}
        isGenerating={isGenerating}
        isInputEmpty={isInputEmpty}
        isBeveled={isBeveled}
        aiReadiness={aiReadiness}
        lastError={lastError}
        fileInputRef={fileInputRef}
        onSetGenerationMode={setGenerationMode}
        onRemoveImage={() => setSelectedImage(null)}
        onPromptChange={(value) => {
          if (lastError) {
            onClearError();
          }
          setPrompt(value);
        }}
        onPromptKeyDown={handleKeyDown}
        onAttachImage={() => fileInputRef.current?.click()}
        onImageSelect={handleImageSelect}
        onOpenAISettings={openAISettings}
        onClearError={onClearError}
        onCancelGeneration={onCancelGeneration}
        onSubmit={handleSubmit}
        sendButtonLabel={sendButtonLabel}
        sendButtonIcon={sendButtonIcon}
        getGenerationModeButtonClassName={getGenerationModeButtonClassName}
        getInfoIconClassName={getInfoIconClassName}
        getPrimaryComposerClassName={getPrimaryComposerClassName}
        t={t}
      />
    </div>
  );
}
