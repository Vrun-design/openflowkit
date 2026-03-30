const EXACT_MATCH_SCORE = 100;
const PREFIX_MATCH_SCORE = 80;
const CHARACTER_MATCH_SCORE = 10;
const CONSECUTIVE_MATCH_BONUS = 5;
const WORD_BOUNDARY_MATCH_BONUS = 3;

/** Returns true if query chars appear in order within target (case-insensitive). */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t.charCodeAt(ti) === q.charCodeAt(qi)) qi++;
  }
  return qi === q.length;
}

/** Returns a score (higher = better match) for ranking fuzzy results. */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return EXACT_MATCH_SCORE;
  if (t.startsWith(q)) return PREFIX_MATCH_SCORE;

  let qi = 0;
  let score = 0;
  let lastMatchIndex = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t.charCodeAt(ti) === q.charCodeAt(qi)) {
      score += CHARACTER_MATCH_SCORE;
      if (ti === lastMatchIndex + 1) score += CONSECUTIVE_MATCH_BONUS;
      if (ti === 0 || t.charCodeAt(ti - 1) === 32) score += WORD_BOUNDARY_MATCH_BONUS;
      lastMatchIndex = ti;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}
