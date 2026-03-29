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

  if (t === q) return 100;
  if (t.startsWith(q)) return 80;

  let qi = 0;
  let score = 0;
  let lastMatchIndex = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t.charCodeAt(ti) === q.charCodeAt(qi)) {
      score += 10;
      if (ti === lastMatchIndex + 1) score += 5;
      if (ti === 0 || t.charCodeAt(ti - 1) === 32) score += 3;
      lastMatchIndex = ti;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}
