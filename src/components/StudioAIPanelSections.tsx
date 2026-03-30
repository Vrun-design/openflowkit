import type { ReactElement, RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Info,
  Key,
  Loader2,
  Minus,
  Paperclip,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { FLOWPILOT_NAME } from '@/lib/brand';
import type { ChatMessage } from '@/services/aiService';
import type { ImportDiff } from '@/hooks/useAIGeneration';
import type { AIReadinessState } from '@/hooks/ai-generation/readiness';
import { SECTION_CARD_CLASS, SECTION_SURFACE_CLASS, STATUS_SURFACE_CLASS } from '@/lib/designTokens';
import { STUDIO_AI_COPY } from './studioAICopy';

export type AIGenerationMode = 'edit' | 'create';
type TranslateFn = (...args: unknown[]) => string;

interface PendingDiffBannerProps {
  pendingDiff: ImportDiff;
  onConfirmDiff: () => void;
  onDiscardDiff: () => void;
  t: TranslateFn;
}

export function PendingDiffBanner({
  pendingDiff,
  onConfirmDiff,
  onDiscardDiff,
  t,
}: PendingDiffBannerProps): ReactElement {
  return (
    <div className={`mx-1 mb-2 rounded-[var(--radius-md)] p-3 ${STATUS_SURFACE_CLASS.success}`}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-surface-success-text)]" />
        <p className="text-xs font-semibold text-[var(--brand-text)]">
          {pendingDiff.previewTitle}
        </p>
      </div>
      {pendingDiff.previewDetail ? (
        <p className="mb-3 text-[11px] leading-4 text-[var(--color-surface-success-text)]">
          {pendingDiff.previewDetail}
        </p>
      ) : null}
      {pendingDiff.previewStats && pendingDiff.previewStats.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {pendingDiff.previewStats.map((stat) => (
            <span
              key={stat}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SECTION_SURFACE_CLASS}`}
            >
              {stat}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-3 mb-3 text-[11px]">
        {pendingDiff.addedCount > 0 ? (
          <span className="flex items-center gap-1 font-medium text-[var(--color-surface-success-text)]">
            <Plus className="h-3 w-3" />
            {t('commandBar.aiStudio.addedCount', {
              count: pendingDiff.addedCount,
              defaultValue: '{{count}} added',
            })}
          </span>
        ) : null}
        {pendingDiff.updatedCount > 0 ? (
          <span className="flex items-center gap-1 font-medium text-[var(--color-surface-warning-text)]">
            <RefreshCw className="h-3 w-3" />
            {t('commandBar.aiStudio.updatedCount', {
              count: pendingDiff.updatedCount,
              defaultValue: '{{count}} updated',
            })}
          </span>
        ) : null}
        {pendingDiff.removedCount > 0 ? (
          <span className="flex items-center gap-1 font-medium text-[var(--color-surface-danger-text)]">
            <Minus className="h-3 w-3" />
            {t('commandBar.aiStudio.removedCount', {
              count: pendingDiff.removedCount,
              defaultValue: '{{count}} removed',
            })}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDiscardDiff}
          className={`flex h-7 flex-1 items-center justify-center rounded text-[11px] font-medium text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] ${SECTION_SURFACE_CLASS}`}
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
  );
}

interface ChatHistoryViewProps {
  hasHistory: boolean;
  chatMessages: ChatMessage[];
  isGenerating: boolean;
  streamingText: string | null;
  retryCount: number;
  isCanvasEmpty: boolean;
  canGenerate: boolean;
  examplePrompts: Array<{ label: string; prompt: string; icon: LucideIcon }>;
  getExampleIconColor: (index: number) => string;
  onSelectExample: (prompt: string) => void;
  onOpenAISettings: () => void;
  onClearChat: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  t: TranslateFn;
}

export function ChatHistoryView({
  hasHistory,
  chatMessages,
  isGenerating,
  streamingText,
  retryCount,
  isCanvasEmpty,
  canGenerate,
  examplePrompts,
  getExampleIconColor,
  onSelectExample,
  onOpenAISettings,
  onClearChat,
  scrollRef,
  t,
}: ChatHistoryViewProps): ReactElement {
  if (hasHistory) {
    return (
      <>
        <div className="flex items-center justify-end px-1 pb-2">
          <button
            onClick={onClearChat}
            className="rounded-full p-2 text-[var(--brand-secondary)] transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95"
            title={t('commandBar.ai.clearChat')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-4 custom-scrollbar"
        >
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm whitespace-pre-wrap ${msg.role === 'user'
                  ? 'rounded-br-sm bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'rounded-bl-sm border border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-sm'}`}
              >
                {msg.parts.map((part, index) => (
                  <div key={index} className="leading-relaxed">
                    {part.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {isGenerating ? (
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
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-4 custom-scrollbar"
    >
      <div className="flex h-full flex-col items-center justify-center py-8 text-center px-4">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-surface-warning-text)] ${SECTION_CARD_CLASS} ring-1 ring-[var(--color-surface-warning-border)]`}>
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

        {canGenerate ? (
          <div className="flex max-w-[360px] flex-wrap justify-center gap-2">
            {examplePrompts.map((skill, index) => {
              const Icon = skill.icon;
              return (
                <button
                  key={skill.label}
                  onClick={() => onSelectExample(skill.prompt)}
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
        ) : (
          <div className="mt-8 flex justify-center">
            <button
              onClick={onOpenAISettings}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[var(--brand-secondary)] transition-all hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)] active:scale-95 ${SECTION_SURFACE_CLASS}`}
            >
              <Key className="h-3.5 w-3.5" />
              {t('commandBar.aiStudio.addKeyCta', 'Add AI key to start generating')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ComposerSectionProps {
  nodeCount: number;
  selectedNodeCount: number;
  effectiveGenerationMode: AIGenerationMode;
  selectedImage: string | null;
  prompt: string;
  placeholder: string;
  isGenerating: boolean;
  isInputEmpty: boolean;
  isBeveled: boolean;
  aiReadiness: AIReadinessState;
  lastError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSetGenerationMode: (mode: AIGenerationMode) => void;
  onRemoveImage: () => void;
  onPromptChange: (value: string) => void;
  onPromptKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onAttachImage: () => void;
  onImageSelect: React.ChangeEventHandler<HTMLInputElement>;
  onOpenAISettings: () => void;
  onClearError: () => void;
  onCancelGeneration: () => void;
  onSubmit: () => void;
  sendButtonLabel: string;
  sendButtonIcon: ReactElement;
  getGenerationModeButtonClassName: (isActive: boolean) => string;
  getInfoIconClassName: (isActive: boolean) => string;
  getPrimaryComposerClassName: (isInputEmpty: boolean, isBeveled: boolean) => string;
  t: TranslateFn;
}

function isLikelyNetworkFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch') ||
    normalized.includes('cors') ||
    normalized.includes('rate limit') ||
    normalized.includes('timeout')
  );
}

interface AIRecoveryBannerProps {
  aiReadiness: AIReadinessState;
  lastError: string;
  isGenerating: boolean;
  onRetry: () => void;
  onOpenAISettings: () => void;
  onClearError: () => void;
}

function AIRecoveryBanner({
  aiReadiness,
  lastError,
  isGenerating,
  onRetry,
  onOpenAISettings,
  onClearError,
}: AIRecoveryBannerProps): ReactElement {
  const setupIssue = aiReadiness.blockingIssue;
  const showSettingsCta = Boolean(setupIssue) || isLikelyNetworkFailure(lastError);
  const detail = setupIssue?.detail ?? lastError;

  return (
    <div className={`mb-3 rounded-[var(--radius-md)] px-3 py-3 ${STATUS_SURFACE_CLASS.warning}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-surface-warning-text)]" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[var(--color-surface-warning-text)]">
            {setupIssue?.title ?? STUDIO_AI_COPY.lastRequestFailedTitle}
          </div>
          <div className="mt-1 text-[11px] leading-4 text-[var(--color-surface-warning-text)]/90">{detail}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isGenerating ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Retry request
              </button>
            ) : null}
            {showSettingsCta ? (
              <button
                type="button"
                onClick={onOpenAISettings}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-[var(--brand-background)] ${SECTION_SURFACE_CLASS}`}
              >
                Review AI settings
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClearError}
              className="rounded-full px-2 py-1.5 text-[11px] font-medium text-[var(--color-surface-warning-text)]/80 transition-colors hover:bg-[var(--brand-background)]"
              aria-label={STUDIO_AI_COPY.dismissErrorAriaLabel}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComposerSection({
  nodeCount,
  selectedNodeCount,
  effectiveGenerationMode,
  selectedImage,
  prompt,
  placeholder,
  isGenerating,
  isInputEmpty,
  isBeveled,
  aiReadiness,
  lastError,
  fileInputRef,
  onSetGenerationMode,
  onRemoveImage,
  onPromptChange,
  onPromptKeyDown,
  onAttachImage,
  onImageSelect,
  onOpenAISettings,
  onClearError,
  onCancelGeneration,
  onSubmit,
  sendButtonLabel,
  sendButtonIcon,
  getGenerationModeButtonClassName,
  getInfoIconClassName,
  getPrimaryComposerClassName,
  t,
}: ComposerSectionProps): ReactElement {
  return (
    <div className="shrink-0 border-t border-[var(--color-brand-border)] px-1 pt-3">
      {lastError ? (
        <AIRecoveryBanner
          aiReadiness={aiReadiness}
          lastError={lastError}
          isGenerating={isGenerating}
          onRetry={onSubmit}
          onOpenAISettings={onOpenAISettings}
          onClearError={onClearError}
        />
      ) : null}
      {nodeCount > 0 ? (
        <div className="mb-3 flex rounded-[var(--radius-md)] border border-[var(--color-brand-border)]/80 bg-[var(--brand-background)]/80 p-1">
          <button
            onClick={() => onSetGenerationMode('edit')}
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
            onClick={() => onSetGenerationMode('create')}
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

      {selectedImage ? (
        <div className="group relative mb-3 h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] shadow-sm">
          <img
            src={selectedImage}
            alt={t('commandBar.aiStudio.uploadPreviewAlt', 'Upload preview')}
            className="h-full w-full object-cover"
          />
          <button
            onClick={onRemoveImage}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <div className="relative flex w-full flex-col rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-sm transition-all focus-within:border-[var(--brand-primary)] focus-within:ring-[3px] focus-within:ring-[var(--brand-primary-100)]">
        <textarea
          value={prompt}
          onChange={(event) => {
            if (lastError) {
              // Preserve the existing error-clearing behavior in the parent callback chain.
            }
            onPromptChange(event.target.value);
          }}
          onKeyDown={onPromptKeyDown}
          placeholder={placeholder}
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
            onChange={onImageSelect}
          />
          <button
            onClick={onAttachImage}
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
              onClick={onSubmit}
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
  );
}
