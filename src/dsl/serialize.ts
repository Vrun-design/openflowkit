import { dslFrameMeta, dslFrameRaw, type DslFrameScene } from './sceneMeta';
import { animateBlockLines, animateFromJson } from './animate';
import type { DslFamily } from './ast';
import { compile } from './compile';
import { familyFor } from './families';
import { commentLines, quote } from './text';
import { dslFamilyDirection } from './vocabulary';

export { quote, slugifyDslId } from './text';
export type { DslFrameScene } from './sceneMeta';

export interface SerializeResult {
  readonly dsl: string;
  /** Constructs the scene holds that the language cannot write back. */
  readonly losses: readonly string[];
}

/**
 * scene → canonical text. The pragma, family line and title are shared; each
 * family writes its own body and the trailing comments close the file.
 */
export function serialize(scene: DslFrameScene): string {
  const frame = scene.frame;
  const meta = dslFrameMeta(frame);
  const raw = dslFrameRaw(frame);
  const direction = meta.direction && meta.direction !== dslFamilyDirection(meta.family) ? meta.direction : undefined;
  const title = typeof frame.content.label === 'string' && frame.content.label.length > 0 ? frame.content.label : meta.title;
  // A family may need words on its header line (the chart kind, for one).
  const header = [meta.family, ...(meta.familyHeader ?? []), ...(direction ? [direction] : [])];
  const lines: string[] = ['%% ofk 1', header.join(' ')];
  if (title) lines.push(`title: ${quote(title)}`);
  const palette = meta.appearance?.palette;
  if (palette && palette !== 'pastel') lines.push(`appearance: ${palette}`);
  lines.push('', ...familyFor(meta.family as DslFamily).serialize(scene));
  // Motion is a projection of the text like everything else: emitted exactly
  // when the frame carries a block, for every family, and never invented.
  const animate = animateFromJson(raw.animate);
  if (animate) {
    if (lines.at(-1) !== '') lines.push('');
    lines.push(...animateBlockLines(animate));
  }
  if (Array.isArray(raw.comments)) lines.push(...commentLines(raw.comments.filter((item): item is string => typeof item === 'string'), ''));
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

export async function format(text: string): Promise<string> {
  return serialize(await compile(text));
}
