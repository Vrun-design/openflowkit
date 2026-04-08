import type { DiagramType, FlowNode } from '@/lib/types';
import type { DomainLibraryCategory } from '@/services/domainLibrary';
import { createProviderIconData, normalizeNodeIconData } from '@/lib/nodeIconState';
import {
  classifyNode,
  isCommonEnglishIconTerm,
  isSpecificTechnologyIconQuery,
} from '@/lib/semanticClassifier';
import { matchIcon, type IconMatch } from '@/lib/iconMatcher';

export interface EnrichNodesWithIconsOptions {
  diagramType?: DiagramType;
  mode?: 'general' | 'mermaid-import';
}

const IMPORT_ICON_MATCH_THRESHOLD = 0.92;
const DEFAULT_ICON_MATCH_THRESHOLD = 0.8;
const DIAGRAM_TYPES_WITHOUT_IMPORT_ICON_ENRICHMENT = new Set<DiagramType>([
  'stateDiagram',
  'sequence',
  'classDiagram',
  'erDiagram',
  'journey',
]);

function withNormalizedNodeData(
  node: FlowNode,
  dataOverrides?: Record<string, unknown>
): FlowNode {
  return {
    ...node,
    data: normalizeNodeIconData({
      ...node.data,
      ...dataOverrides,
    }),
  };
}

function applyProviderIcon(match: IconMatch, updates: Record<string, unknown>): void {
  Object.assign(
    updates,
    createProviderIconData({
      packId: match.packId,
      shapeId: match.shapeId,
      provider: match.provider as DomainLibraryCategory,
      category: match.category,
    })
  );
  updates.assetPresentation = 'icon';
}

function isTrustedImportMatch(match: IconMatch, query: string): boolean {
  if (match.isVariant) {
    return false;
  }

  if (match.matchType === 'exact' || match.matchType === 'alias') {
    return true;
  }

  if (match.matchType !== 'substring') {
    return false;
  }

  return (
    match.confidence === 'high'
    && match.wholeTokenMatch
    && !match.isGeneric
    && !isCommonEnglishIconTerm(query)
    && match.runnerUpDelta >= 0.08
  );
}

export function enrichNodesWithIcons(
  nodes: FlowNode[],
  options: EnrichNodesWithIconsOptions = {}
): FlowNode[] {
  return nodes.map((node) => {
    try {
      return enrichSingleNode(node, options);
    } catch {
      return node;
    }
  });
}

function enrichSingleNode(node: FlowNode, options: EnrichNodesWithIconsOptions): FlowNode {
  if (node.type === 'section' || node.type === 'group' || node.type === 'swimlane') {
    return node;
  }

  const label = node.data?.label ?? '';
  const nodeColor = node.data?.color;
  const isDefaultColor = !nodeColor || nodeColor === 'slate' || nodeColor === 'white';
  const hasExplicitColor = !isDefaultColor;
  const hasExplicitProviderIcon = Boolean(node.data?.archIconPackId);
  const hasAnyIcon = Boolean(node.data?.icon) || hasExplicitProviderIcon;

  if (hasExplicitColor && hasAnyIcon) {
    return withNormalizedNodeData(node);
  }

  const hint = classifyNode({ id: node.id, label, shape: node.data?.shape });
  const dataUpdates: Record<string, unknown> = {};

  if (!hasExplicitColor) {
    applyColor(node, hint.color, dataUpdates);
  }

  if (!hasExplicitProviderIcon) {
    applyIcon(node, label, hint, dataUpdates, options);
  }

  if (Object.keys(dataUpdates).length === 0) {
    return withNormalizedNodeData(node);
  }

  return withNormalizedNodeData(node, dataUpdates);
}

function applyColor(
  node: FlowNode,
  classifierColor: string,
  updates: Record<string, unknown>
): void {
  if (node.type === 'start') {
    updates.color = 'emerald';
  } else if (node.type === 'end') {
    updates.color = 'red';
  } else if (node.type === 'decision') {
    updates.color = 'amber';
  } else {
    updates.color = classifierColor;
  }
}

function applyIcon(
  node: FlowNode,
  label: string,
  hint: { iconQuery: string; lucideFallback: string; category: string },
  updates: Record<string, unknown>,
  options: EnrichNodesWithIconsOptions
): void {
  if (node.type === 'start' || node.type === 'end' || node.type === 'decision') {
    applyLucideFallback(node, hint.lucideFallback, updates);
    return;
  }

  const explicitIcon = node.data?.icon;
  const provider = node.data?.provider;
  const providerHint = typeof provider === 'string' ? provider : undefined;
  const { iconMatchThreshold, iconEnrichmentAllowed } = getIconEnrichmentPolicy(options);

  if (explicitIcon && typeof explicitIcon === 'string' && explicitIcon !== 'none') {
    const match = findBestMatch(explicitIcon, providerHint, iconMatchThreshold, options);
    if (match) {
      applyProviderIcon(match, updates);
    }
    return;
  }

  if (!iconEnrichmentAllowed) {
    applyLucideFallback(node, hint.lucideFallback, updates);
    return;
  }

  if (hint.iconQuery && shouldUseClassifierIconQuery(hint.iconQuery, options)) {
    const match = findBestMatch(hint.iconQuery, providerHint, iconMatchThreshold, options);
    if (match) {
      applyProviderIcon(match, updates);
      return;
    }
  }

  if (label && !node.data?.icon && shouldUseLabelFallback(label, options)) {
    const match = findBestMatch(label, providerHint, iconMatchThreshold, options);
    if (match) {
      applyProviderIcon(match, updates);
    }
  }

  // Lucide icon fallback — only in non-import mode, or for structural node types
  if (!options.mode || options.mode !== 'mermaid-import') {
    applyLucideFallback(node, hint.lucideFallback, updates);
  }
}

function getIconEnrichmentPolicy(options: EnrichNodesWithIconsOptions): {
  iconMatchThreshold: number;
  iconEnrichmentAllowed: boolean;
} {
  const strictImportMode = options.mode === 'mermaid-import';
  const iconMatchThreshold = strictImportMode
    ? IMPORT_ICON_MATCH_THRESHOLD
    : DEFAULT_ICON_MATCH_THRESHOLD;
  const iconEnrichmentAllowed =
    !strictImportMode
    || !options.diagramType
    || !DIAGRAM_TYPES_WITHOUT_IMPORT_ICON_ENRICHMENT.has(options.diagramType);

  return {
    iconMatchThreshold,
    iconEnrichmentAllowed,
  };
}

function applyLucideFallback(
  node: FlowNode,
  lucideFallback: string,
  updates: Record<string, unknown>
): void {
  if (lucideFallback && lucideFallback !== 'box') {
    updates.icon = lucideFallback;
  } else if (node.type === 'start') {
    updates.icon = 'play';
  } else if (node.type === 'end') {
    updates.icon = 'check-circle';
  } else if (node.type === 'decision') {
    updates.icon = 'help-circle';
  }
}

function shouldUseClassifierIconQuery(
  iconQuery: string,
  options: EnrichNodesWithIconsOptions
): boolean {
  if (options.mode !== 'mermaid-import') {
    return !isCommonEnglishIconTerm(iconQuery);
  }

  if (options.diagramType === 'flowchart') {
    return isSpecificTechnologyIconQuery(iconQuery);
  }

  return !isCommonEnglishIconTerm(iconQuery);
}

function shouldUseLabelFallback(
  label: string,
  options: EnrichNodesWithIconsOptions
): boolean {
  if (options.mode === 'mermaid-import') {
    return false;
  }

  return !isCommonEnglishIconTerm(label);
}

function findBestMatch(
  query: string,
  providerHint?: string,
  threshold = DEFAULT_ICON_MATCH_THRESHOLD,
  options: EnrichNodesWithIconsOptions = {}
): IconMatch | undefined {
  const matches = matchIcon(query, providerHint);
  const best = matches[0];
  if (!best || best.score < threshold) {
    return undefined;
  }

  if (options.mode === 'mermaid-import' && !isTrustedImportMatch(best, query)) {
    return undefined;
  }

  return best;
}
