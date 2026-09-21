import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import { createEmptyV2Page } from '../../presentation/v2/v2Document';
import { buildDslPageCommand, nextDslFrameOrigin } from './dslPageCommand';

describe('DSL page command', () => {
  it('inserts generated frame and content as one command', async () => {
    const page = createEmptyV2Page();
    const compiled = await compile('flowchart\nA -> B');
    const command = buildDslPageCommand(page, compiled);
    expect(command).toMatchObject({ kind: 'set-page', before: page, after: { nodes: expect.arrayContaining([expect.objectContaining({ kind: 'frame' })]) } });
  });

  it('replaces a bound frame subtree while retaining its id', async () => {
    const first = await compile('flowchart\nA -> B');
    const initial = buildDslPageCommand(createEmptyV2Page(), first) as Extract<ReturnType<typeof buildDslPageCommand>, { kind: 'set-page' }>;
    const second = await compile('flowchart\nC -> D', { origin: first.frame.transform.translation });
    const replaced = buildDslPageCommand(initial.after, second, first.frame.id) as Extract<ReturnType<typeof buildDslPageCommand>, { kind: 'set-page' }>;
    expect(replaced.after.nodes.filter((node) => node.kind === 'frame')).toHaveLength(1);
    expect(replaced.after.nodes.some((node) => node.id === first.frame.id)).toBe(true);
    expect(replaced.after.nodes.some((node) => node.id === 'a')).toBe(false);
  });

  it('places new diagrams beyond current content bounds', async () => {
    const compiled = await compile('flowchart\nA');
    const command = buildDslPageCommand(createEmptyV2Page(), compiled) as Extract<ReturnType<typeof buildDslPageCommand>, { kind: 'set-page' }>;
    expect(nextDslFrameOrigin(command.after).x).toBeGreaterThan(compiled.frame.size.width);
  });
});
