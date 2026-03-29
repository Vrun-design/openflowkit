import React, { useCallback, useRef, useState } from 'react';
import {
  parseGitHubUrl,
  fetchGitHubRepo,
  getGitHubToken,
  setGitHubToken,
} from '@/services/githubFetcher';
import { extractZipFiles } from '@/services/zipExtractor';
import { analyzeCodebase, type CodebaseAnalysis } from '@/hooks/ai-generation/codebaseAnalyzer';
import {
  CodebaseAnalysisSummary,
  GitHubRepoFetcher,
  GitHubTokenSettings,
  ZipUploadButton,
} from './CodebaseImportPanels';
import { ImportFileBadge } from './ImportSurfacePrimitives';

interface CodebaseImportSectionProps {
  codebaseAnalysis: CodebaseAnalysis | null;
  onSetCodebaseAnalysis: (analysis: CodebaseAnalysis | null) => void;
  onSetFileInfo: (info: { name: string; size: number } | null) => void;
  onSetError: (error: string | null) => void;
  fileInfo: { name: string; size: number } | null;
}

export function CodebaseImportSection({
  codebaseAnalysis,
  onSetCodebaseAnalysis,
  onSetFileInfo,
  onSetError,
  fileInfo,
}: CodebaseImportSectionProps): React.ReactElement {
  const [githubUrl, setGithubUrl] = useState('');
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const handleGithubFetch = useCallback(async () => {
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      onSetError('Invalid GitHub URL. Use format: github.com/owner/repo');
      return;
    }
    setIsFetchingGithub(true);
    onSetError(null);
    onSetCodebaseAnalysis(null);
    setFetchProgress('Connecting...');
    try {
      const files = await fetchGitHubRepo(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        setFetchProgress
      );
      if (files.length === 0) {
        onSetError('No source files found in this repository.');
        setIsFetchingGithub(false);
        setFetchProgress(null);
        return;
      }
      const analysis = analyzeCodebase(files);
      onSetCodebaseAnalysis(analysis);
      onSetFileInfo({ name: `${parsed.owner}/${parsed.repo}`, size: 0 });
    } catch (err) {
      onSetError(err instanceof Error ? err.message : 'Failed to fetch repository.');
    } finally {
      setIsFetchingGithub(false);
      setFetchProgress(null);
    }
  }, [githubUrl, onSetCodebaseAnalysis, onSetError, onSetFileInfo]);

  const handleZipSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      setIsExtractingZip(true);
      onSetError(null);
      onSetCodebaseAnalysis(null);
      try {
        const files = await extractZipFiles(file);
        if (files.length === 0) {
          onSetError('No source files found in the zip.');
          setIsExtractingZip(false);
          return;
        }
        const analysis = analyzeCodebase(files);
        onSetCodebaseAnalysis(analysis);
        onSetFileInfo({ name: file.name, size: file.size });
      } catch (err) {
        onSetError(err instanceof Error ? err.message : 'Failed to extract zip.');
      } finally {
        setIsExtractingZip(false);
      }
    },
    [onSetCodebaseAnalysis, onSetError, onSetFileInfo]
  );

  return (
    <div className="flex flex-col gap-3 flex-1">
      <GitHubTokenSettings token={getGitHubToken()} onTokenBlur={setGitHubToken} />

      <GitHubRepoFetcher
        githubUrl={githubUrl}
        isFetchingGithub={isFetchingGithub}
        fetchProgress={fetchProgress}
        onUrlChange={setGithubUrl}
        onFetch={() => void handleGithubFetch()}
      />

      <input
        type="file"
        accept=".zip"
        className="hidden"
        ref={zipInputRef}
        onChange={(e) => void handleZipSelect(e)}
      />
      <ZipUploadButton
        isExtractingZip={isExtractingZip}
        onClick={() => zipInputRef.current?.click()}
      />

      {fileInfo ? <ImportFileBadge fileInfo={fileInfo} /> : null}

      {codebaseAnalysis ? <CodebaseAnalysisSummary codebaseAnalysis={codebaseAnalysis} /> : null}
    </div>
  );
}
