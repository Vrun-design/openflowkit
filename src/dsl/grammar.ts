// Text helpers over the canonical grammar (src/dsl/grammar.md): the two
// views non-readers need — one family's section, and the cheat-sheet appendix
// agents and prompts are written against.

const isHeading = (line: string | undefined, level: 2 | 3): boolean =>
  new RegExp(`^#{${level}}\\s`).test(line ?? '');

/**
 * The section that documents a family: the `##` section when its heading names
 * it, else the `###` subsection. Matching only headings keeps prose mentions
 * ("unlike sequence…") from pulling sections in.
 */
export function grammarSection(grammar: string, family?: string): string {
  if (!family) return grammar;
  const needle = family.trim().toLowerCase();
  const lines = grammar.split('\n');
  const headingAt = (level: 2 | 3): number =>
    lines.findIndex((line) => isHeading(line, level) && line.toLowerCase().includes(needle));
  const sliceFrom = (start: number): string => {
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => isHeading(line, 2) || isHeading(line, 3));
    return lines.slice(start, end < 0 ? lines.length : start + 1 + end).join('\n').trimEnd();
  };
  const section = headingAt(2);
  if (section >= 0) return sliceFrom(section);
  const subsection = headingAt(3);
  return subsection >= 0 ? sliceFrom(subsection) : grammar;
}

/** The fenced cheat-sheet appendix, without the fence. Empty when absent. */
export function grammarAppendix(grammar: string): string {
  const start = grammar.indexOf('## Appendix A');
  if (start < 0) return '';
  const fenced = /```[a-z]*\n([\s\S]*?)```/.exec(grammar.slice(start));
  return fenced?.[1]?.trim() ?? '';
}
