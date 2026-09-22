// One definition of what an `openflow` example block is, shared by the build
// script (which compiles them) and the remark plugin (which places the
// rendered SVG beside the source). Two implementations would drift.
import { createHash } from 'node:crypto';

export const EXAMPLE_LANG = 'openflow';

/** Content-addressed name for a block: same DSL, same files, no churn in git. */
export function hashExample(source) {
  return createHash('sha1').update(source.trim()).digest('hex').slice(0, 12);
}

/**
 * Every fenced ```` ```openflow ```` block in a markdown document, with the
 * 1-based line number of its first content line so a compile failure can name
 * the line in the file rather than the line in the block.
 */
export function findExamples(markdown) {
  const lines = markdown.split(/\r?\n/);
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^```openflow\s*$/.test(lines[index])) continue;
    let end = -1;
    for (let scan = index + 1; scan < lines.length; scan += 1) {
      if (/^```\s*$/.test(lines[scan])) {
        end = scan;
        break;
      }
    }
    if (end === -1) throw new Error(`Unclosed \`\`\`openflow block opened at line ${index + 1}`);
    found.push({ source: lines.slice(index + 1, end).join('\n'), contentLine: index + 2 });
    index = end;
  }
  return found;
}
