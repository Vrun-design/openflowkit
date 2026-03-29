import React from 'react';
import { Check, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CodebaseAnalysis } from '@/hooks/ai-generation/codebaseAnalyzer';

interface GitHubTokenSettingsProps {
  token: string;
  onTokenBlur: (value: string) => void;
}

export function GitHubTokenSettings({
  token,
  onTokenBlur,
}: GitHubTokenSettingsProps): React.ReactElement {
  return (
    <details className="group">
      <summary className="cursor-pointer text-[11px] font-medium text-[var(--brand-secondary)] hover:text-[var(--brand-text)] transition-colors">
        GitHub settings {token ? '(token set)' : '(no token — 60 req/hr limit)'}
      </summary>
      <div className="mt-2 flex gap-2">
        <input
          type="password"
          defaultValue={token}
          placeholder="Personal access token (ghp_...)"
          className="flex-1 h-8 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2.5 text-[11px] font-mono text-[var(--brand-text)] outline-none placeholder:text-[var(--brand-secondary)]/40 focus:border-[var(--brand-primary)]"
          onBlur={(event) => onTokenBlur(event.target.value)}
        />
      </div>
      <p className="mt-1 text-[10px] text-[var(--brand-secondary)]">
        Token with public_repo scope gives 5,000 req/hr. Stored locally only.
      </p>
    </details>
  );
}

interface GitHubRepoFetcherProps {
  githubUrl: string;
  isFetchingGithub: boolean;
  fetchProgress: string | null;
  onUrlChange: (value: string) => void;
  onFetch: () => void;
}

export function GitHubRepoFetcher({
  githubUrl,
  isFetchingGithub,
  fetchProgress,
  onUrlChange,
  onFetch,
}: GitHubRepoFetcherProps): React.ReactElement {
  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          value={githubUrl}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="Paste GitHub URL (e.g. github.com/user/repo)"
          className="flex-1 h-9 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 text-xs text-[var(--brand-text)] outline-none transition-colors placeholder:text-[var(--brand-secondary)]/60 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)]"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && githubUrl.trim()) {
              event.preventDefault();
              onFetch();
            }
          }}
        />
        <Button
          variant="primary"
          size="sm"
          icon={isFetchingGithub ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
          onClick={onFetch}
          disabled={!githubUrl.trim() || isFetchingGithub}
        >
          {isFetchingGithub ? 'Fetching...' : 'Fetch'}
        </Button>
      </div>

      {fetchProgress ? (
        <div className="flex items-center gap-2 text-[11px] text-[var(--brand-secondary)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {fetchProgress}
        </div>
      ) : null}
    </>
  );
}

interface ZipUploadButtonProps {
  isExtractingZip: boolean;
  onClick: () => void;
}

export function ZipUploadButton({
  isExtractingZip,
  onClick,
}: ZipUploadButtonProps): React.ReactElement {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-brand-border)]" />
        <span className="text-[10px] font-medium text-[var(--brand-secondary)] uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 h-px bg-[var(--color-brand-border)]" />
      </div>

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
        onClick={onClick}
        disabled={isExtractingZip}
        className="w-full"
      >
        {isExtractingZip ? 'Extracting...' : 'Or upload .zip file'}
      </Button>
    </>
  );
}

interface CodebaseAnalysisSummaryProps {
  codebaseAnalysis: CodebaseAnalysis;
}

export function CodebaseAnalysisSummary({
  codebaseAnalysis,
}: CodebaseAnalysisSummaryProps): React.ReactElement {
  return (
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

      {codebaseAnalysis.entryPoints.length > 0 ? (
        <div className="pl-7 mb-2">
          <p className="text-[11px] font-medium text-[var(--brand-secondary)] mb-1">
            Entry points:
          </p>
          {codebaseAnalysis.entryPoints.slice(0, 5).map((entryPoint) => (
            <span
              key={entryPoint}
              className="inline-block text-[10px] font-mono bg-[var(--brand-primary-50)] text-[var(--brand-primary)] rounded px-1.5 py-0.5 mr-1 mb-1"
            >
              {entryPoint}
            </span>
          ))}
        </div>
      ) : null}

      <details className="pl-7">
        <summary className="cursor-pointer text-[11px] font-medium text-[var(--brand-secondary)] hover:text-[var(--brand-text)] transition-colors">
          View full analysis
        </summary>
        <pre className="mt-1.5 max-h-40 overflow-auto rounded-[var(--radius-sm)] bg-[var(--brand-surface)] border border-[var(--color-brand-border)] p-2 font-mono text-[10px] leading-4 text-[var(--brand-text)] custom-scrollbar">
          {codebaseAnalysis.summary}
        </pre>
      </details>
    </div>
  );
}
