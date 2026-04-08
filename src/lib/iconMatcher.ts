import { SVG_SOURCES } from '@/services/shapeLibrary/providerCatalog';

export interface IconMatch {
  packId: string;
  shapeId: string;
  label: string;
  provider: string;
  category: string;
  score: number;
  matchType: 'exact' | 'alias' | 'substring' | 'category';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  runnerUpDelta: number;
  wholeTokenMatch: boolean;
  isVariant: boolean;
  isGeneric: boolean;
}

const ALIASES: Record<string, string> = {
  postgres: 'postgresql',
  pg: 'postgresql',
  pgsql: 'postgresql',
  mongo: 'mongodb',
  mdb: 'mongodb',
  es: 'elasticsearch',
  elastic: 'elasticsearch',
  k8s: 'kubernetes',
  tf: 'terraform',
  hcl: 'terraform',
  golang: 'go',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  njs: 'nodejs',
  node: 'nodejs',
  react: 'frontend-reactjs',
  'react.js': 'react',
  'vue.js': 'vue',
  next: 'nextjs',
  'nuxt.js': 'nuxt',
  mq: 'rabbitmq',
  apachekafka: 'kafka',
  csharp: 'c#',
  dotnet: '.net',
  gke: 'google-kubernetes-engine',
  aks: 'azure-kubernetes-service',
  eks: 'amazon-elastic-kubernetes-service',
  rds: 'amazon-rds',
  sqs: 'app-integration-simple-queue-service',
  sns: 'app-integration-simple-notification-service',
  s3: 'storage-simple-storage-service',
  'amazon-s3': 'storage-simple-storage-service',
  lambda: 'compute-lambda',
  'aws-lambda': 'compute-lambda',
  cf: 'cloudflare',
  kib: 'kibana',
  logstash: 'elastic-logstash',
  beat: 'elastic-beats',
};

const VARIANT_TOKENS = new Set(['wordmark', 'light', 'dark', 'logo', 'mark', 'filled', 'outline']);
const GENERIC_ENTRY_TOKENS = new Set([
  'api',
  'app',
  'apps',
  'auth',
  'backend',
  'browser',
  'cache',
  'cdn',
  'client',
  'cloud',
  'compute',
  'container',
  'containers',
  'database',
  'databases',
  'delivery',
  'end',
  'frontend',
  'gateway',
  'identity',
  'integration',
  'mobile',
  'network',
  'networking',
  'process',
  'project',
  'projects',
  'proxy',
  'queue',
  'security',
  'server',
  'service',
  'services',
  'simple',
  'storage',
  'system',
  'tool',
  'tools',
  'user',
  'users',
  'web',
  'worker',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s._]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function tokenizeNormalized(text: string): string[] {
  return normalize(text)
    .split('-')
    .filter(Boolean);
}

function hasTokenSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || haystack.length < needle.length) {
    return false;
  }

  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let index = 0; index < needle.length; index += 1) {
      if (haystack[start + index] !== needle[index]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }

  return false;
}

function tokensRoughlyMatch(queryToken: string, entryToken: string): boolean {
  if (queryToken === entryToken) {
    return true;
  }

  if (queryToken.length < 4 || entryToken.length < 4) {
    return false;
  }

  return entryToken.startsWith(queryToken) || queryToken.startsWith(entryToken);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(0.99, value));
}

function toConfidence(score: number): IconMatch['confidence'] {
  if (score >= 0.9) {
    return 'high';
  }
  if (score >= 0.75) {
    return 'medium';
  }
  return 'low';
}

function compareMatches(left: IconMatch, right: IconMatch): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if (left.isGeneric !== right.isGeneric) {
    return Number(left.isGeneric) - Number(right.isGeneric);
  }
  if (left.isVariant !== right.isVariant) {
    return Number(left.isVariant) - Number(right.isVariant);
  }
  if (left.wholeTokenMatch !== right.wholeTokenMatch) {
    return Number(right.wholeTokenMatch) - Number(left.wholeTokenMatch);
  }
  return left.label.localeCompare(right.label);
}

function getRunnerUpDelta(matches: IconMatch[], index: number): number {
  const nextScore = matches[index + 1]?.score ?? 0;
  return Math.max(0, matches[index].score - nextScore);
}

function entries(): IconEntry[] {
  return SVG_SOURCES.map((s) => {
    const parts = s.shapeId.split('/');
    const lastPathPart = parts[parts.length - 1];
    const lastHyphenPart = lastPathPart.split('-').pop() ?? lastPathPart;
    const normalizedName = normalize(s.shapeId);
    const normalizedLabel = normalize(s.label);
    const nameTokens = tokenizeNormalized(s.shapeId);
    const labelTokens = tokenizeNormalized(s.label);
    const lastSegmentTokens = tokenizeNormalized(lastHyphenPart);
    const meaningfulTokens = lastSegmentTokens.filter((token) => !VARIANT_TOKENS.has(token));
    return {
      packId: s.packId,
      shapeId: s.shapeId,
      label: s.label,
      provider: s.provider,
      category: s.category,
      normalizedName,
      normalizedLabel,
      normalizedLastSegment: normalize(lastHyphenPart),
      nameTokens,
      labelTokens,
      lastSegmentTokens,
      isVariant: lastSegmentTokens.some((token) => VARIANT_TOKENS.has(token)),
      isGeneric:
        meaningfulTokens.length > 0
        && meaningfulTokens.every((token) => GENERIC_ENTRY_TOKENS.has(token)),
    };
  });
}

interface IconEntry {
  packId: string;
  shapeId: string;
  label: string;
  provider: string;
  category: string;
  normalizedName: string;
  normalizedLabel: string;
  normalizedLastSegment: string;
  nameTokens: string[];
  labelTokens: string[];
  lastSegmentTokens: string[];
  isVariant: boolean;
  isGeneric: boolean;
}

let cachedEntries: IconEntry[] | null = null;
function getEntries(): IconEntry[] {
  if (!cachedEntries) cachedEntries = entries();
  return cachedEntries;
}

let cachedByNormalized: Map<string, IconEntry> | null = null;
function getByNormalized(): Map<string, IconEntry> {
  if (!cachedByNormalized) {
    cachedByNormalized = new Map();
    for (const entry of getEntries()) {
      cachedByNormalized.set(entry.normalizedName, entry);
      if (entry.normalizedLastSegment !== entry.normalizedName) {
        cachedByNormalized.set(entry.normalizedLastSegment, entry);
      }
    }
  }
  return cachedByNormalized;
}

export function matchIcon(query: string, providerHint?: string): IconMatch[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const queryTokens = tokenizeNormalized(query);

  const byNormalized = getByNormalized();
  const all = getEntries();

  // 1. Exact match on shape ID or human label
  const exact = byNormalized.get(normalizedQuery);
  if (exact && (!providerHint || exact.provider === providerHint)) {
    return finalizeMatches([toMatch(exact, 0.99, 'exact', 'exact shape or segment match', true)]);
  }

  const exactLabel = all.find((entry) => {
    if (providerHint && entry.provider !== providerHint) {
      return false;
    }
    return (
      entry.normalizedLabel === normalizedQuery || entry.normalizedLastSegment === normalizedQuery
    );
  });
  if (exactLabel) {
    return finalizeMatches([toMatch(exactLabel, 0.98, 'exact', 'exact icon label match', true)]);
  }

  // 2. Alias resolution
  const aliasTarget = ALIASES[normalizedQuery];
  if (aliasTarget) {
    const aliasEntry = byNormalized.get(normalize(aliasTarget));
    if (aliasEntry && (!providerHint || aliasEntry.provider === providerHint)) {
      return finalizeMatches([toMatch(aliasEntry, 0.97, 'alias', 'known technology alias', true)]);
    }
  }

  // 3. Weighted token and label matching
  const substringMatches: IconMatch[] = [];
  for (const entry of all) {
    if (providerHint && entry.provider !== providerHint) continue;
    if (
      entry.normalizedLastSegment.length < 3
      || normalizedQuery.length < 3
      || queryTokens.length === 0
    ) {
      continue;
    }

    const tokenHits = queryTokens.filter(
      (token) =>
        entry.nameTokens.some((entryToken) => tokensRoughlyMatch(token, entryToken))
        || entry.labelTokens.some((entryToken) => tokensRoughlyMatch(token, entryToken))
        || entry.lastSegmentTokens.some((entryToken) => tokensRoughlyMatch(token, entryToken))
    );
    const wholeTokenMatch = tokenHits.length === queryTokens.length;
    const hasPartialMatch =
      entry.normalizedName.includes(normalizedQuery)
      || entry.normalizedLabel.includes(normalizedQuery)
      || entry.normalizedLastSegment.includes(normalizedQuery)
      || normalizedQuery.includes(entry.normalizedLastSegment);

    if (!wholeTokenMatch && !hasPartialMatch) {
      continue;
    }

    const exactLastSegment = entry.normalizedLastSegment === normalizedQuery;
    const exactLabelMatch = entry.normalizedLabel === normalizedQuery;
    const nameSequenceMatch = hasTokenSequence(entry.nameTokens, queryTokens);
    const labelSequenceMatch = hasTokenSequence(entry.labelTokens, queryTokens);
    const overlapRatio = tokenHits.length / queryTokens.length;
    let score =
      0.42
      + overlapRatio * 0.28
      + (exactLastSegment ? 0.14 : 0)
      + (exactLabelMatch ? 0.12 : 0)
      + (wholeTokenMatch ? 0.08 : 0)
      + (nameSequenceMatch || labelSequenceMatch ? 0.06 : 0)
      + (providerHint && entry.provider === providerHint ? 0.04 : 0)
      - (entry.isVariant ? 0.18 : 0)
      - (entry.isGeneric ? 0.16 : 0);

    if (!wholeTokenMatch && hasPartialMatch) {
      score -= 0.08;
    }

    score = clampScore(score);
    const reason = exactLastSegment
      ? 'exact canonical icon segment'
      : exactLabelMatch
        ? 'exact icon label match'
        : wholeTokenMatch
          ? 'all query tokens align to icon tokens'
          : 'partial token overlap';

    substringMatches.push(toMatch(entry, score, 'substring', reason, wholeTokenMatch));
  }
  if (substringMatches.length > 0) {
    return finalizeMatches(substringMatches);
  }

  // 4. Category match
  const normalizedCategory = normalizedQuery.replace(/-/g, '');
  const categoryMatches: IconMatch[] = [];
  for (const entry of all) {
    if (providerHint && entry.provider !== providerHint) continue;
    if (normalize(entry.category).replace(/-/g, '').includes(normalizedCategory)) {
      categoryMatches.push(
        toMatch(
          entry,
          clampScore(0.54 - (entry.isVariant ? 0.08 : 0) - (entry.isGeneric ? 0.1 : 0)),
          'category',
          'category-only fallback',
          false
        )
      );
    }
  }
  if (categoryMatches.length > 0) {
    return finalizeMatches(categoryMatches);
  }

  return [];
}

function finalizeMatches(matches: IconMatch[]): IconMatch[] {
  const sorted = [...matches].sort(compareMatches);

  return sorted.slice(0, 5).map((match, index, topMatches) => ({
    ...match,
    confidence: toConfidence(match.score),
    runnerUpDelta: getRunnerUpDelta(topMatches, index),
  }));
}

function toMatch(
  entry: IconEntry,
  score: number,
  matchType: IconMatch['matchType'],
  reason: string,
  wholeTokenMatch: boolean
): IconMatch {
  return {
    packId: entry.packId,
    shapeId: entry.shapeId,
    label: entry.label,
    provider: entry.provider,
    category: entry.category,
    score,
    matchType,
    confidence: toConfidence(score),
    reason,
    runnerUpDelta: 0,
    wholeTokenMatch,
    isVariant: entry.isVariant,
    isGeneric: entry.isGeneric,
  };
}

export function getMatchableIconCount(): number {
  return getEntries().length;
}

export function listIconProviders(): string[] {
  return [...new Set(getEntries().map((e) => e.provider))].sort();
}

export function buildCatalogSummary(maxPerProvider: number = 30): string {
  const byProvider = new Map<string, IconEntry[]>();
  for (const entry of getEntries()) {
    const list = byProvider.get(entry.provider) ?? [];
    list.push(entry);
    byProvider.set(entry.provider, list);
  }

  const lines: string[] = [];
  for (const [provider, icons] of byProvider) {
    const categories = [...new Set(icons.map((i) => i.category))];
    const sampleNames = icons.slice(0, maxPerProvider).map((i) => i.label);
    lines.push(`${provider}: ${categories.join(', ')} (examples: ${sampleNames.join(', ')})`);
  }

  return lines.join('\n');
}
