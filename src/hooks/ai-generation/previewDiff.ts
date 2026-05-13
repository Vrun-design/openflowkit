import type { FlowNode } from '@/lib/types';
import type { AssetGroundingMatch } from '@/services/flowpilot/types';
import type { CodebaseAnalysis } from './codebaseAnalyzer';
import type { GenerateAIFlowResult } from './requestLifecycle';
import type { buildCodebaseNativeDiagram } from './codebaseToNativeDiagram';

export interface ImportDiff {
  addedCount: number;
  removedCount: number;
  updatedCount: number;
  previewTitle: string;
  previewDetail?: string;
  previewStats?: string[];
  assetMatches?: AssetGroundingMatch[];
  result: GenerateAIFlowResult;
}

export type PreviewRequestKind =
  | 'prompt'
  | 'focused-edit'
  | 'code-import'
  | 'sql-import'
  | 'terraform-import'
  | 'openapi-import';

export interface PreviewDescriptor {
  title: string;
  detail?: string;
  stats?: string[];
}

function buildPreviewCopy(
  requestKind: PreviewRequestKind,
  addedCount: number,
  updatedCount: number,
  previewDescriptor?: PreviewDescriptor
): Pick<ImportDiff, 'previewTitle' | 'previewDetail' | 'previewStats'> {
  if (previewDescriptor) {
    return {
      previewTitle: previewDescriptor.title,
      previewDetail: previewDescriptor.detail,
      previewStats: previewDescriptor.stats,
    };
  }

  if (requestKind === 'code-import') {
    return {
      previewTitle: 'Codebase enhancement ready — review the upgraded diagram.',
      previewDetail:
        addedCount > 0 || updatedCount > 0
          ? 'Started from the native repository map and layered in AI architecture improvements.'
          : 'The native repository map is ready and no additional AI upgrades were needed.',
      previewStats: undefined,
    };
  }

  return {
    previewTitle: 'Import ready — review changes before applying.',
    previewStats: undefined,
  };
}

export function computeImportDiff(
  currentNodes: FlowNode[],
  result: GenerateAIFlowResult,
  requestKind: PreviewRequestKind,
  previewDescriptor?: PreviewDescriptor,
  assetMatches?: AssetGroundingMatch[]
): ImportDiff {
  const currentIds = new Set(currentNodes.map((node) => node.id));
  const newIds = new Set(result.layoutedNodes.map((node) => node.id));
  const addedCount = result.layoutedNodes.filter((node) => !currentIds.has(node.id)).length;
  const removedCount = currentNodes.filter((node) => !newIds.has(node.id)).length;
  const updatedCount = result.layoutedNodes.filter((node) => currentIds.has(node.id)).length;

  return {
    addedCount,
    removedCount,
    updatedCount,
    assetMatches,
    ...buildPreviewCopy(requestKind, addedCount, updatedCount, previewDescriptor),
    result,
  };
}

export function buildCodebasePreviewDescriptor(
  analysis: CodebaseAnalysis,
  nativeDiagram: ReturnType<typeof buildCodebaseNativeDiagram>
): PreviewDescriptor {
  const platformLabel =
    analysis.cloudPlatform === 'unknown'
      ? 'Platform: app-only'
      : `Platform: ${analysis.cloudPlatform}`;
  const serviceLabel =
    nativeDiagram.platformServiceCount > 0
      ? `${nativeDiagram.platformServiceCount} platform service${nativeDiagram.platformServiceCount === 1 ? '' : 's'}`
      : `${analysis.detectedServices.length} detected service${analysis.detectedServices.length === 1 ? '' : 's'}`;

  return {
    title: 'Codebase enhancement ready — review the upgraded diagram.',
    detail:
      'Started from the native repository map, then layered in AI architecture upgrades for services, sections, and labeled flows.',
    stats: [
      platformLabel,
      `${nativeDiagram.sectionCount} native section${nativeDiagram.sectionCount === 1 ? '' : 's'}`,
      serviceLabel,
      `${nativeDiagram.edgeCount} preview edge${nativeDiagram.edgeCount === 1 ? '' : 's'}`,
    ],
  };
}
