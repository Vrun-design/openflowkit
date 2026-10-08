import fs from 'node:fs';
import path from 'node:path';
import { LANGUAGE_BY_EXT, SERVICE_RULES, isScannedFileName, isSkippedDir, type ScannedFile } from './agent.js';

/**
 * Lightweight Node-side codebase scanner that mirrors the heuristics from
 * the in-app analyzer (src/hooks/ai-generation/codebaseAnalyzer/) without
 * pulling its UI-bound dependencies. Detects cloud platform and common
 * services from file paths + content via regex rules.
 */

export { INCLUDE_EXT, LANGUAGE_BY_EXT, SERVICE_RULES, isScannedFileName } from './agent.js';
export type { DetectionRule, ScannedFile } from './agent.js';

export type CloudPlatform = 'aws' | 'gcp' | 'azure' | 'cncf' | 'docker' | 'mixed' | 'unknown';

export interface DetectedService {
  name: string;
  type: string;
  provider: 'aws' | 'gcp' | 'azure' | 'cncf' | 'docker' | 'third-party' | 'unknown';
  evidence: string[];
}

export interface CodebaseScanResult {
  rootPath: string;
  totalFiles: number;
  scannedFiles: number;
  cloudPlatform: CloudPlatform;
  detectedServices: DetectedService[];
  topDirectories: Array<{ path: string; fileCount: number }>;
  languages: Record<string, number>;
}

function detectCloudPlatform(allContent: string, allPaths: string[]): CloudPlatform {
  const hits = new Set<Exclude<CloudPlatform, 'mixed' | 'unknown'>>();
  if (/@aws-sdk\/|aws-sdk|boto3|botocore|provider\s+"aws"/i.test(allContent)) hits.add('aws');
  if (/@google-cloud|google\.cloud|firebase|provider\s+"google"/i.test(allContent)) hits.add('gcp');
  if (/@azure\/|azure-identity|azurerm/i.test(allContent)) hits.add('azure');
  if (
    /\bkubernetes\b|\bkubectl\b|\bkind:\s*(Deployment|Service|Ingress|ConfigMap|StatefulSet)\b/i.test(allContent) ||
    allPaths.some((p) => p.toLowerCase().endsWith('chart.yaml') || p.toLowerCase().includes('/charts/'))
  ) {
    hits.add('cncf');
  }
  if (allPaths.some((p) => p.toLowerCase().includes('docker-compose') || p.toLowerCase().endsWith('compose.yaml'))) {
    hits.add('docker');
  }
  if (hits.size === 0) return 'unknown';
  if (hits.size === 1) return [...hits][0]!;
  return 'mixed';
}

function shouldVisit(entryName: string): boolean {
  return !isSkippedDir(entryName);
}

/**
 * The one walk both the analyzer and architecture discovery use: same skip
 * list, same size cap. `accept` sees the repo-relative path: it widens the
 * extension filter (Dockerfiles, go.mod) or narrows it (tests) without forking
 * the ignore rules.
 */
export async function walkProjectFiles(
  rootDir: string,
  maxFiles: number,
  accept: (name: string) => boolean = isScannedFileName
): Promise<{ files: ScannedFile[]; totalFiles: number }> {
  const collected: ScannedFile[] = [];
  let totalFiles = 0;
  const stack: string[] = [rootDir];

  while (stack.length > 0 && collected.length < maxFiles) {
    const currentDir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!shouldVisit(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      totalFiles += 1;
      if (!accept(path.relative(rootDir, fullPath))) continue;
      if (collected.length >= maxFiles) break;
      try {
        const stat = await fs.promises.stat(fullPath);
        if (stat.size > 256 * 1024) continue; // skip files >256KB
        const content = await fs.promises.readFile(fullPath, 'utf8');
        collected.push({ path: path.relative(rootDir, fullPath), content });
      } catch {
        // Unreadable file — skip silently.
      }
    }
  }

  return { files: collected, totalFiles };
}

export async function scanCodebase(
  rootPath: string,
  maxFiles = 500
): Promise<CodebaseScanResult> {
  const resolvedRoot = path.resolve(rootPath);
  const stat = await fs.promises.stat(resolvedRoot).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`rootPath "${rootPath}" is not a directory.`);
  }

  const { files, totalFiles } = await walkProjectFiles(resolvedRoot, maxFiles);
  const allContent = files.map((f) => f.content).join('\n');
  const allPaths = files.map((f) => f.path);
  const cloudPlatform = detectCloudPlatform(allContent, allPaths);

  const services: DetectedService[] = [];
  for (const rule of SERVICE_RULES) {
    const evidence = new Set<string>();
    for (const file of files) {
      const normalizedPath = file.path.toLowerCase();
      if (rule.patterns.some((p) => p.test(file.content) || p.test(normalizedPath))) {
        evidence.add(file.path);
      }
    }
    if (evidence.size === 0) continue;
    services.push({
      name: rule.name,
      type: rule.type,
      provider: rule.provider,
      evidence: [...evidence].slice(0, 3),
    });
  }
  services.sort((a, b) => a.name.localeCompare(b.name));

  const languages: Record<string, number> = {};
  const dirCounts = new Map<string, number>();
  for (const file of files) {
    const ext = path.extname(file.path).toLowerCase();
    const lang = LANGUAGE_BY_EXT[ext];
    if (lang) languages[lang] = (languages[lang] ?? 0) + 1;
    const topDir = file.path.split('/')[0] ?? '.';
    dirCounts.set(topDir, (dirCounts.get(topDir) ?? 0) + 1);
  }
  const topDirectories = [...dirCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dir, count]) => ({ path: dir, fileCount: count }));

  return {
    rootPath: resolvedRoot,
    totalFiles,
    scannedFiles: files.length,
    cloudPlatform,
    detectedServices: services,
    topDirectories,
    languages,
  };
}

export function buildArchitectureSummary(result: CodebaseScanResult): string {
  const lines: string[] = [];
  lines.push(`Root: ${result.rootPath}`);
  lines.push(`Scanned ${result.scannedFiles}/${result.totalFiles} files`);
  lines.push(`Cloud platform: ${result.cloudPlatform}`);
  if (Object.keys(result.languages).length > 0) {
    const top = Object.entries(result.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count]) => `${lang}:${count}`)
      .join(', ');
    lines.push(`Top languages: ${top}`);
  }
  if (result.detectedServices.length > 0) {
    lines.push('');
    lines.push('Detected services:');
    for (const service of result.detectedServices) {
      lines.push(`  - ${service.name} [${service.type}/${service.provider}] — ${service.evidence.join(', ')}`);
    }
  }
  if (result.topDirectories.length > 0) {
    lines.push('');
    lines.push('Top directories:');
    for (const dir of result.topDirectories.slice(0, 8)) {
      lines.push(`  ${dir.path}/  (${dir.fileCount} files)`);
    }
  }
  return lines.join('\n');
}
