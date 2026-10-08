// Offset arithmetic shared by the language scanners: which line an offset is on, what comes next.

/** Largest index in `sorted` whose value is <= `offset`, or -1. */
export function floor(sorted: readonly number[], offset: number): number {
  let lo = -1;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (sorted[mid]! <= offset) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/** Offsets of each line start, so `floor(starts, offset) + 1` is the 1-based line. */
export function lineStarts(code: string): number[] {
  const starts = [0];
  for (let i = code.indexOf('\n'); i >= 0; i = code.indexOf('\n', i + 1)) starts.push(i + 1);
  return starts;
}

/** Offsets of every `char`; with `floor` this finds "the next one after here" in O(log n), so a thousand
 * unclosed `(` cannot each rescan the file. */
export function positionsOf(code: string, char: string): number[] {
  const found: number[] = [];
  for (let i = code.indexOf(char); i >= 0; i = code.indexOf(char, i + 1)) found.push(i);
  return found;
}

/** The first of `sorted` at or after `offset`, or -1. */
export function nextAt(sorted: readonly number[], offset: number): number {
  const i = floor(sorted, offset - 1) + 1;
  return i < sorted.length ? sorted[i]! : -1;
}

/** A statement as written: whitespace collapsed, capped. */
export function statementText(code: string, start: number, end: number): string {
  // Cut before collapsing: a megabyte-long statement must not be copied once per name in it.
  return code.slice(start, Math.min(end, start + 400)).replace(/\s+/g, ' ').trim().slice(0, 160);
}
