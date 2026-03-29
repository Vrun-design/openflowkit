import React, { useCallback, useRef, useState } from 'react';
import { Cloud, Code2, Database, FolderOpen, Network, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SegmentedTabs, type SegmentedTabItem } from '@/components/ui/SegmentedTabs';
import { type SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import { type TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { CommandBarProps } from './types';
import { ViewHeader } from './ViewHeader';
import {
  type ImportCategory,
  MAX_INPUT_BYTES,
  detectCategoryFromExtension,
  detectInfraFormat,
  detectLanguage,
  formatBytes,
} from './importDetection';
import { type NativeParseResult, parseSqlNative, parseInfraNative } from './importNativeParsers';
import { CodebaseImportSection } from './CodebaseImportSection';
import type { CodebaseAnalysis } from '@/hooks/ai-generation/codebaseAnalyzer';
import type { InfraFormat } from '@/services/infraSync/types';
import {
  getFileAcceptValue,
  getImportAiActionLabel,
  getImportCategoryDefinition,
  getImportCategoryLabel,
  getImportPlaceholders,
  getInfraFormatOptions,
  getUploadButtonLabel,
  IMPORT_CATEGORY_DEFINITIONS,
  createLanguageOptions,
} from './importViewModel';
import {
  ImportActionRow,
  ImportTextAreaPanel,
  ImportTopControls,
} from './ImportViewPanels';
import {
  ImportErrorNotice,
  ImportFileBadge,
  NativeParseResultCard,
} from './ImportSurfacePrimitives';

// ── Constants ───────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  sql: Database,
  infra: Cloud,
  openapi: Network,
  code: Code2,
  codebase: FolderOpen,
} satisfies Record<ImportCategory, typeof Database>;

function renderCategoryIcon(Icon: typeof Database): React.ReactElement {
  return <Icon className="h-3.5 w-3.5" />;
}

// ── Component ───────────────────────────────────────────────────────

interface ImportViewProps {
  onClose: () => void;
  handleBack: () => void;
  onCodeAnalysis?: CommandBarProps['onCodeAnalysis'];
  onSqlAnalysis?: CommandBarProps['onSqlAnalysis'];
  onTerraformAnalysis?: CommandBarProps['onTerraformAnalysis'];
  onOpenApiAnalysis?: CommandBarProps['onOpenApiAnalysis'];
  onApplyDsl?: CommandBarProps['onApplyDsl'];
  onCodebaseAnalysis?: CommandBarProps['onCodebaseAnalysis'];
}

export function ImportView({
  onClose,
  handleBack,
  onCodeAnalysis,
  onSqlAnalysis,
  onTerraformAnalysis,
  onOpenApiAnalysis,
  onApplyDsl,
  onCodebaseAnalysis,
}: ImportViewProps): React.ReactElement {
  const { t } = useTranslation();
  const placeholders = getImportPlaceholders(t);
  const infraFormatOptions = getInfraFormatOptions(t);
  const languageOptions = createLanguageOptions();
  const [category, setCategory] = useState<ImportCategory>('sql');
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [infraFormat, setInfraFormat] = useState<InfraFormat | 'terraform-hcl'>('terraform-state');
  const [isParsing, setIsParsing] = useState(false);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [nativeResult, setNativeResult] = useState<NativeParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState(false);
  const [codebaseAnalysis, setCodebaseAnalysis] = useState<CodebaseAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const appliedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetResults = useCallback(() => {
    setNativeResult(null);
    setCodebaseAnalysis(null);
    setError(null);
    setAppliedFeedback(false);
  }, []);

  const clearInput = useCallback(() => {
    setInput('');
    setFileInfo(null);
    resetResults();
  }, [resetResults]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      resetResults();
      if (value.length > MAX_INPUT_BYTES) {
        setError(
          t('commandBar.import.errors.inputTooLarge', {
            size: formatBytes(value.length),
            max: formatBytes(MAX_INPUT_BYTES),
            defaultValue: 'Input is {{size}} - max {{max}} for paste.',
          })
        );
      } else {
        setError(null);
      }
    },
    [resetResults, t]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > 1_000_000) {
        setError(
          t('commandBar.import.errors.fileTooLarge', {
            size: formatBytes(file.size),
            max: formatBytes(1_000_000),
            defaultValue: 'File is {{size}} - max {{max}}.',
          })
        );
        return;
      }
      setFileInfo({ name: file.name, size: file.size });
      const detected = detectCategoryFromExtension(file.name);
      if (detected) setCategory(detected);
      if (detected === 'code') setLanguage(detectLanguage(file.name));
      if (detected === 'infra') setInfraFormat(detectInfraFormat(file.name, ''));

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) ?? '';
        setInput(text);
        resetResults();
        if (detected === 'infra') setInfraFormat(detectInfraFormat(file.name, text));
      };
      reader.readAsText(file);
    },
    [resetResults, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleNativeParse = useCallback(() => {
    if (!input.trim()) return;
    setIsParsing(true);
    setError(null);
    setNativeResult(null);
    try {
      let result: NativeParseResult;
      if (category === 'sql') {
        result = parseSqlNative(input);
      } else if (category === 'infra') {
        if (infraFormat === 'terraform-hcl') {
          setError(
            t(
              'commandBar.import.errors.terraformHclRequiresAi',
              'Terraform HCL requires AI analysis. Use the AI button.'
            )
          );
          setIsParsing(false);
          return;
        }
        result = parseInfraNative(input, infraFormat as InfraFormat);
      } else {
        setError(t('commandBar.import.errors.nativeNotAvailable', 'Native parsing not available for this type.'));
        setIsParsing(false);
        return;
      }
      setNativeResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('commandBar.import.errors.parsingFailed', 'Parsing failed.'));
    } finally {
      setIsParsing(false);
    }
  }, [input, category, infraFormat, t]);

  const handleApply = useCallback(() => {
    if (!nativeResult || !onApplyDsl) return;
    onApplyDsl(nativeResult.dsl);
    setAppliedFeedback(true);
    clearTimeout(appliedTimeoutRef.current);
    appliedTimeoutRef.current = setTimeout(() => setAppliedFeedback(false), 2000);
  }, [nativeResult, onApplyDsl]);

  const handleAiGenerate = useCallback(async () => {
    if (category === 'codebase') return;
    if (!input.trim()) return;
    setIsAiRunning(true);
    setError(null);
    try {
      if (category === 'code' && onCodeAnalysis) await onCodeAnalysis(input, language);
      else if (category === 'sql' && onSqlAnalysis) await onSqlAnalysis(input);
      else if (category === 'infra' && onTerraformAnalysis)
        await onTerraformAnalysis(input, infraFormat as TerraformInputFormat);
      else if (category === 'openapi' && onOpenApiAnalysis) await onOpenApiAnalysis(input);
      else {
        setError(t('commandBar.import.errors.aiUnavailable', 'AI analysis not available for this type.'));
        setIsAiRunning(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('commandBar.import.errors.aiFailed', 'AI generation failed.'));
    } finally {
      setIsAiRunning(false);
    }
  }, [
    input,
    category,
    language,
    infraFormat,
    onCodeAnalysis,
    onSqlAnalysis,
    onTerraformAnalysis,
    onOpenApiAnalysis,
    t,
  ]);

  const activeCategory = getImportCategoryDefinition(category);
  const inputTooLarge = input.length > MAX_INPUT_BYTES;

  const categoryItems: SegmentedTabItem[] = IMPORT_CATEGORY_DEFINITIONS.map((cat) => ({
    id: cat.id,
    label: getImportCategoryLabel(t, cat.id),
    icon: renderCategoryIcon(CATEGORY_ICONS[cat.id]),
  }));
  const canNative = activeCategory.hasNative && onApplyDsl;
  const canAI =
    activeCategory.hasAI &&
    ((category === 'code' && onCodeAnalysis) ||
      (category === 'sql' && onSqlAnalysis) ||
      (category === 'infra' && onTerraformAnalysis) ||
      (category === 'openapi' && onOpenApiAnalysis) ||
      (category === 'codebase' && onCodebaseAnalysis));
  const aiDisabled =
    category === 'codebase'
      ? !codebaseAnalysis || isAiRunning
      : !input.trim() || isAiRunning || inputTooLarge;

  return (
    <>
      <ViewHeader
        title={t('commandBar.import.title', 'Import from data')}
        icon={<Upload className="h-4 w-4 text-[var(--brand-primary)]" />}
        description={t(
          'commandBar.import.description',
          'Import code, infrastructure, SQL, or API specs into your diagram.'
        )}
        onBack={handleBack}
        onClose={onClose}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-[var(--color-brand-border)]/60">
          <SegmentedTabs
            items={categoryItems}
            value={category}
            onChange={(nextCategory) => {
              setCategory(nextCategory as ImportCategory);
              resetResults();
              clearInput();
              setError(null);
            }}
            size="md"
            fill
            className="pb-0"
            listClassName="w-full gap-1 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-1"
          />
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
          <ImportTopControls
            category={category}
            infraFormat={infraFormat}
            language={language}
            infraFormatOptions={infraFormatOptions}
            languageOptions={languageOptions}
            fileInputRef={fileInputRef}
            onInfraFormatChange={(value) => {
              setInfraFormat(value);
              resetResults();
            }}
            onLanguageChange={setLanguage}
            onFileSelect={handleFileSelect}
            uploadLabel={getUploadButtonLabel(t, category)}
            fileAccept={getFileAcceptValue(category)}
          />

          {category === 'codebase' && (
            <CodebaseImportSection
              codebaseAnalysis={codebaseAnalysis}
              onSetCodebaseAnalysis={setCodebaseAnalysis}
              onSetFileInfo={setFileInfo}
              onSetError={setError}
              fileInfo={fileInfo}
            />
          )}

          {fileInfo && category !== 'codebase' ? (
            <ImportFileBadge fileInfo={fileInfo} onClear={clearInput} />
          ) : null}

          {category !== 'codebase' ? (
            <ImportTextAreaPanel
              input={input}
              inputTooLarge={inputTooLarge}
              placeholder={placeholders[category]}
              limitError={t('commandBar.import.errors.inputExceedsLimit', {
                max: formatBytes(MAX_INPUT_BYTES),
                defaultValue:
                  'Input exceeds {{max}} limit. Trim the content or use a smaller file.',
              })}
              onInputChange={handleInputChange}
              onDrop={handleDrop}
            />
          ) : null}

          <ImportActionRow
            canNative={Boolean(canNative)}
            canAI={Boolean(canAI)}
            isParsing={isParsing}
            isAiRunning={isAiRunning}
            parseDisabled={!input.trim() || isParsing || inputTooLarge}
            aiDisabled={aiDisabled}
            aiLabel={getImportAiActionLabel(t, category)}
            parsingLabel={t('commandBar.import.parsing', 'Parsing...')}
            parseLabel={t('commandBar.import.parse', 'Parse')}
            analyzingLabel={t('commandBar.import.analyzing', 'Analyzing...')}
            onParse={handleNativeParse}
            onAiGenerate={() => void handleAiGenerate()}
          />

          {error ? <ImportErrorNotice error={error} /> : null}

          {nativeResult ? (
            <NativeParseResultCard
              nativeResult={nativeResult}
              previewDslLabel={t('commandBar.import.previewDsl', 'Preview DSL')}
              applyLabel={t('commandBar.import.applyToCanvas', 'Apply to Canvas')}
              appliedLabel={t('commandBar.import.appliedToCanvas', 'Applied to canvas')}
              appliedFeedback={appliedFeedback}
              onApply={onApplyDsl ? handleApply : undefined}
            />
          ) : null}

          {!nativeResult && !error && <div className="flex-1" />}
        </div>
      </div>
    </>
  );
}
