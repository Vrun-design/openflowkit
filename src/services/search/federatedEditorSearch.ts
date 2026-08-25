import {
  BUILT_IN_SHAPES,
  createBuiltInShapeLibraryItem,
  type BuiltInShapeDefinition,
} from '@/services/builtInShapeCatalog';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import type { FlowTemplate } from '@/services/templates';
import { scoreSemanticMatch, tokenizeSearchQuery } from './semanticSearch';

const ASSET_CATEGORIES: readonly DomainLibraryCategory[] = [
  'aws',
  'azure',
  'gcp',
  'cncf',
  'developer',
  'icons',
];
const MAX_RESULTS_PER_KIND = 6;

export type FederatedCatalogResult =
  | {
      readonly id: string;
      readonly kind: 'template';
      readonly label: string;
      readonly description: string;
      readonly keywords: readonly string[];
      readonly score: number;
      readonly template: FlowTemplate;
    }
  | {
      readonly id: string;
      readonly kind: 'shape' | 'icon';
      readonly label: string;
      readonly description: string;
      readonly keywords: readonly string[];
      readonly score: number;
      readonly item: DomainLibraryItem;
    };

interface FederatedSearchDependencies {
  readonly loadTemplates?: () => Promise<readonly FlowTemplate[]>;
  readonly loadAssets?: () => Promise<readonly DomainLibraryItem[]>;
  readonly shapes?: readonly BuiltInShapeDefinition[];
}

interface FederatedSearchOptions {
  readonly includeAssets: boolean;
  readonly includeTemplates: boolean;
}

function compareResults(left: FederatedCatalogResult, right: FederatedCatalogResult): number {
  return right.score - left.score || left.label.localeCompare(right.label);
}

function limitByKind(results: readonly FederatedCatalogResult[]): FederatedCatalogResult[] {
  const counts: Record<FederatedCatalogResult['kind'], number> = {
    shape: 0,
    icon: 0,
    template: 0,
  };

  return results.filter((result) => {
    if (counts[result.kind] >= MAX_RESULTS_PER_KIND) {
      return false;
    }
    counts[result.kind] += 1;
    return true;
  });
}

async function loadDefaultTemplates(): Promise<readonly FlowTemplate[]> {
  const { getFlowTemplates } = await import('@/services/templates');
  return getFlowTemplates();
}

async function loadDefaultAssets(): Promise<readonly DomainLibraryItem[]> {
  const { loadDomainAssetCatalog } = await import('@/services/assetCatalog');
  const catalogs = await Promise.all(
    ASSET_CATEGORIES.map((category) => loadDomainAssetCatalog(category))
  );
  const uniqueItems = new Map<string, DomainLibraryItem>();
  for (const item of catalogs.flat()) {
    uniqueItems.set(`${item.category}:${item.id}`, item);
  }
  return [...uniqueItems.values()];
}

function searchTemplates(
  templates: readonly FlowTemplate[],
  terms: readonly string[]
): FederatedCatalogResult[] {
  return templates.flatMap((template) => {
    const keywords = [
      template.category,
      template.useCase,
      template.outcome,
      ...template.tags,
      ...template.replacementHints,
    ];
    const score = scoreSemanticMatch([template.name, template.description, ...keywords], terms);
    return score === null
      ? []
      : [
          {
            id: `template:${template.id}`,
            kind: 'template' as const,
            label: template.name,
            description: template.description,
            keywords,
            score,
            template,
          },
        ];
  });
}

function searchAssets(
  assets: readonly DomainLibraryItem[],
  shapes: readonly BuiltInShapeDefinition[],
  terms: readonly string[]
): FederatedCatalogResult[] {
  const shapeResults = shapes.flatMap((shape) => {
    const score = scoreSemanticMatch([shape.label, shape.description, ...shape.keywords], terms);
    return score === null
      ? []
      : [
          {
            id: `shape:${shape.value}`,
            kind: 'shape' as const,
            label: shape.label,
            description: shape.description,
            keywords: shape.keywords,
            score,
            item: createBuiltInShapeLibraryItem(shape),
          },
        ];
  });
  const iconResults = assets.flatMap((item) => {
    const keywords = [item.category, item.providerShapeCategory ?? '', item.icon];
    const score = scoreSemanticMatch([item.label, item.description, ...keywords], terms);
    return score === null
      ? []
      : [
          {
            id: `icon:${item.category}:${item.id}`,
            kind: 'icon' as const,
            label: item.label,
            description: item.description,
            keywords,
            score,
            item,
          },
        ];
  });

  return [...shapeResults, ...iconResults];
}

export async function searchFederatedEditorCatalogs(
  query: string,
  options: FederatedSearchOptions,
  dependencies: FederatedSearchDependencies = {}
): Promise<FederatedCatalogResult[]> {
  const terms = tokenizeSearchQuery(query);
  if (terms.length === 0) {
    return [];
  }

  const [templates, assets] = await Promise.all([
    options.includeTemplates
      ? (dependencies.loadTemplates ?? loadDefaultTemplates)()
      : Promise.resolve([]),
    options.includeAssets ? (dependencies.loadAssets ?? loadDefaultAssets)() : Promise.resolve([]),
  ]);
  const results = [
    ...searchTemplates(templates, terms),
    ...searchAssets(assets, dependencies.shapes ?? BUILT_IN_SHAPES, terms),
  ].sort(compareResults);

  return limitByKind(results);
}
