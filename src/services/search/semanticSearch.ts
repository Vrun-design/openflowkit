import { fuzzyMatch, fuzzyScore } from '@/lib/fuzzyMatch';

export function tokenizeSearchQuery(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

export function scoreSemanticMatch(
  values: readonly string[],
  terms: readonly string[]
): number | null {
  if (!terms.every((term) => values.some((value) => fuzzyMatch(term, value)))) {
    return null;
  }

  return terms.reduce(
    (score, term) => score + Math.max(...values.map((value) => fuzzyScore(term, value))),
    0
  );
}
