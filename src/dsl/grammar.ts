// Text helpers over the canonical grammar (src/dsl/grammar.md): the two
// views non-readers need — one family's section, and the cheat-sheet appendix
// agents and prompts are written against.

const isHeading = (line: string | undefined, level: 2 | 3): boolean =>
  new RegExp(`^#{${level}}\\s`).test(line ?? '');

/**
 * What `get_syntax` serves for one family: the cheat-sheet appendix (everything needed to write any
 * family) plus the section that documents it — the heading whose title starts with the family word
 * (`### 8.2 architecture`, not §4's "Core statements (all graph families: …)"), or for a reserved
 * family the subsection that names it in code (`bpmn` in "8.11 Later families"). Matching titles only
 * keeps prose mentions ("unlike sequence…") from pulling sections in. Unknown → the whole reference.
 */
export function grammarSection(grammar: string, family?: string): string {
  if (!family) return grammar;
  const needle = family.trim().toLowerCase();
  const lines = grammar.split('\n');
  const sliceFrom = (start: number): string => {
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => isHeading(line, 2) || isHeading(line, 3));
    return lines.slice(start, end < 0 ? lines.length : start + 1 + end).join('\n').trimEnd();
  };
  const titled = (level: 2 | 3): number => lines.findIndex((line) => isHeading(line, level)
    && line.replace(/^#+\s+(?:[\d.]+\s+)?/, '').toLowerCase().split(/[^a-z0-9]/)[0] === needle);
  let start = titled(2);
  if (start < 0) start = titled(3);
  if (start < 0) start = lines.findIndex((line, index) => isHeading(line, 3) && sliceFrom(index).includes(`\`${needle}\``));
  if (start < 0) return grammar;
  const cheatSheet = grammarAppendix(grammar);
  return cheatSheet ? `${cheatSheet}\n\n${sliceFrom(start)}` : sliceFrom(start);
}

/** The fenced cheat-sheet appendix, without the fence. Empty when absent. */
export function grammarAppendix(grammar: string): string {
  const start = grammar.indexOf('## Appendix A');
  if (start < 0) return '';
  const fenced = /```[a-z]*\n([\s\S]*?)```/.exec(grammar.slice(start));
  return fenced?.[1]?.trim() ?? '';
}
