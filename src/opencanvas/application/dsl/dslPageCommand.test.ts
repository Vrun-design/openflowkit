import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import { createEmptyV2Page } from '../../presentation/v2/v2Document';
import { frameEdited, frameScene } from '../../../dsl/frameScene';
import { buildDslPageCommand, nameUntitledDocument, nextDslFrameOrigin } from './dslPageCommand';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';

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

describe('DSL page command: two diagrams on one page', () => {
  type SetPage = Extract<ReturnType<typeof buildDslPageCommand>, { kind: 'set-page' }>;
  it('scopes names the page already uses, and the frame still reads as untouched', async () => {
    const first = buildDslPageCommand(createEmptyV2Page(), await compile('flowchart\nStart -> End')) as SetPage;
    const secondCompiled = await compile('flowchart\nStart -> Middle -> End');
    const second = buildDslPageCommand(first.after, secondCompiled) as SetPage;
    const ids = [...second.after.nodes, ...second.after.connectors].map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(`${secondCompiled.frame.id}-start`);
    expect(frameEdited(frameScene(second.after, secondCompiled.frame.id)!)).toBe(false);
  });

  it('gives a repeated diagram its own frame', async () => {
    const compiled = await compile('flowchart\nA -> B');
    const first = buildDslPageCommand(createEmptyV2Page(), compiled) as SetPage;
    const second = buildDslPageCommand(first.after, compiled) as SetPage;
    expect(second.after.nodes.filter((node) => node.kind === 'frame').map(({ id }) => id))
      .toEqual([compiled.frame.id, `${compiled.frame.id}-2`]);
  });

  it('names an untitled document after its first diagram, in the same undo step', async () => {
    const compiled = await compile('flowchart\ntitle: Checkout flow\nA -> B');
    const document = createEmptyV2Document('doc-1');
    const command = buildDslPageCommand(document.pages[0]!, compiled)!;
    expect(nameUntitledDocument(document, command, compiled.meta.title)).toMatchObject({
      kind: 'batch', commands: [command, { kind: 'set-document-name', before: 'Untitled diagram', after: 'Checkout flow' }],
    });
  });

  it('keeps a name someone chose, and a diagram without a title changes nothing', async () => {
    const compiled = await compile('flowchart\ntitle: Checkout flow\nA -> B');
    const named = { ...createEmptyV2Document('doc-1'), name: 'Payments' };
    const command = buildDslPageCommand(named.pages[0]!, compiled)!;
    expect(nameUntitledDocument(named, command, compiled.meta.title)).toBe(command);
    expect(nameUntitledDocument(createEmptyV2Document('doc-2'), command, undefined)).toBe(command);
    expect(nameUntitledDocument(createEmptyV2Document('doc-3'), command, '   ')).toBe(command);
  });
});
