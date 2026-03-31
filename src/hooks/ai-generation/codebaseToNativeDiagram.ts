import type { CodebaseAnalysis, DetectedService } from './codebaseAnalyzer';

type DirRole =
  | 'routes'
  | 'services'
  | 'models'
  | 'auth'
  | 'utils'
  | 'frontend'
  | 'config'
  | 'unknown';

type FileRole =
  | 'entrypoint'
  | 'controller'
  | 'model'
  | 'service'
  | 'auth'
  | 'config'
  | 'util';

const ROLE_VISUAL: Record<DirRole, { color: string; icon: string; nodeType: 'browser' | 'system' | 'process' }> = {
  routes: { color: 'violet', icon: 'Globe', nodeType: 'system' },
  services: { color: 'blue', icon: 'Server', nodeType: 'system' },
  models: { color: 'emerald', icon: 'Database', nodeType: 'system' },
  auth: { color: 'amber', icon: 'ShieldCheck', nodeType: 'system' },
  utils: { color: 'slate', icon: 'Settings', nodeType: 'process' },
  frontend: { color: 'blue', icon: 'Monitor', nodeType: 'browser' },
  config: { color: 'slate', icon: 'Settings2', nodeType: 'process' },
  unknown: { color: 'slate', icon: 'Folder', nodeType: 'process' },
};

const FILE_ROLE_ICON: Record<FileRole, string> = {
  entrypoint: 'Play',
  controller: 'Globe',
  model: 'Database',
  service: 'Server',
  auth: 'Lock',
  config: 'Settings',
  util: 'Code2',
};

interface NativeDiagramBuildResult {
  dsl: string;
  summary: string;
  nodeCount: number;
  edgeCount: number;
  sectionCount: number;
  platformServiceCount: number;
}

interface SectionModel {
  id: string;
  label: string;
  role: DirRole;
  color: string;
  files: string[];
  importantFiles: string[];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function quoteLabel(label: string): string {
  return `"${label.replace(/"/g, '\\"')}"`;
}

function getPathSegments(path: string): string[] {
  return path
    .split('/')
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

function detectDirRole(dirPath: string): DirRole {
  const searchablePath = getPathSegments(dirPath).join('/');

  if (/(^|\/)(auth|security|permission|middleware|guard)(\/|$)/.test(searchablePath)) {
    return 'auth';
  }
  if (/(^|\/)(route|routes|controller|controllers|handler|handlers|endpoint|api)(\/|$)/.test(searchablePath)) {
    return 'routes';
  }
  if (/(^|\/)(model|models|schema|schemas|entity|entities|repository|repositories|db|database|data|persistence)(\/|$)/.test(searchablePath)) {
    return 'models';
  }
  if (/(^|\/)(component|components|view|views|page|pages|screen|screens|ui|frontend|web|client|site|app)(\/|$)/.test(searchablePath)) {
    return 'frontend';
  }
  if (/(^|\/)(worker|workers|job|jobs|queue|queues|consumer|consumers|service|services|usecase|usecases|domain|business)(\/|$)/.test(searchablePath)) {
    return 'services';
  }
  if (/(^|\/)(config|configs|setting|settings|env|constants)(\/|$)/.test(searchablePath)) {
    return 'config';
  }
  if (/(^|\/)(util|utils|helper|helpers|lib|libs|shared|common|core)(\/|$)/.test(searchablePath)) {
    return 'utils';
  }
  return 'unknown';
}

function detectFileRole(path: string): FileRole {
  const name = path.split('/').pop()?.toLowerCase() ?? '';
  if (/^(index|main|app|server)\./.test(name)) return 'entrypoint';
  if (/route|controller|handler/.test(name)) return 'controller';
  if (/model|schema|entity/.test(name)) return 'model';
  if (/service|usecase/.test(name)) return 'service';
  if (/auth|guard|middleware|jwt|token/.test(name)) return 'auth';
  if (/config|setting|env/.test(name)) return 'config';
  return 'util';
}

function formatSectionLabel(dirPath: string): string {
  const raw = dirPath.startsWith('src/') ? dirPath : dirPath.replace(/^\.\//, '');
  return raw || 'Root';
}

function formatFileLabel(path: string): string {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.[^.]+$/, '');
}

function groupFilesIntoSections(analysis: CodebaseAnalysis): Map<string, string[]> {
  const sections = new Map<string, string[]>();

  for (const file of analysis.files) {
    const segments = file.path.split('/').filter(Boolean);
    const workspaceRoot = segments[0];
    const topDir =
      file.path.startsWith('src/') && segments.length >= 2
        ? segments.slice(0, 2).join('/')
        : ['apps', 'packages', 'services', 'workers', 'libs', 'modules'].includes(workspaceRoot) &&
            segments.length >= 2
          ? segments.slice(0, 2).join('/')
          : workspaceRoot || 'root';
    const files = sections.get(topDir) ?? [];
    files.push(file.path);
    sections.set(topDir, files);
  }

  return sections;
}

function getInboundDependencyCounts(analysis: CodebaseAnalysis): Map<string, number> {
  const inboundCounts = new Map<string, number>();
  for (const edge of analysis.edges) {
    inboundCounts.set(edge.to, (inboundCounts.get(edge.to) ?? 0) + 1);
  }
  return inboundCounts;
}

function selectImportantFiles(
  analysis: CodebaseAnalysis,
  sectionFiles: string[],
  maxNodes = 6
): string[] {
  const inboundCounts = getInboundDependencyCounts(analysis);
  const entryPoints = new Set(analysis.entryPoints);

  return sectionFiles
    .map((path) => ({
      path,
      score: (entryPoints.has(path) ? 100 : 0) + (inboundCounts.get(path) ?? 0),
    }))
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      return scoreDiff !== 0 ? scoreDiff : left.path.localeCompare(right.path);
    })
    .slice(0, maxNodes)
    .map((item) => item.path);
}

function buildSections(analysis: CodebaseAnalysis): SectionModel[] {
  const grouped = groupFilesIntoSections(analysis);

  return [...grouped.entries()]
    .map(([dirPath, files]) => {
      const role = detectDirRole(dirPath);
      const visual = ROLE_VISUAL[role];
      return {
        id: `section_${slugify(dirPath)}`,
        label: formatSectionLabel(dirPath),
        role,
        color: visual.color,
        files,
        importantFiles: selectImportantFiles(analysis, files),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function buildCloudServiceSection(services: DetectedService[]): string[] {
  if (services.length === 0) {
    return [];
  }

  const supportedServices = services.filter((service) => service.provider !== 'unknown');
  if (supportedServices.length === 0) {
    return [];
  }

  const lines: string[] = [];

  for (const service of supportedServices.slice(0, 6)) {
    const nodeId = `svc_${slugify(service.name)}`;
    const iconPackId = service.iconPackId ? `, archIconPackId: "${service.iconPackId}"` : '';
    const iconShapeId = service.iconShapeId ? `, archIconShapeId: "${service.iconShapeId}"` : '';
    lines.push(
      `[architecture] ${nodeId}: ${service.name} { archProvider: "${service.provider}", archResourceType: "${service.resourceType}", color: "${service.suggestedColor}"${iconPackId}${iconShapeId} }`
    );
  }

  return lines;
}

function buildNativeDiagramDsl(analysis: CodebaseAnalysis): string {
  const sections = buildSections(analysis);
  const lines = [
    `flow: ${quoteLabel('Repository Module Structure')}`,
    'direction: TB',
    '',
  ];

  for (const section of sections) {
    for (const path of section.importantFiles) {
      const fileRole = detectFileRole(path);
      const nodeId = `file_${slugify(path)}`;
      const label = formatFileLabel(path);
      const visual = ROLE_VISUAL[section.role];
      const subLabel = `${section.label} · ${path}`.replace(/"/g, '\\"');
      lines.push(
        `[${visual.nodeType}] ${nodeId}: ${label} { icon: "${FILE_ROLE_ICON[fileRole]}", color: "${section.color}", subLabel: "${subLabel}" }`
      );
    }

    lines.push('');
  }

  const cloudLines = buildCloudServiceSection(analysis.detectedServices);
  if (cloudLines.length > 0) {
    lines.push(...cloudLines, '');
  }

  return lines.join('\n').trim();
}

function countDiagramElements(dsl: string): { nodeCount: number; edgeCount: number } {
  const lines = dsl.split('\n');
  let nodeCount = 0;
  let edgeCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[(entity|process|system|start|end|decision|browser|mobile|note|annotation|container|architecture)\]/.test(trimmed)) {
      nodeCount += 1;
      continue;
    }
    if (/->/.test(trimmed) && !trimmed.startsWith('flow:') && !trimmed.startsWith('direction:')) {
      edgeCount += 1;
    }
  }

  return { nodeCount, edgeCount };
}

export function buildCodebaseNativeDiagram(
  analysis: CodebaseAnalysis
): NativeDiagramBuildResult {
  const sections = buildSections(analysis);
  const platformServiceCount = analysis.detectedServices.filter(
    (service) => service.provider !== 'unknown'
  ).length;
  const dsl = buildNativeDiagramDsl(analysis);
  const counts = countDiagramElements(dsl);
  const sectionCount = sections.length;

  return {
    dsl,
    sectionCount,
    platformServiceCount,
    nodeCount: counts.nodeCount,
    edgeCount: counts.edgeCount,
    summary: `${sectionCount} section${sectionCount === 1 ? '' : 's'}, ${analysis.entryPoints.length} entry point${analysis.entryPoints.length === 1 ? '' : 's'}, ${analysis.edges.length} dependency edges, ${platformServiceCount} platform service${platformServiceCount === 1 ? '' : 's'}`,
  };
}
