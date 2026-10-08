// What discovery and the codebase analyzer look for: source extensions, languages,
// and the datastores, queues and services a client import or image names. Pure data,
// shared by the MCP server (Node) and the repo page (browser).

/** POSIX path helpers: discovery paths are repo-relative with `/` on every host. */
export function basename(file: string): string {
  return file.slice(file.lastIndexOf('/') + 1);
}

/** `.` for a root-level file, like `path.posix.dirname`. */
export function dirname(file: string): string {
  const slash = file.lastIndexOf('/');
  return slash <= 0 ? (slash === 0 ? '/' : '.') : file.slice(0, slash);
}

export function extname(file: string): string {
  const name = basename(file);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot);
}

export interface DetectedService {
  name: string;
  type: string;
  provider: 'aws' | 'gcp' | 'azure' | 'cncf' | 'docker' | 'third-party' | 'unknown';
  evidence: string[];
}

export interface ScannedFile {
  path: string;
  content: string;
}

/** Directories no scan descends into: dependencies, build output, caches, editor state. */
export const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', 'out', 'tmp', '.cache', '.turbo', '.vercel',
  '__pycache__', '.pytest_cache', 'venv', '.venv', 'target',
  '.gradle', '.idea', '.vscode',
]);

/** A directory name every scan skips: the shared list, or any dot-directory. */
export function isSkippedDir(name: string): boolean {
  return SKIP_DIRS.has(name) || (name.startsWith('.') && name !== '.' && name !== '..');
}

export const INCLUDE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.php', '.cs', '.scala', '.clj', '.ex', '.exs',
  '.yaml', '.yml', '.tf', '.json', '.toml',
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
  { name: 'PostgreSQL', type: 'database', provider: 'unknown', patterns: [/\bpsycopg2?\b/i, /\bpostgres\b/i, /\bpostgresql\b/i, /\bpg\b/i] },
  { name: 'MySQL', type: 'database', provider: 'unknown', patterns: [/\bmysql2?\b/i, /\bpymysql\b/i] },
  { name: 'MongoDB', type: 'database', provider: 'unknown', patterns: [/\bmongodb\b/i, /\bmongoose\b/i] },
  { name: 'Redis', type: 'cache', provider: 'unknown', patterns: [/\bioredis\b/i, /\bredis\b/i] },
  { name: 'Kafka', type: 'messaging', provider: 'unknown', patterns: [/\bkafkajs\b/i, /\bconfluent-kafka\b/i] },
  { name: 'RabbitMQ', type: 'queue', provider: 'unknown', patterns: [/\bamqplib\b/i, /\bpika\b/i] },
  { name: 'S3', type: 'storage', provider: 'aws', patterns: [/\bS3Client\b/, /@aws-sdk\/client-s3\b/] },
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

export function isScannedFileName(name: string): boolean {
  return INCLUDE_EXT.has(extname(name).toLowerCase());
}
