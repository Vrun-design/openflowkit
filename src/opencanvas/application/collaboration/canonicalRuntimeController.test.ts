import { describe, expect, it } from 'vitest';
import { createCollaborationSessionBootstrap } from '@/services/collaboration/session';
import { createInMemoryCollaborationTransport } from '@/services/collaboration/transport';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { SceneNode } from '../../domain/document/types';
import { createCanonicalRuntimeController } from './canonicalRuntimeController';

function session(clientId: string) {
  return createCollaborationSessionBootstrap({
    roomId: 'canonical-room', roomPassword: 'secret', clientId, name: clientId, color: '#123456',
  });
}

function rename(before: SceneNode, label: string) {
  return {
    kind: 'set-node' as const,
    id: `rename-${label}`,
    label: `Rename ${label}`,
    pageId: 'page-1',
    before,
    after: { ...before, content: { label } },
  };
}

describe('canonical collaboration runtime controller', () => {
  it('converges independent edits and replays the log to a reconnecting peer', () => {
    const initial = createTestDocument({ nodes: [createTestNode('a'), createTestNode('b')] });
    const transportA = createInMemoryCollaborationTransport();
    const transportB = createInMemoryCollaborationTransport();
    const a = createCanonicalRuntimeController({ transport: transportA, session: session('a'), initialDocument: initial });
    let b = createCanonicalRuntimeController({ transport: transportB, session: session('b'), initialDocument: initial });
    a.start();
    b.start();
    expect(a.submit(rename(initial.pages[0].nodes[0], 'Alpha'))).not.toBeNull();
    expect(b.submit(rename(initial.pages[0].nodes[1], 'Beta'))).not.toBeNull();
    expect(a.getDocument()).toEqual(b.getDocument());
    b.stop();
    b = createCanonicalRuntimeController({
      transport: createInMemoryCollaborationTransport(), session: session('b-reconnected'), initialDocument: initial,
    });
    b.start();
    expect(b.getDocument()).toEqual(a.getDocument());
    a.stop();
    b.stop();
  });

  it('converges same-node conflicts with an explicitly rejected loser', () => {
    const initial = createTestDocument({ nodes: [createTestNode('a')] });
    const rejectedA: string[][] = [];
    const rejectedB: string[][] = [];
    const a = createCanonicalRuntimeController({
      transport: createInMemoryCollaborationTransport(), session: session('a-conflict'), initialDocument: initial,
      onRejectedOperations: (items) => rejectedA.push(items.map((item) => item.operation.clientId)),
    });
    const b = createCanonicalRuntimeController({
      transport: createInMemoryCollaborationTransport(), session: session('b-conflict'), initialDocument: initial,
      onRejectedOperations: (items) => rejectedB.push(items.map((item) => item.operation.clientId)),
    });
    a.start();
    b.start();
    a.submit(rename(initial.pages[0].nodes[0], 'Alpha'));
    b.submit(rename(initial.pages[0].nodes[0], 'Beta'));
    expect(a.getDocument()).toEqual(b.getDocument());
    expect(a.getDocument().pages[0].nodes[0].content.label).toBe('Alpha');
    expect(rejectedA).toEqual([]);
    expect(rejectedB.at(-1)).toEqual(['b-conflict']);
    a.stop();
    b.stop();
  });

  it('refuses invalid connector bindings before publication', () => {
    const initial = createTestDocument({ nodes: [createTestNode('a')] });
    const transport = createInMemoryCollaborationTransport();
    const controller = createCanonicalRuntimeController({ transport, session: session('invalid'), initialDocument: initial });
    controller.start();
    expect(controller.submit({
      kind: 'insert-connector', id: 'bad', label: 'Bad connector', pageId: 'page-1', index: 0,
      connector: {
        id: 'bad', source: { nodeId: 'a', portId: null, anchor: null },
        target: { nodeId: 'missing', portId: null, anchor: null },
        route: { kind: 'direct', ownership: 'automatic' }, waypoints: [], labels: [],
        appearance: {}, semantics: {}, metadata: {}, extensions: {},
      },
    })).toBeNull();
    expect(controller.getOperations()).toEqual([]);
    controller.stop();
  });

  it('publishes transaction-scoped undo and redo that converge on every peer', () => {
    const initial = createTestDocument({ nodes: [createTestNode('a')] });
    const a = createCanonicalRuntimeController({ transport: createInMemoryCollaborationTransport(),
      session: session('undo-a'), initialDocument: initial });
    const b = createCanonicalRuntimeController({ transport: createInMemoryCollaborationTransport(),
      session: session('undo-b'), initialDocument: initial });
    a.start(); b.start();
    expect(a.submit(rename(initial.pages[0].nodes[0], 'Changed'))).not.toBeNull();
    expect(a.canUndo()).toBe(true);
    expect(a.undo()).not.toBeNull();
    expect(a.getDocument()).toEqual(initial);
    expect(b.getDocument()).toEqual(initial);
    expect(a.canRedo()).toBe(true);
    expect(a.redo()).not.toBeNull();
    expect(a.getDocument().pages[0].nodes[0].content.label).toBe('Changed');
    expect(b.getDocument()).toEqual(a.getDocument());
    a.stop(); b.stop();
  });
});
