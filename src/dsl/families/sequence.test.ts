import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { resolveConnectorPresentation } from '../../opencanvas/domain/connectors/presentation';
import { connectorLabelPlate, resolveConnectorLabelStyle } from '../../opencanvas/domain/connectors/labelStyle';
import { format, serialize } from '../serialize';

describe('sequence family', () => {
  it('`id = Label` names exactly that participant, as sender, receiver or note target', async () => {
    const result = await compile('sequence\nparticipant b = a\nparticipant a = Z\na -> b = a : hi\nnote over b = a : here');
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(result.connectors.map((connector) => `${connector.source.nodeId}->${connector.target.nodeId}`)).toEqual(['a->b']);
  });

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

  it('draws a message with `[head: cross]` ending in a cross, solid or dashed, and keeps it on a round trip', async () => {
    const text = '%% ofk 1\nsequence\n\nA -> B : lost [head: cross]\nB --> A : lost reply [head: cross]\nA -> B : plain\n';
    const result = await compile(text);
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const [solid, dashed, plain] = result.connectors.map(resolveConnectorPresentation);
    expect(solid).toMatchObject({ targetMarkers: ['cross'], stroke: { dash: [] } });
    expect(dashed!.targetMarkers).toEqual(['cross']);
    expect(dashed!.stroke.dash.length).toBeGreaterThan(0);
    expect(plain!.targetMarkers).toEqual(['triangle-filled']);
    expect(serialize(result)).toBe(text);
    expect(await format(text)).toBe(text);
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

  // The owner's report, 2026-10-07: two notes sat on top of each other and on the loop below them.
  it('gives every note its own room on the timeline, inside the block it was written in', async () => {
    const result = await compile('sequence\nA -> B : one\nnote right of B : first\nnote over A, B : second\nA -> B : two\nloop again {\n  note over A : inside\n  A -> B : three\n}');
    const notes = result.nodes.filter((node) => node.kind === 'sequence_note');
    const loop = result.nodes.find((node) => node.kind === 'annotation')!;
    // Frame-relative message y: header 48 + actor room 40 + offset 20, then 52 px a row.
    const messageY = result.connectors.map((connector) => 108 + 52 * Number(connector.semantics.seqMessageRow ?? connector.semantics.seqMessageOrder));
    const spans = notes.map((note) => [note.transform.translation.y, note.transform.translation.y + note.size.height] as const);
    for (const [top, bottom] of spans) for (const y of messageY) expect(y > top && y < bottom).toBe(false);
    for (const [index, [top, bottom]] of spans.entries()) {
      for (const [otherTop, otherBottom] of spans.slice(index + 1)) expect(top < otherBottom && otherTop < bottom).toBe(false);
    }
    // `inside` was written in the loop: the loop's band starts above it; `second` was written before it.
    expect(loop.transform.translation.y).toBeLessThan(spans[2]![0]);
    expect(loop.transform.translation.y).toBeGreaterThanOrEqual(spans[1]![1]);
    // Orders stay message indices, so the text round-trips; only rows move.
    expect(result.connectors.map((connector) => connector.semantics.seqMessageOrder)).toEqual([0, 1, 2]);
    expect(await format(serialize(result))).toBe(serialize(result));
  });

  // Found 2026-10-07: the home "Request lifecycle" starter wrote Mermaid's `alt x … else y … end`;
  // with no warning, `end` and the words after a `{` in a label became three participants.
  it('warns on a Mermaid-style block instead of reading its words as participants', async () => {
    const result = await compile('sequence\nparticipant A\nparticipant B\nalt ok\n  A -> B : yes\nelse no\n  A -> B : nope\nend');
    expect(result.diagnostics.filter((item) => item.severity === 'warning').map((item) => item.message)).toEqual([
      'alt needs a { … } block', 'else needs a { … } block', '`end` closes nothing: a block closes with }',
    ]);
    expect(result.nodes.filter((node) => node.kind === 'sequence_participant').map((node) => node.content.label)).toEqual(['A', 'B']);
    expect(result.connectors).toHaveLength(2);
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
  describe('readable layout', () => {
    const login = 'sequence\nparticipant Browser\nparticipant API Gateway\nparticipant Auth Service\nparticipant Database\n'
      + 'Browser -> API Gateway : POST /login (email, password)\nAPI Gateway -> Auth Service : validate credentials\n'
      + 'Auth Service -> Database : SELECT user by email\nDatabase --> Auth Service : user record\n'
      + 'alt password matches {\n  Auth Service -> Database : create session\n  API Gateway --> Browser : 200 OK + session cookie\n'
      + '} else mismatch {\n  Auth Service --> API Gateway : 401 invalid credentials\n  API Gateway --> Browser : 401 Unauthorized\n}';
    const center = (node: { transform: { translation: { x: number } }; size: { width: number } }) => node.transform.translation.x + node.size.width / 2;

    it('lifts a label above its arrow so the plate never covers the line', async () => {
      const result = await compile(login);
      const style = resolveConnectorLabelStyle(result.connectors[0]!);
      for (const connector of result.connectors) {
        const label = connector.labels[0]!;
        const plate = connectorLabelPlate(label.text, style, { x: 0, y: label.offset.y });
        expect(plate.y + plate.height).toBeLessThan(0);
      }
    });

    it('keeps a fragment header above the label of its first message', async () => {
      const result = await compile(login);
      const style = resolveConnectorLabelStyle(result.connectors[0]!);
      const rowTop = (index: number) => Number(result.connectors[index]!.semantics.seqMessageOrder) * 52;
      for (const fragment of result.nodes.filter((node) => node.kind === 'annotation')) {
        const first = result.connectors[Number(fragment.content.seqMessageOrder)]!;
        const plate = connectorLabelPlate(first.labels[0]!.text, style, { x: 0, y: first.labels[0]!.offset.y });
        const lineY = 132 + rowTop(Number(fragment.content.seqMessageOrder));
        // The 24px header tag ends above the first message's label plate.
        expect(fragment.transform.translation.y + 24).toBeLessThanOrEqual(lineY + plate.y);
      }
    });

    it('puts the guard text clear of every lifeline', async () => {
      const result = await compile(login);
      const lifelines = result.nodes.filter((node) => node.kind === 'sequence_participant').map(center);
      for (const fragment of result.nodes.filter((node) => node.kind === 'annotation')) {
        const guard = fragment.content.seqGuard as { x: number; width: number };
        const left = fragment.transform.translation.x + guard.x;
        for (const lifeline of lifelines) expect(lifeline <= left || lifeline >= left + guard.width).toBe(true);
      }
    });
  });
});
