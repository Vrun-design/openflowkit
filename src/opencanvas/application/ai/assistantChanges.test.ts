import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createEmptyV2Document, createEmptyV2Page } from '../../presentation/v2/v2Document';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import { buildDslPageCommand } from '../dsl/dslPageCommand';
import { chainAssistantChanges } from './assistantChanges';

const pageAfter = (page: ScenePage, changes: ReturnType<typeof chainAssistantChanges>, skip: ReadonlySet<string> = new Set()): ScenePage => {
  let document: SceneDocumentV1 = { ...createEmptyV2Document('doc'), pages: [page] };
  for (const { id, command } of changes) if (!skip.has(id)) document = applyDocumentCommand(document, command).document;
  return document.pages[0]!;
};
const frames = (page: ScenePage) => page.nodes.filter((node) => node.kind === 'frame');

describe('assistant change chain', () => {
  it('adds two diagrams side by side, never on top of each other', async () => {
    const page = createEmptyV2Page();
    const changes = chainAssistantChanges(page, [
      { id: 'one', compiled: await compile('flowchart\nA -> B') },
      { id: 'two', compiled: await compile('flowchart\nC -> D') },
    ]);
    expect(changes.map(({ command }) => command.label)).toEqual(['Add flowchart diagram', 'Add flowchart diagram']);
    const [first, second] = frames(pageAfter(page, changes));
    expect(second!.transform.translation.x).toBeGreaterThan(first!.transform.translation.x + first!.size.width);
  });

  it('replaces a diagram in place, keeping its id and position', async () => {
    const seed = await compile('flowchart\nA -> B', { origin: { x: 400, y: 300 } });
    const page = (buildDslPageCommand(createEmptyV2Page(), seed) as { after: ScenePage }).after;
    const changes = chainAssistantChanges(page, [{ id: 'edit', compiled: await compile('flowchart\nA -> B\nB -> C'), frameId: seed.frame.id }]);
    expect(changes[0]!.command.label).toBe('Update diagram');
    const [frame] = frames(pageAfter(page, changes));
    expect(frame!.id).toBe(seed.frame.id);
    expect(frame!.transform.translation).toEqual({ x: 400, y: 300 });
  });

  it('rebuilds the chain around a rejected row', async () => {
    const page = createEmptyV2Page();
    const drafts = [
      { id: 'one', compiled: await compile('flowchart\nA -> B') },
      { id: 'two', compiled: await compile('flowchart\nC -> D') },
    ];
    const rejected = new Set(['one']);
    const after = pageAfter(page, chainAssistantChanges(page, drafts, rejected), rejected);
    expect(frames(after)).toHaveLength(1);
    expect(after.nodes.some((node) => node.id === 'c')).toBe(true);
  });

  it('treats an unknown frame id as a new diagram and drops no-op rows', async () => {
    const seed = await compile('flowchart\nA -> B');
    const page = (buildDslPageCommand(createEmptyV2Page(), seed) as { after: ScenePage }).after;
    const same = { ...seed, frame: { ...seed.frame, transform: page.nodes.find((node) => node.id === seed.frame.id)!.transform } };
    expect(chainAssistantChanges(page, [{ id: 'noop', compiled: same, frameId: seed.frame.id }])).toEqual([]);
    const added = chainAssistantChanges(page, [{ id: 'ghost', compiled: await compile('flowchart\nX -> Y'), frameId: 'gone' }]);
    expect(added[0]!.command.label).toBe('Add flowchart diagram');
  });
});
