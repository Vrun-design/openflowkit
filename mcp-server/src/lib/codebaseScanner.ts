import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight Node-side codebase scanner that mirrors the heuristics from
 * the in-app analyzer (src/hooks/ai-generation/codebaseAnalyzer/) without
 * pulling its UI-bound dependencies. Detects cloud platform and common
 * services from file paths + content via regex rules.
 */

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

export interface ScannedFile {
  path: string;
  content: string;
}

export const INCLUDE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.php', '.cs', '.scala', '.clj', '.ex', '.exs',
  '.yaml', '.yml', '.tf', '.json', '.toml',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', 'out', 'tmp', '.cache', '.turbo', '.vercel',
  '__pycache__', '.pytest_cache', 'venv', '.venv', 'target',
  '.gradle', '.idea', '.vscode',
]);

export const LANGUAGE_BY_EXT: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.kt': 'kotlin', '.swift': 'swift',
  '.php': 'php', '.cs': 'csharp',
  '.yaml': 'yaml', '.yml': 'yaml', '.tf': 'terraform',
  '.json': 'json', '.toml': 'toml',
};

export interface DetectionRule {
  name: string;
  type: DetectedService['type'];
  provider: DetectedService['provider'];
  patterns: RegExp[];
}

export const SERVICE_RULES: DetectionRule[] = [
  { name: 'PostgreSQL', type: 'database', provider: 'unknown', patterns: [/\bpsycopg\b/i, /\bpostgres\b/i, /\bpostgresql\b/i, /\bpg\b/i] },
  { name: 'MySQL', type: 'database', provider: 'unknown', patterns: [/\bmysql2?\b/i, /\bpymysql\b/i] },
  { name: 'MongoDB', type: 'database', provider: 'unknown', patterns: [/\bmongodb\b/i, /\bmongoose\b/i] },
  { name: 'Redis', type: 'cache', provider: 'unknown', patterns: [/\bioredis\b/i, /\bredis\b/i] },
  { name: 'Kafka', type: 'messaging', provider: 'unknown', patterns: [/\bkafkajs\b/i, /\bconfluent-kafka\b/i] },
  { name: 'RabbitMQ', type: 'queue', provider: 'unknown', patterns: [/\bamqplib\b/i, /\bpika\b/i] },
  { name: 'S3', type: 'storage', provider: 'aws', patterns: [/\bS3Client\b/, /\bboto3\b/i] },
  { name: 'CloudFront', type: 'network', provider: 'aws', patterns: [/\bcloudfront\b/i] },
  { name: 'RDS', type: 'database', provider: 'aws', patterns: [/\bRDS\b/, /\brds\b/i] },
  { name: 'DynamoDB', type: 'database', provider: 'aws', patterns: [/\bDynamoDB\b/, /\bdynamodb\b/i] },
  { name: 'Lambda', type: 'compute', provider: 'aws', patterns: [/\bLambda\b/, /@aws-sdk\/client-lambda/, /\blambda\b/i] },
  { name: 'API Gateway', type: 'api', provider: 'aws', patterns: [/\bapi gateway\b/i, /\bapigateway\b/i] },
  { name: 'SQS', type: 'queue', provider: 'aws', patterns: [/\bSQS\b/, /\bsqs\b/i] },
  { name: 'Azure Functions', type: 'compute', provider: 'azure', patterns: [/@azure\/functions/i, /\bfunctionapp\b/i] },
  { name: 'Azure SQL', type: 'database', provider: 'azure', patterns: [/\bazure sql\b/i, /\bmssql\b/i] },
  { name: 'Cloud Storage', type: 'storage', provider: 'gcp', patterns: [/@google-cloud\/storage/, /\bcloud storage\b/i] },
  { name: 'Cloud SQL', type: 'database', provider: 'gcp', patterns: [/\bcloud sql\b/i] },
  { name: 'BigQuery', type: 'database', provider: 'gcp', patterns: [/@google-cloud\/bigquery/i, /\bbigquery\b/i] },
  { name: 'Pub/Sub', type: 'messaging', provider: 'gcp', patterns: [/@google-cloud\/pubsub/i, /\bpub\/sub\b/i] },
  { name: 'Kubernetes', type: 'compute', provider: 'cncf', patterns: [/\bapiVersion:\s*apps\//i, /\bkind:\s*Deployment\b/i, /\bkubectl\b/i] },
  { name: 'Docker Compose', type: 'compute', provider: 'docker', patterns: [/\bdocker-compose\b/i, /\bcompose\.ya?ml\b/i] },
  { name: 'Stripe', type: 'api', provider: 'third-party', patterns: [/\bstripe\b/i] },
];

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
  return !SKIP_DIRS.has(entryName) && !entryName.startsWith('.');
}

export function isScannedFileName(name: string): boolean {
  return INCLUDE_EXT.has(path.extname(name).toLowerCase());
}

/**
 * The one walk both the analyzer and architecture discovery use: same skip
 * list, same size cap. `accept` widens the extension filter (Dockerfiles,
 * go.mod) without forking the ignore rules.
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
      if (!accept(entry.name)) continue;
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
