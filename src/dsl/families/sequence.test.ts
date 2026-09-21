import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { format, serialize } from '../serialize';

describe('sequence family', () => {
  it('lays participants out left to right and messages down the timeline', async () => {
    const result = await compile('sequence\nparticipant Alice\nBob\nAlice -> Bob : hi\nBob -->> Alice : there');
    const alice = result.nodes.find((node) => node.id === 'alice')!;
    const bob = result.nodes.find((node) => node.id === 'bob')!;
    expect(alice.kind).toBe('sequence_participant');
    expect(bob.transform.translation.x).toBeGreaterThan(alice.transform.translation.x);
    expect(bob.transform.translation.y).toBe(alice.transform.translation.y);
    const [first, second] = result.connectors;
    expect(first?.semantics).toMatchObject({ seqMessageKind: 'sync', seqMessageOrder: 0 });
    expect(second?.semantics).toMatchObject({ seqMessageKind: 'return', seqMessageOrder: 1 });
    expect(alice.size.height).toBeGreaterThan(200);
  });

  it('marks actors and keeps their header aligned with participants', async () => {
    const result = await compile('sequence\nparticipant Browser [actor]\nAPI\nBrowser -> API : x');
    const browser = result.nodes.find((node) => node.id === 'browser')!;
    const api = result.nodes.find((node) => node.id === 'api')!;
    expect(browser.content.seqParticipantKind).toBe('actor');
    // Actors sit 40px higher so both header bottoms line up (renderer contract).
    expect(browser.transform.translation.y).toBe(0);
    expect(api.transform.translation.y).toBe(40);
  });

  it('records activations against the message order', async () => {
    const result = await compile('sequence\nA -> B : one\nactivate B\nB -> B : two\ndeactivate B');
    const bob = result.nodes.find((node) => node.id === 'b')!;
    expect(bob.content.seqActivations).toEqual([{ order: 1, activate: true }, { order: 2, activate: false }]);
  });

  it('nests fragments and keeps branch order', async () => {
    const result = await compile('sequence\nA -> B : pay\nalt ok {\nA -> B : charge\n} else no {\nopt retry {\nA -> B : again\n}\n}');
    const fragments = result.nodes.filter((node) => node.kind === 'annotation');
    expect(fragments.map((node) => node.content.label)).toEqual(['ALT', 'ELSE', 'OPT']);
    expect(fragments.map((node) => (node.metadata.dsl as { seqFragmentBranch?: number }).seqFragmentBranch)).toEqual([0, 1, 0]);
    // The opt sits inside the else branch, so it is parented to it.
    expect((fragments[2]?.metadata.dsl as { seqFragmentParent?: string }).seqFragmentParent).toBe(fragments[1]?.id);
    expect((fragments[1]?.metadata.dsl as { seqFragmentParent?: string }).seqFragmentParent).toBeNull();
    const text = serialize(result);
    expect(text).toContain('} else no {');
    expect(text).toContain('  opt retry {');
    expect(await format(text)).toBe(text);
  });

  it('places notes relative to their targets', async () => {
    const result = await compile('sequence\nA\nB\nnote over A, B : shared\nnote right of B : hint\nnote left of A : aside');
    const [over, right, left] = result.nodes.filter((node) => node.kind === 'sequence_note');
    expect(over?.content).toMatchObject({ seqNotePosition: 'over', seqNoteTargets: ['a', 'b'] });
    expect(right?.transform.translation.x).toBeGreaterThan(0);
    expect(left).toBeDefined();
  });

  it('warns about unknown participants and malformed statements', async () => {
    const result = await compile('sequence\nactivate Ghost\nelse x {\nloop every 5s {\nA -> B : ok');
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).toContain('W150');
    expect(codes).toContain('W101');
    expect(codes).toContain('W103');
    expect(result.connectors).toHaveLength(1);
  });

  it('treats a bare word as a participant and rejects broken messages', async () => {
    const declared = await compile('sequence\nAlpha\nBeta');
    expect(declared.nodes.map((node) => node.id)).toEqual(['alpha', 'beta']);
    const broken = await compile('sequence\nAlpha -> : no receiver');
    expect(broken.diagnostics.map((item) => item.code)).toContain('W101');
  });
});
