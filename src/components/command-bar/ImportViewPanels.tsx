import React from 'react';
import { Bot, ChevronRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select, type SelectOption } from '@/components/ui/Select';
import type { SupportedLanguage } from '@/hooks/ai-generation/codeToArchitecture';
import type { InfraFormat } from '@/services/infraSync/types';
import type { ImportCategory } from './importDetection';

interface ImportTopControlsProps {
  category: ImportCategory;
  infraFormat: InfraFormat | 'terraform-hcl';
  language: SupportedLanguage;
  infraFormatOptions: SelectOption[];
  languageOptions: SelectOption[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInfraFormatChange: (value: InfraFormat | 'terraform-hcl') => void;
  onLanguageChange: (value: SupportedLanguage) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadLabel: string;
  fileAccept: string | null;
}

export function ImportTopControls({
  category,
  infraFormat,
  language,
  infraFormatOptions,
  languageOptions,
  fileInputRef,
  onInfraFormatChange,
  onLanguageChange,
  onFileSelect,
  uploadLabel,
  fileAccept,
}: ImportTopControlsProps): React.ReactElement | null {
  if (category === 'codebase') {
    return null;
  }

  if (category === 'infra') {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={infraFormat}
          onChange={(value) => onInfraFormatChange(value as InfraFormat | 'terraform-hcl')}
          options={infraFormatOptions}
          className="flex-1"
        />
        <input
          type="file"
          accept={fileAccept ?? undefined}
          className="hidden"
          ref={fileInputRef}
          onChange={onFileSelect}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadLabel}
        </Button>
      </div>
    );
  }

  if (category === 'code') {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={language}
          onChange={(value) => onLanguageChange(value as SupportedLanguage)}
          options={languageOptions}
          className="flex-1"
        />
        <input
          type="file"
          accept={fileAccept ?? undefined}
          className="hidden"
          ref={fileInputRef}
          onChange={onFileSelect}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadLabel}
        </Button>
      </div>
    );
  }

  if (category === 'sql' || category === 'openapi') {
    return (
      <>
        <input
          type="file"
          accept={fileAccept ?? undefined}
          className="hidden"
          ref={fileInputRef}
          onChange={onFileSelect}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          {uploadLabel}
        </Button>
      </>
    );
  }

  return null;
}

interface ImportTextAreaPanelProps {
  input: string;
  inputTooLarge: boolean;
  placeholder: string;
  limitError: string;
  onInputChange: (value: string) => void;
  onDrop: (event: React.DragEvent) => void;
}

export function ImportTextAreaPanel({
  input,
  inputTooLarge,
  placeholder,
  limitError,
  onInputChange,
  onDrop,
}: ImportTextAreaPanelProps): React.ReactElement {
  return (
    <>
      <div
        className="relative flex-1 min-h-[140px]"
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={placeholder}
          className={`custom-scrollbar h-full min-h-[140px] w-full resize-none rounded-[var(--radius-md)] border bg-[var(--brand-background)] px-3 py-3 font-mono text-xs text-[var(--brand-text)] outline-none transition-colors placeholder:text-[var(--brand-secondary)]/60 ${
            inputTooLarge
              ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
              : 'border-[var(--color-brand-border)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)]'
          }`}
        />
      </div>

      {inputTooLarge ? <p className="text-[11px] text-red-500">{limitError}</p> : null}
    </>
  );
}

interface ImportActionRowProps {
  canNative: boolean;
  canAI: boolean;
  isParsing: boolean;
  isAiRunning: boolean;
  parseDisabled: boolean;
  aiDisabled: boolean;
  aiLabel: string;
  parsingLabel: string;
  parseLabel: string;
  analyzingLabel: string;
  onParse: () => void;
  onAiGenerate: () => void;
}

export function ImportActionRow({
  canNative,
  canAI,
  isParsing,
  isAiRunning,
  parseDisabled,
  aiDisabled,
  aiLabel,
  parsingLabel,
  parseLabel,
  analyzingLabel,
  onParse,
  onAiGenerate,
}: ImportActionRowProps): React.ReactElement {
  return (
    <div className="flex gap-2">
      {canNative ? (
        <Button
          variant="primary"
          size="md"
          isLoading={isParsing}
          disabled={parseDisabled}
          onClick={onParse}
          icon={!isParsing ? <ChevronRight className="h-3.5 w-3.5" /> : undefined}
          className="flex-1"
        >
          {isParsing ? parsingLabel : parseLabel}
        </Button>
      ) : null}
      {canAI ? (
        <Button
          variant="secondary"
          size="md"
          isLoading={isAiRunning ? true : undefined}
          disabled={aiDisabled}
          onClick={onAiGenerate}
          icon={!isAiRunning ? <Bot className="h-3.5 w-3.5" /> : undefined}
          className="flex-1"
        >
          {isAiRunning ? analyzingLabel : aiLabel}
        </Button>
      ) : null}
    </div>
  );
}
