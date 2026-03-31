export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'java'
  | 'ruby'
  | 'csharp'
  | 'cpp'
  | 'rust';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
  java: 'Java',
  ruby: 'Ruby',
  csharp: 'C#',
  cpp: 'C++',
  rust: 'Rust',
};

export const FILE_EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  py: 'python',
  go: 'go',
  java: 'java',
  rb: 'ruby',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  rs: 'rust',
};

export interface CodeToArchitectureOptions {
  code: string;
  language: SupportedLanguage;
}

export interface CodebaseArchitectureContext {
  summary: string;
  cloudPlatform?: 'aws' | 'gcp' | 'azure' | 'cncf' | 'docker' | 'mixed' | 'unknown';
  detectedServices?: Array<{
    name: string;
    type: 'database' | 'cache' | 'queue' | 'api' | 'compute' | 'storage' | 'identity' | 'network' | 'observability' | 'service' | 'messaging';
    provider: 'aws' | 'gcp' | 'azure' | 'cncf' | 'docker' | 'third-party' | 'unknown';
    resourceType?: 'service' | 'database' | 'queue' | 'cdn' | 'dns' | 'load_balancer' | 'firewall';
    suggestedColor?: 'blue' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate' | 'pink' | 'yellow';
    iconPackId?: string;
    iconShapeId?: string;
    evidence?: string[];
  }>;
  infraFiles?: string[];
}

function formatDetectedServiceLines(
  detectedServices: NonNullable<CodebaseArchitectureContext['detectedServices']>
): string {
  if (detectedServices.length === 0) {
    return '- none detected';
  }

  return detectedServices
    .map((service) => {
      const evidence =
        service.evidence && service.evidence.length > 0
          ? ` (evidence: ${service.evidence.join(', ')})`
          : '';
      return `- ${service.name} [${service.type}] provider=${service.provider}${evidence}`;
    })
    .join('\n');
}

function formatSuggestedNodeHints(
  detectedServices: NonNullable<CodebaseArchitectureContext['detectedServices']>
): string {
  if (detectedServices.length === 0) {
    return '- none available';
  }

  return detectedServices
    .map((service) => {
      const resourceType = service.resourceType ?? 'service';
      const suggestedColor = service.suggestedColor ?? 'slate';
      const iconPackHint = service.iconPackId ? `, archIconPackId: "${service.iconPackId}"` : '';
      const iconShapeHint = service.iconShapeId
        ? `, archIconShapeId: "${service.iconShapeId}"`
        : '';
      return `- ${service.name} -> use [architecture], archProvider: "${service.provider}", archResourceType: "${resourceType}", color: "${suggestedColor}"${iconPackHint}${iconShapeHint}`;
    })
    .join('\n');
}

function formatInfraFileLines(infraFiles: string[]): string {
  return infraFiles.length > 0 ? infraFiles.map((file) => `- ${file}`).join('\n') : '- none detected';
}

export function buildCodeToArchitecturePrompt({
  code,
  language,
}: CodeToArchitectureOptions): string {
  return `Analyze this ${LANGUAGE_LABELS[language]} source code and generate a clean architecture diagram.

Identify the main modules, services, classes, functions, and their dependencies. Focus on the high-level structure — not every line of code, only meaningful architectural components and relationships.

Guidelines:
- Detect the platform and infrastructure cues from the code before choosing node types
- Use [architecture] nodes for databases, caches, queues, external APIs, cloud services, and infrastructure
- Use [system] nodes for application services, classes, modules, controllers, and business logic
- Use [browser] or [mobile] nodes for frontend surfaces if present
- Do not use section or group containers; keep related components adjacent and use labels or subtitles to imply layers such as Frontend, Backend, or Database Layer
- Use [process] nodes for key operations or workflows
- Color by layer:
  - blue for frontend and user-facing surfaces
  - violet for backend services and APIs
  - emerald for databases and persistent stores
  - amber for queues, workers, and async processing
  - yellow for caches and fast-path systems
  - pink for external or third-party services
- Show data flow and dependencies as edges with clear labels like "HTTP/REST", "SQL", "events", or "cache"
- Prefer [architecture] when the code clearly references cloud services or runtime infrastructure

SOURCE CODE (${LANGUAGE_LABELS[language]}):
\`\`\`${language}
${code}
\`\`\``;
}

export function buildCodebaseToArchitecturePrompt({
  summary,
  cloudPlatform = 'unknown',
  detectedServices = [],
  infraFiles = [],
}: CodebaseArchitectureContext): string {
  const serviceLines = formatDetectedServiceLines(detectedServices);
  const suggestedNodeHints = formatSuggestedNodeHints(detectedServices);
  const infraLines = formatInfraFileLines(infraFiles);

  return `Analyze this codebase structure and dependency graph, then generate a clean architecture diagram.

The codebase was analyzed statically — file imports and dependencies were parsed automatically. Use this structural data to create a meaningful architecture overview.

Guidelines:
- Detect the tech stack and platform from imports, dependencies, and infra files
- Do not use section or group containers for top-level layers or modules such as Frontend, API, Services, Data, Platform, or External Services
- Use [architecture] nodes for databases, caches, queues, external APIs, cloud services, infrastructure, and platform resources
- Use [system] nodes for key files or modules that serve as services, controllers, models, utilities, or internal APIs
- Use [browser] or [mobile] nodes for frontend entry points if present
- Use [process] nodes for key workflows (e.g. authentication flow, data pipeline)
- If cloud or infra evidence exists, reflect it with the correct provider:
  - aws -> archProvider: "aws"
  - azure -> archProvider: "azure"
  - gcp -> archProvider: "gcp"
  - cncf -> archProvider: "cncf"
  - docker -> use [architecture] service nodes for containers and runtimes
- Color by layer:
  - blue -> frontend / user-facing
  - violet -> backend services / APIs
  - emerald -> databases / durable storage
  - amber -> queues / async workers
  - yellow -> caches
  - pink -> external / third-party services
- Label important edges with what flows across them: "HTTP/REST", "SQL", "gRPC", "events", "cache", "files"
- Show dependency edges between modules only when they help clarify architecture
- Group related modules that are heavily connected
- Focus on the highest-level picture — not every file, just the important ones
- Entry points should be prominent (they're the app's starting points)

DETECTED PLATFORM:
- cloudPlatform: ${cloudPlatform}

DETECTED SERVICES:
${serviceLines}

SUGGESTED NODE HINTS:
${suggestedNodeHints}

INFRA FILES:
${infraLines}

CODEBASE ANALYSIS:
${summary}`;
}
