/** A link for a `file:line`, or null when the repo has no web home (the line is then plain text). One copy for the SVG viewer and the Model panel. */
export type EvidenceLink = (file: string, line: number) => string | null;

/** Evidence lines grouped by file, in first-seen order, so a file's path is shown once. */
export function groupByFile<T extends { readonly file: string }>(evidence: readonly T[]): [string, T[]][] {
  const byFile = new Map<string, T[]>();
  for (const e of evidence) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
  return [...byFile];
}
