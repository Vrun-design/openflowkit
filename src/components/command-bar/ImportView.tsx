import React, { useCallback, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronRight,
  Cloud,
  Code2,
  Database,
  FileText,
  FolderOpen,
  Loader2,
  Network,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SegmentedTabs, type SegmentedTabItem } from '@/components/ui/SegmentedTabs';
import { Select, type SelectOption } from '@/components/ui/Select';
import {
  LANGUAGE_LABELS,
  FILE_EXTENSION_TO_LANGUAGE,
  type SupportedLanguage,
} from '@/hooks/ai-generation/codeToArchitecture';
import { type TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';
import type { CommandBarProps } from './types';
import { ViewHeader } from './ViewHeader';

import { parseSqlDdl } from '@/hooks/ai-generation/sqlParser';
import { sqlSchemaToDsl } from '@/hooks/ai-generation/sqlToErd';
import { parseTerraformState } from '@/services/infraSync/terraformStateParser';
import { parseKubernetesManifests } from '@/services/infraSync/kubernetesParser';
import { parseDockerCompose } from '@/services/infraSync/dockerComposeParser';
import { infraSyncResultToDsl, infraSyncResultSummary } from '@/services/infraSync/infraToDsl';
import type { InfraFormat, InfraSyncResult } from '@/services/infraSync/types';

import { extractZipFiles } from '@/services/zipExtractor';
import { analyzeCodebase, type CodebaseAnalysis } from '@/hooks/ai-generation/codebaseAnalyzer';
import {
  parseGitHubUrl,
  fetchGitHubRepo,
  getGitHubToken,
  setGitHubToken,
} from '@/services/githubFetcher';

// ── Constants ───────────────────────────────────────────────────────

const MAX_INPUT_BYTES = 200_000;
const MAX_FILE_BYTES = 1_000_000;

type ImportCategory = 'sql' | 'infra' | 'openapi' | 'code' | 'codebase';

interface CategoryDef {
  id: ImportCategory;
  label: string;
  icon: typeof Database;
  hasNative: boolean;
  hasAI: boolean;
  aiLabel: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'sql',
    label: 'SQL',
    icon: Database,
    hasNative: true,
    hasAI: true,
    aiLabel: 'Generate ERD (AI)',
  },
  {
    id: 'infra',
    label: 'Infra',
    icon: Cloud,
    hasNative: true,
    hasAI: true,
    aiLabel: 'Generate Diagram (AI)',
  },
  {
    id: 'openapi',
    label: 'OpenAPI',
    icon: Network,
    hasNative: false,
    hasAI: true,
    aiLabel: 'Generate Sequence',
  },
  {
    id: 'code',
    label: 'Code',
    icon: Code2,
    hasNative: false,
    hasAI: true,
    aiLabel: 'Analyze Architecture',
  },
  {
    id: 'codebase',
    label: 'Repo',
    icon: FolderOpen,
    hasNative: false,
    hasAI: true,
    aiLabel: 'Analyze Project',
  },
];

const PLACEHOLDERS: Record<ImportCategory, string> = {
  sql: 'Paste CREATE TABLE statements here...',
  infra: 'Paste Terraform state JSON, Kubernetes YAML, Docker Compose, or Terraform HCL here...',
  openapi: 'Paste your OpenAPI / Swagger YAML or JSON here...',
  code: 'Paste your source code here...',
  codebase: '',
};

const INFRA_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'terraform-state', label: 'Terraform State (.tfstate)' },
  { value: 'kubernetes', label: 'Kubernetes YAML' },
  { value: 'docker-compose', label: 'Docker Compose' },
  { value: 'terraform-hcl', label: 'Terraform HCL (AI)' },
];

const LANGUAGE_OPTIONS: SelectOption[] = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ── Auto-detection ──────────────────────────────────────────────────

const EXT_TO_CATEGORY: Record<string, ImportCategory> = {
  sql: 'sql',
  tfstate: 'infra',
  tf: 'infra',
  hcl: 'infra',
  yaml: 'infra',
  yml: 'infra',
  json: 'openapi',
};

const EXT_TO_LANGUAGE: Record<string, SupportedLanguage> = {};
for (const [ext, lang] of Object.entries(FILE_EXTENSION_TO_LANGUAGE)) {
  EXT_TO_LANGUAGE[ext] = lang;
}

function detectCategoryFromExtension(filename: string): ImportCategory | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (EXT_TO_CATEGORY[ext]) return EXT_TO_CATEGORY[ext];
  if (EXT_TO_LANGUAGE[ext]) return 'code';
  return null;
}

function detectInfraFormat(filename: string, content: string): InfraFormat | 'terraform-hcl' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tfstate') || lower.endsWith('.tf.json')) return 'terraform-state';
  if (
    lower === 'docker-compose.yml' ||
    lower === 'docker-compose.yaml' ||
    lower === 'compose.yml' ||
    lower === 'compose.yaml'
  )
    return 'docker-compose';
  if (lower.endsWith('.tf') || lower.endsWith('.hcl')) return 'terraform-hcl';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    if (
      content.includes('kind:') &&
      (content.includes('apiVersion:') || content.includes('metadata:'))
    )
      return 'kubernetes';
    if (content.includes('services:') && (content.includes('image:') || content.includes('build:')))
      return 'docker-compose';
    return 'kubernetes';
  }
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'resources' in parsed)
      return 'terraform-state';
  } catch {
    /* not JSON */
  }
  return 'terraform-state';
}

function detectLanguage(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANGUAGE[ext] ?? 'typescript';
}

// ── Native parsing ──────────────────────────────────────────────────

interface NativeParseResult {
  dsl: string;
  nodeCount: number;
  edgeCount: number;
  summary: string;
}

function countDslNodesAndEdges(dsl: string): { nodes: number; edges: number } {
  const lines = dsl.split('\n');
  let nodes = 0;
  let edges = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^\[(entity|process|system|section|start|end|decision|browser|mobile|note|annotation|container)\]/.test(
        trimmed
      )
    ) {
      nodes++;
    } else if (
      /->/.test(trimmed) &&
      !trimmed.startsWith('flow:') &&
      !trimmed.startsWith('direction:')
    ) {
      edges++;
    }
  }
  return { nodes, edges };
}

function parseSqlNative(input: string): NativeParseResult {
  const schema = parseSqlDdl(input);
  if (schema.tables.length === 0)
    throw new Error('No tables found. Paste CREATE TABLE statements.');
  const dsl = sqlSchemaToDsl(schema);
  const counts = countDslNodesAndEdges(dsl);
  return {
    dsl,
    nodeCount: counts.nodes,
    edgeCount: counts.edges,
    summary: `${schema.tables.length} table${schema.tables.length > 1 ? 's' : ''}, ${schema.tables.reduce((sum, t) => sum + t.foreignKeys.length, 0)} relationship(s)`,
  };
}

function parseInfraNative(input: string, format: InfraFormat): NativeParseResult {
  let result: InfraSyncResult;
  if (format === 'terraform-state') result = parseTerraformState(input);
  else if (format === 'kubernetes') result = parseKubernetesManifests(input);
  else if (format === 'docker-compose') result = parseDockerCompose(input);
  else throw new Error('HCL requires AI analysis. Use the AI button.');

  if (result.nodes.length === 0)
    throw new Error('No resources detected. Check the format and content.');
  const dsl = infraSyncResultToDsl(result);
  const counts = countDslNodesAndEdges(dsl);
  return {
    dsl,
    nodeCount: counts.nodes,
    edgeCount: counts.edges,
    summary: infraSyncResultSummary(result),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(0)}KB`;
}

function renderCategoryIcon(Icon: CategoryDef['icon']): React.ReactElement {
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

function clearImportInput(
  resetResults: () => void,
  setInput: React.Dispatch<React.SetStateAction<string>>,
  setFileInfo: React.Dispatch<React.SetStateAction<{ name: string; size: number } | null>>
): void {
  setInput('');
  setFileInfo(null);
  resetResults();
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
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const appliedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetResults = useCallback(() => {
    setNativeResult(null);
    setCodebaseAnalysis(null);
    setError(null);
    setAppliedFeedback(false);
  }, []);

  const clearInput = useCallback(() => {
    clearImportInput(resetResults, setInput, setFileInfo);
  }, [resetResults]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      resetResults();
      if (value.length > MAX_INPUT_BYTES) {
        setError(
          `Input is ${formatBytes(value.length)} — max ${formatBytes(MAX_INPUT_BYTES)} for paste.`
        );
      } else {
        setError(null);
      }
    },
    [resetResults]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setError(`File is ${formatBytes(file.size)} — max ${formatBytes(MAX_FILE_BYTES)}.`);
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
    [resetResults]
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

  const handleZipSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsExtractingZip(true);
    setError(null);
    setCodebaseAnalysis(null);
    try {
      const files = await extractZipFiles(file);
      if (files.length === 0) {
        setError('No source files found in the zip.');
        setIsExtractingZip(false);
        return;
      }
      const analysis = analyzeCodebase(files);
      setCodebaseAnalysis(analysis);
      setFileInfo({ name: file.name, size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract zip.');
    } finally {
      setIsExtractingZip(false);
    }
  }, []);

  const handleCodebaseAi = useCallback(async () => {
    if (!codebaseAnalysis || !onCodebaseAnalysis) return;
    setIsAiRunning(true);
    setError(null);
    try {
      await onCodebaseAnalysis(codebaseAnalysis.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed.');
    } finally {
      setIsAiRunning(false);
    }
  }, [codebaseAnalysis, onCodebaseAnalysis]);

  const handleGithubFetch = useCallback(async () => {
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      setError('Invalid GitHub URL. Use format: github.com/owner/repo');
      return;
    }
    setIsFetchingGithub(true);
    setError(null);
    setCodebaseAnalysis(null);
    setFetchProgress('Connecting...');
    try {
      const files = await fetchGitHubRepo(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        setFetchProgress
      );
      if (files.length === 0) {
        setError('No source files found in this repository.');
        setIsFetchingGithub(false);
        setFetchProgress(null);
        return;
      }
      const analysis = analyzeCodebase(files);
      setCodebaseAnalysis(analysis);
      setFileInfo({ name: `${parsed.owner}/${parsed.repo}`, size: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository.');
    } finally {
      setIsFetchingGithub(false);
      setFetchProgress(null);
    }
  }, [githubUrl]);

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
          setError('Terraform HCL requires AI analysis. Use the AI button.');
          setIsParsing(false);
          return;
        }
        result = parseInfraNative(input, infraFormat as InfraFormat);
      } else {
        setError('Native parsing not available for this type.');
        setIsParsing(false);
        return;
      }
      setNativeResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed.');
    } finally {
      setIsParsing(false);
    }
  }, [input, category, infraFormat]);

  const handleApply = useCallback(() => {
    if (!nativeResult || !onApplyDsl) return;
    onApplyDsl(nativeResult.dsl);
    setAppliedFeedback(true);
    clearTimeout(appliedTimeoutRef.current);
    appliedTimeoutRef.current = setTimeout(() => setAppliedFeedback(false), 2000);
  }, [nativeResult, onApplyDsl]);

  const handleAiGenerate = useCallback(async () => {
    if (category === 'codebase') {
      await handleCodebaseAi();
      return;
    }
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
        setError('AI analysis not available for this type.');
        setIsAiRunning(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed.');
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
    handleCodebaseAi,
  ]);

  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const inputTooLarge = input.length > MAX_INPUT_BYTES;

  const categoryItems: SegmentedTabItem[] = CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    icon: renderCategoryIcon(cat.icon),
  }));
  const canNative = activeCategory.hasNative && onApplyDsl;
  const canAI =
    activeCategory.hasAI &&
    ((category === 'code' && onCodeAnalysis) ||
      (category === 'sql' && onSqlAnalysis) ||
      (category === 'infra' && onTerraformAnalysis) ||
      (category === 'openapi' && onOpenApiAnalysis) ||
      (category === 'codebase' && onCodebaseAnalysis && codebaseAnalysis));
  const aiDisabled =
    category === 'codebase'
      ? !codebaseAnalysis || isAiRunning
      : !input.trim() || isAiRunning || inputTooLarge;

  return (
    <>
      <ViewHeader
        title="Import from data"
        icon={<Upload className="h-4 w-4 text-[var(--brand-primary)]" />}
        description="Import code, infrastructure, SQL, or API specs into your diagram."
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
          {category === 'infra' && (
            <div className="flex items-center gap-2">
              <Select
                value={infraFormat}
                onChange={(v) => {
                  setInfraFormat(v as InfraFormat | 'terraform-hcl');
                  resetResults();
                }}
                options={INFRA_FORMAT_OPTIONS}
                className="flex-1"
              />
              <input
                type="file"
                accept=".tfstate,.json,.yaml,.yml,.tf,.hcl"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          )}

          {/* Language + upload row for code */}
          {category === 'code' && (
            <div className="flex items-center gap-2">
              <Select
                value={language}
                onChange={(v) => setLanguage(v as SupportedLanguage)}
                options={LANGUAGE_OPTIONS}
                className="flex-1"
              />
              <input
                type="file"
                accept=".ts,.tsx,.js,.jsx,.mjs,.py,.go,.java,.rb,.cs,.cpp,.cc,.cxx,.rs"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          )}

          {(category === 'sql' || category === 'openapi') && (
            <>
              <input
                type="file"
                accept={category === 'sql' ? '.sql,.txt' : '.yaml,.yml,.json'}
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                Upload file
              </Button>
            </>
          )}

          {/* Codebase (Repo) import section */}
          {category === 'codebase' && (
            <div className="flex flex-col gap-3 flex-1">
              {/* Token settings */}
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-medium text-[var(--brand-secondary)] hover:text-[var(--brand-text)] transition-colors">
                  GitHub settings{' '}
                  {getGitHubToken() ? '(token set)' : '(no token — 60 req/hr limit)'}
                </summary>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    defaultValue={getGitHubToken()}
                    placeholder="Personal access token (ghp_...)"
                    className="flex-1 h-8 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2.5 text-[11px] font-mono text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-secondary)]/40 focus:border-[var(--brand-primary)]"
                    onBlur={(e) => setGitHubToken(e.target.value)}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[var(--brand-secondary)]">
                  Token with public_repo scope gives 5,000 req/hr. Stored locally only.
                </p>
              </details>

              {/* GitHub URL input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="Paste GitHub URL (e.g. github.com/user/repo)"
                  className="flex-1 h-9 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 text-xs text-[var(--brand-text)] outline-none transition-colors placeholder:text-[var(--brand-secondary)]/60 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && githubUrl.trim()) {
                      e.preventDefault();
                      void handleGithubFetch();
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={
                    isFetchingGithub ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined
                  }
                  onClick={() => void handleGithubFetch()}
                  disabled={!githubUrl.trim() || isFetchingGithub}
                >
                  {isFetchingGithub ? 'Fetching...' : 'Fetch'}
                </Button>
              </div>

              {fetchProgress && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--brand-secondary)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {fetchProgress}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--color-brand-border)]" />
                <span className="text-[10px] font-medium text-[var(--brand-secondary)] uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-[var(--color-brand-border)]" />
              </div>

              {/* Zip upload */}
              <input
                type="file"
                accept=".zip"
                className="hidden"
                ref={zipInputRef}
                onChange={(e) => void handleZipSelect(e)}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={
                  isExtractingZip ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => zipInputRef.current?.click()}
                disabled={isExtractingZip}
                className="w-full"
              >
                {isExtractingZip ? 'Extracting...' : 'Or upload .zip file'}
              </Button>

              {fileInfo && category === 'codebase' && (
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2.5 py-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
                  <span className="truncate text-[11px] font-medium text-[var(--brand-text)]">
                    {fileInfo.name}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-[var(--brand-secondary)]">
                    {formatBytes(fileInfo.size)}
                  </span>
                </div>
              )}

              {codebaseAnalysis && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary-50)]">
                      <Check className="h-3 w-3 text-[var(--brand-primary)]" />
                    </span>
                    <span className="text-xs font-semibold text-[var(--brand-text)]">
                      {codebaseAnalysis.stats.sourceFiles} source files analyzed
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-7 text-[11px] text-[var(--brand-secondary)] mb-2">
                    <span>{Object.keys(codebaseAnalysis.stats.languages).join(', ')}</span>
                    <span>{codebaseAnalysis.edges.length} dependencies</span>
                    <span>{codebaseAnalysis.entryPoints.length} entry points</span>
                  </div>

                  {codebaseAnalysis.entryPoints.length > 0 && (
                    <div className="pl-7 mb-2">
                      <p className="text-[11px] font-medium text-[var(--brand-secondary)] mb-1">
                        Entry points:
                      </p>
                      {codebaseAnalysis.entryPoints.slice(0, 5).map((ep) => (
                        <span
                          key={ep}
                          className="inline-block text-[10px] font-mono bg-[var(--brand-primary-50)] text-[var(--brand-primary)] rounded px-1.5 py-0.5 mr-1 mb-1"
                        >
                          {ep}
                        </span>
                      ))}
                    </div>
                  )}

                  <details className="pl-7">
                    <summary className="cursor-pointer text-[11px] font-medium text-[var(--brand-secondary)] hover:text-[var(--brand-text)] transition-colors">
                      View full analysis
                    </summary>
                    <pre className="mt-1.5 max-h-40 overflow-auto rounded-[var(--radius-sm)] bg-[var(--brand-surface)] border border-[var(--color-brand-border)] p-2 font-mono text-[10px] leading-4 text-[var(--brand-text)] custom-scrollbar">
                      {codebaseAnalysis.summary}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {fileInfo && (
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2.5 py-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--brand-secondary)]" />
              <span className="truncate text-[11px] font-medium text-[var(--brand-text)]">
                {fileInfo.name}
              </span>
              <span className="ml-auto shrink-0 text-[11px] text-[var(--brand-secondary)]">
                {formatBytes(fileInfo.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearInput}
                className="h-7 w-7 rounded-[var(--radius-sm)] text-[var(--brand-secondary)]"
                icon={<XCircle className="h-3.5 w-3.5" />}
              />
            </div>
          )}

          {category !== 'codebase' && (
            <>
              <div
                className="relative flex-1 min-h-[140px]"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={PLACEHOLDERS[category]}
                  className={`custom-scrollbar h-full min-h-[140px] w-full resize-none rounded-[var(--radius-md)] border bg-[var(--brand-background)] px-3 py-3 font-mono text-xs text-[var(--brand-text)] outline-none transition-colors placeholder:text-[var(--brand-secondary)]/60 ${
                    inputTooLarge
                      ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-200'
                      : 'border-[var(--color-brand-border)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)]'
                  }`}
                />
              </div>

              {inputTooLarge && (
                <p className="text-[11px] text-red-500">
                  Input exceeds {formatBytes(MAX_INPUT_BYTES)} limit. Trim the content or use a
                  smaller file.
                </p>
              )}
            </>
          )}

          <div className="flex gap-2">
            {canNative && (
              <Button
                variant="primary"
                size="md"
                isLoading={isParsing}
                disabled={!input.trim() || isParsing || inputTooLarge}
                onClick={handleNativeParse}
                icon={!isParsing ? <ChevronRight className="h-3.5 w-3.5" /> : undefined}
                className="flex-1"
              >
                {isParsing ? 'Parsing…' : 'Parse'}
              </Button>
            )}
            {canAI && (
              <Button
                variant="secondary"
                size="md"
                isLoading={isAiRunning}
                disabled={aiDisabled}
                onClick={() => void handleAiGenerate()}
                icon={!isAiRunning ? <Bot className="h-3.5 w-3.5" /> : undefined}
                className="flex-1"
              >
                {isAiRunning ? 'Analyzing…' : activeCategory.aiLabel}
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-400/30 bg-red-500/8 p-2.5">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              <p className="text-[11px] leading-5 text-red-500">{error}</p>
            </div>
          )}

          {nativeResult && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary-50)]">
                  <Check className="h-3 w-3 text-[var(--brand-primary)]" />
                </span>
                <span className="text-xs font-semibold text-[var(--brand-text)]">
                  {nativeResult.summary}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 pl-7 text-[11px] text-[var(--brand-secondary)]">
                <span>{nativeResult.nodeCount} nodes</span>
                <span>{nativeResult.edgeCount} edges</span>
              </div>

              <details className="mt-2 pl-7">
                <summary className="cursor-pointer text-[11px] font-medium text-[var(--brand-secondary)] hover:text-[var(--brand-text)] transition-colors">
                  Preview DSL
                </summary>
                <pre className="mt-1.5 max-h-32 overflow-auto rounded-[var(--radius-sm)] bg-[var(--brand-surface)] border border-[var(--color-brand-border)] p-2 font-mono text-[10px] leading-4 text-[var(--brand-text)] custom-scrollbar">
                  {nativeResult.dsl}
                </pre>
              </details>

              {onApplyDsl && (
                <Button
                  variant={appliedFeedback ? 'ghost' : 'primary'}
                  size="sm"
                  onClick={handleApply}
                  icon={appliedFeedback ? <Check className="h-3.5 w-3.5" /> : undefined}
                  className="mt-3 w-full"
                >
                  {appliedFeedback ? 'Applied to canvas' : 'Apply to Canvas'}
                </Button>
              )}
            </div>
          )}

          {!nativeResult && !error && <div className="flex-1" />}
        </div>
      </div>
    </>
  );
}
