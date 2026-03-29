import { useEffect, useState, type ReactElement } from 'react';
import {
  ArrowUp,
  Loader2,
  Paperclip,
  Square,
  Trash2,
  WandSparkles,
  X,
  Crosshair,
  Edit3,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
  Key,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOWPILOT_NAME, IS_BEVELED } from '@/lib/brand';
import type { ChatMessage } from '@/services/aiService';
import type { ImportDiff } from '@/hooks/useAIGeneration';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';
import { useAIViewState } from './command-bar/useAIViewState';
import { Tooltip } from './Tooltip';
import {
  EMPTY_CANVAS_EXAMPLES,
  ITERATION_EXAMPLES,
  EXAMPLE_ICON_COLORS,
} from './studioAiPanelExamples';

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

type AIGenerationMode = 'edit' | 'create';
type ChatBubbleTone = ChatMessage['role'];

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

function getChatBubbleClassName(role: ChatBubbleTone): string {
  if (role === 'user') {
    return 'rounded-br-sm bg-[var(--brand-primary)] text-white shadow-sm';
  }

  return 'rounded-bl-sm border border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-sm';
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
      {pendingDiff && (
        <div className="mx-1 mb-2 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-xs font-semibold text-[var(--brand-text)]">
              {t('commandBar.aiStudio.importReady', 'Import ready - review changes')}
            </p>
          </div>
          <div className="flex items-center gap-3 mb-3 text-[11px]">
            {pendingDiff.addedCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Plus className="h-3 w-3" />
                {t('commandBar.aiStudio.addedCount', {
                  count: pendingDiff.addedCount,
                  defaultValue: '{{count}} added',
                })}
              </span>
            )}
            {pendingDiff.updatedCount > 0 && (
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <RefreshCw className="h-3 w-3" />
                {t('commandBar.aiStudio.updatedCount', {
                  count: pendingDiff.updatedCount,
                  defaultValue: '{{count}} updated',
                })}
              </span>
            )}
            {pendingDiff.removedCount > 0 && (
              <span className="flex items-center gap-1 text-red-700 font-medium">
                <Minus className="h-3 w-3" />
                {t('commandBar.aiStudio.removedCount', {
                  count: pendingDiff.removedCount,
                  defaultValue: '{{count}} removed',
                })}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDiscardDiff}
              className="flex h-7 flex-1 items-center justify-center rounded border border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[11px] font-medium text-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
            >
              {t('commandBar.aiStudio.discard', 'Discard')}
            </button>
            <button
              onClick={onConfirmDiff}
              className="flex h-7 flex-1 items-center justify-center rounded bg-emerald-600 text-[11px] font-medium text-white hover:bg-emerald-700"
            >
              {t('commandBar.aiStudio.applyToCanvas', 'Apply to canvas')}
            </button>
          </div>
        </div>
      )}
      {hasHistory && (
        <div className="flex items-center justify-end px-1 pb-2">
          <button
            onClick={onClearChat}
            className="rounded-full p-2 text-[var(--brand-secondary)] transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95"
            title={t('commandBar.ai.clearChat')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-4 custom-scrollbar"
      >
        {!hasHistory ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center px-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100">
              <WandSparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-[var(--brand-text)]">
              {FLOWPILOT_NAME}
            </h3>
            <p className="mt-2.5 mb-8 max-w-[280px] text-[13px] leading-relaxed text-[var(--brand-secondary)]">
              {isCanvasEmpty
                ? t('commandBar.aiStudio.emptyDescription', {
                    appName: FLOWPILOT_NAME,
                    defaultValue:
                      'Describe the diagram you want and {{appName}} will draft the first graph for you.',
                  })
                : t('commandBar.aiStudio.editDescription', {
                    appName: FLOWPILOT_NAME,
                    defaultValue:
                      'Describe the changes you want and {{appName}} will update the graph for you.',
                  })}
            </p>

            {aiReadiness.canGenerate && (
              <div className="flex max-w-[360px] flex-wrap justify-center gap-2">
                {examplePrompts.map((skill, index) => {
                  const Icon = skill.icon;
                  return (
                    <button
                      key={skill.label}
                      onClick={() => {
                        setPrompt(skill.prompt);
                        void submitPrompt(skill.prompt);
                      }}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--brand-surface)] bg-[var(--brand-surface)] px-3 py-2 text-left text-[12px] font-semibold leading-none text-[var(--brand-text)] shadow-sm shadow-[var(--color-brand-border)]/70 ring-1 ring-[var(--color-brand-border)]/70 transition-all duration-200 hover:-translate-y-px hover:border-[var(--brand-primary-100)] hover:text-[var(--brand-primary)] hover:shadow-md active:scale-95"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-background)]">
                        <Icon className={`h-3.5 w-3.5 ${getExampleIconColor(index)}`} />
                      </span>
                      <span>{skill.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {!aiReadiness.canGenerate && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={openAISettings}
                  className="flex items-center gap-2 rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-4 py-2 text-xs font-semibold text-[var(--brand-secondary)] shadow-sm transition-all hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)] active:scale-95"
                >
                  <Key className="h-3.5 w-3.5" />
                  {t('commandBar.aiStudio.addKeyCta', 'Add AI key to start generating')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm whitespace-pre-wrap ${getChatBubbleClassName(msg.role)}`}
                >
                  {msg.parts.map((part, index) => (
                    <div key={index} className="leading-relaxed">
                      {part.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-[var(--radius-md)] rounded-bl-sm border border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)] px-3.5 py-2.5 text-sm text-[var(--brand-text)] shadow-sm">
                  {streamingText ? (
                    <span className="whitespace-pre-wrap leading-relaxed">{streamingText}</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[var(--brand-secondary)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {retryCount > 0
                        ? t('commandBar.aiStudio.retrying', {
                            retryCount,
                            defaultValue: 'Retrying ({{retryCount}} of 3)...',
                          })
                        : t('commandBar.aiStudio.generating', 'Generating...')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="shrink-0 border-t border-[var(--color-brand-border)] px-1 pt-3">
        {nodeCount > 0 ? (
          <div className="mb-3 flex rounded-[var(--radius-md)] border border-[var(--color-brand-border)]/80 bg-[var(--brand-background)]/80 p-1">
            <button
              onClick={() => setGenerationMode('edit')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-[13px] font-semibold transition-all ${getGenerationModeButtonClassName(effectiveGenerationMode === 'edit')}`}
              aria-pressed={effectiveGenerationMode === 'edit'}
            >
              {t('commandBar.aiStudio.editCurrent', 'Edit current')}
              <Tooltip
                text={t('commandBar.aiStudio.editCurrentHint', 'Modify your existing canvas')}
                side="top"
                className="flex items-center"
              >
                <Info className={getInfoIconClassName(effectiveGenerationMode === 'edit')} />
              </Tooltip>
            </button>
            <button
              onClick={() => setGenerationMode('create')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-[13px] font-semibold transition-all ${getGenerationModeButtonClassName(effectiveGenerationMode === 'create')}`}
              aria-pressed={effectiveGenerationMode === 'create'}
            >
              {t('commandBar.aiStudio.createNew', 'Create new')}
              <Tooltip
                text={t('commandBar.aiStudio.createNewHint', 'Start fresh with a new diagram')}
                side="top"
                className="flex items-center"
              >
                <Info className={getInfoIconClassName(effectiveGenerationMode === 'create')} />
              </Tooltip>
            </button>
          </div>
        ) : null}

        {selectedNodeCount > 0 && effectiveGenerationMode === 'edit' ? (
          <div className="mb-3 flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--brand-primary-100)] bg-[var(--brand-primary-50)] px-2.5 py-1.5">
            <Crosshair className="h-3 w-3 shrink-0 text-[var(--brand-primary)]" />
            <span className="text-[11px] font-medium text-[var(--brand-primary)]">
              {t('commandBar.aiStudio.editingSelectedNodes', {
                count: selectedNodeCount,
                defaultValue: 'Editing {{count}} selected node',
              })}
            </span>
          </div>
        ) : null}

        {selectedImage && (
          <div className="group relative mb-3 h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] shadow-sm">
            <img
              src={selectedImage}
              alt={t('commandBar.aiStudio.uploadPreviewAlt', 'Upload preview')}
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="relative flex w-full flex-col rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-sm transition-all focus-within:border-[var(--brand-primary)] focus-within:ring-[3px] focus-within:ring-[var(--brand-primary-100)]">
          <textarea
            value={prompt}
            onChange={(event) => {
              if (lastError) {
                onClearError();
              }
              setPrompt(event.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={getPromptPlaceholder(
              t,
              effectiveGenerationMode,
              nodeCount,
              selectedNodeCount
            )}
            className="w-full resize-none rounded-[var(--brand-radius)] bg-transparent px-4 pb-12 pt-4 text-sm text-[var(--brand-text)] placeholder-[var(--brand-secondary)] outline-none custom-scrollbar"
            style={{ minHeight: '100px', maxHeight: '180px' }}
            rows={3}
          />
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-secondary)]"
              title={t('commandBar.aiStudio.attachImage', 'Attach image')}
              type="button"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            {isGenerating ? (
              <button
                onClick={onCancelGeneration}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-all hover:bg-red-600 active:scale-95"
                aria-label={t('commandBar.aiStudio.cancelGeneration', 'Cancel generation')}
                type="button"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isInputEmpty}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all flex-shrink-0 ${getPrimaryComposerClassName(isInputEmpty, isBeveled)} ${!isInputEmpty ? 'active:scale-95' : ''}`}
                aria-label={t('ai.generateWithFlowpilot', {
                  defaultValue: 'Generate with Flowpilot',
                })}
                title={sendButtonLabel}
                type="button"
              >
                {sendButtonIcon}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
