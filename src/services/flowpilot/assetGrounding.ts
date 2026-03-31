import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadDomainAssetSuggestions } from '@/services/assetCatalog';
import type { AssetGroundingMatch } from './types';

const ALL_GROUNDING_CATEGORIES: DomainLibraryCategory[] = [
  'aws',
  'azure',
  'gcp',
  'cncf',
  'developer',
  'icons',
];

const SERVICE_ALIASES: Array<{ query: string; categories?: DomainLibraryCategory[] }> = [
  { query: 'API Gateway', categories: ['aws'] },
  { query: 'Lambda', categories: ['aws'] },
  { query: 'S3', categories: ['aws'] },
  { query: 'RDS', categories: ['aws'] },
  { query: 'ElastiCache', categories: ['aws'] },
  { query: 'Cognito', categories: ['aws'] },
  { query: 'Azure Functions', categories: ['azure'] },
  { query: 'Azure SQL', categories: ['azure'] },
  { query: 'Storage Account', categories: ['azure'] },
  { query: 'API Management', categories: ['azure'] },
  { query: 'Cloud Run', categories: ['gcp'] },
  { query: 'Cloud SQL', categories: ['gcp'] },
  { query: 'Cloud Storage', categories: ['gcp'] },
  { query: 'Kubernetes', categories: ['cncf'] },
  { query: 'Ingress', categories: ['cncf'] },
  { query: 'Redis' },
  { query: 'Postgres' },
  { query: 'Queue' },
  { query: 'Database' },
];

function scoreMatch(item: DomainLibraryItem, query: string): number {
  const normalizedQuery = query.toLowerCase();
  const label = item.label.toLowerCase();
  const description = item.description.toLowerCase();
  const category = (item.providerShapeCategory || '').toLowerCase();

  if (label === normalizedQuery) {
    return 0.99;
  }

  if (label.includes(normalizedQuery)) {
    return 0.93;
  }

  if (description.includes(normalizedQuery) || category.includes(normalizedQuery)) {
    return 0.82;
  }

  return 0.65;
}

function toGroundingMatch(item: DomainLibraryItem, query: string): AssetGroundingMatch {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
    category: item.category,
    archProvider: item.category,
    archResourceType: item.archResourceType || 'service',
    archIconPackId: item.archIconPackId,
    archIconShapeId: item.archIconShapeId,
    providerShapeCategory: item.providerShapeCategory,
    confidence: scoreMatch(item, query),
    reasoning: item.archIconPackId
      ? `Matched "${query}" to a provider-backed asset in the local ${item.category.toUpperCase()} catalog.`
      : `Matched "${query}" to a reusable local asset.`,
  };
}

function inferQueriesFromPrompt(prompt: string): Array<{ query: string; categories?: DomainLibraryCategory[] }> {
  const matches = SERVICE_ALIASES.filter((entry) => prompt.toLowerCase().includes(entry.query.toLowerCase()));
  if (matches.length > 0) {
    return matches;
  }

  const compactPrompt = prompt.replace(/[^\w\s/-]+/g, ' ');
  const segments = compactPrompt
    .split(/,| with | and | then /i)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 3)
    .slice(0, 6);

  return segments.map((segment) => ({ query: segment }));
}

export async function groundFlowpilotAssets(prompt: string): Promise<AssetGroundingMatch[]> {
  const queries = inferQueriesFromPrompt(prompt);
  const results = new Map<string, AssetGroundingMatch>();

  for (const { query, categories } of queries) {
    const scopes = categories ?? ALL_GROUNDING_CATEGORIES;
    for (const category of scopes) {
      const suggestions = await loadDomainAssetSuggestions(category, {
        query,
        limit: 4,
      });

      for (const item of suggestions) {
        const candidate = toGroundingMatch(item, query);
        const existing = results.get(candidate.id);
        if (!existing || existing.confidence < candidate.confidence) {
          results.set(candidate.id, candidate);
        }
      }
    }
  }

  return [...results.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 8);
}

export function summarizeAssetGrounding(matches: AssetGroundingMatch[]): string {
  if (matches.length === 0) {
    return 'No strong local asset matches were found.';
  }

  return matches
    .slice(0, 5)
    .map((match) => {
      const suffix = match.archIconPackId ? ` (${match.archIconPackId})` : '';
      return `${match.label}${suffix}`;
    })
    .join(', ');
}
