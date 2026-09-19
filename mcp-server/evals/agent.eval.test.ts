/**
 * Agent eval: the tasks an agent must be able to complete through the MCP
 * surface, scripted as the tool-call sequences a competent agent would make.
 * Deterministic (no model in the loop) so it can gate a release.
 * Run: npm run eval:agent
 */
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

type Json = Record<string, unknown>;
interface Exported { nodes: { id: string; data: { label: string } }[]; edges: { source: string; target: string }[] }

async function agent() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'eval', version: '0.0.0' });
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
  const call = async (name: string, args: Json = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const text = (result.content as { text: string }[])[0]!.text;
    if (result.isError) throw new Error(`${name}: ${text}`);
    return JSON.parse(text) as Json;
  };
  const tryCall = async (name: string, args: Json = {}) =>
    (await client.callTool({ name, arguments: args })).isError === true;
  const create = async (name: string) => (await call('diagram_create', { name })).documentId as string;
  const exported = async (documentId: string) => (await call('diagram_export', { documentId })) as unknown as Exported;
  return { call, tryCall, create, exported };
}

async function loginFlow(a: Awaited<ReturnType<typeof agent>>) {
  const documentId = await a.create('Login');
  await a.call('diagram_add_node', { documentId, id: 'start', kind: 'start', label: 'Open app', x: 0, y: 0 });
  await a.call('diagram_add_node', { documentId, id: 'form', label: 'Enter credentials', x: 0, y: 120 });
  await a.call('diagram_add_node', { documentId, id: 'check', kind: 'decision', label: 'Valid?', x: 0, y: 240 });
  await a.call('diagram_add_node', { documentId, id: 'home', kind: 'end', label: 'Home', x: -160, y: 380 });
  await a.call('diagram_add_node', { documentId, id: 'retry', label: 'Show error', x: 160, y: 380 });
  await a.call('diagram_connect', { documentId, source: 'start', target: 'form', sourceSide: 'bottom', targetSide: 'top' });
  await a.call('diagram_connect', { documentId, source: 'form', target: 'check', sourceSide: 'bottom', targetSide: 'top' });
  await a.call('diagram_connect', { documentId, source: 'check', target: 'home', sourceSide: 'bottom', targetSide: 'top' });
  await a.call('diagram_connect', { documentId, source: 'check', target: 'retry', sourceSide: 'bottom', targetSide: 'top' });
  return documentId;
}

describe('agent eval', () => {
  it('T1 builds a login flowchart from nothing', async () => {
    const a = await agent();
    const out = await a.exported(await loginFlow(a));
    expect(out.nodes.map(({ id }) => id).sort()).toEqual(['check', 'form', 'home', 'retry', 'start']);
    expect(out.edges).toHaveLength(4);
    const reachable = new Set(['start']);
    for (let i = 0; i < 5; i += 1) out.edges.forEach((e) => reachable.has(e.source) && reachable.add(e.target));
    expect(reachable.size).toBe(5);
  });

  it('T2 reads the document back and extends it with a branch', async () => {
    const a = await agent();
    const documentId = await loginFlow(a);
    const read = (await a.call('diagram_get_document', { documentId })).output as { nodes: { id: string; label: string }[] };
    const decision = read.nodes.find(({ label }) => label === 'Valid?')!;
    await a.call('diagram_add_node', { documentId, id: 'locked', label: 'Account locked', x: 320, y: 380 });
    await a.call('diagram_connect', { documentId, source: decision.id, target: 'locked' });
    const out = await a.exported(documentId);
    expect(out.nodes).toHaveLength(6);
    expect(out.edges.filter((e) => e.source === 'check')).toHaveLength(3);
  });

  it('T3 renames and moves without disturbing the rest', async () => {
    const a = await agent();
    const documentId = await loginFlow(a);
    await a.call('diagram_set_label', { documentId, id: 'retry', label: 'Show validation error' });
    await a.call('diagram_move_node', { documentId, id: 'retry', x: 400, y: 400 });
    const out = await a.exported(documentId);
    expect(out.nodes.find(({ id }) => id === 'retry')).toMatchObject({ data: { label: 'Show validation error' }, position: { x: 400, y: 400 } });
    expect(out.edges).toHaveLength(4);
  });

  it('T4 deleting a node removes its connectors', async () => {
    const a = await agent();
    const documentId = await loginFlow(a);
    await a.call('diagram_delete_node', { documentId, id: 'check' });
    const out = await a.exported(documentId);
    expect(out.nodes).toHaveLength(4);
    expect(out.edges).toHaveLength(1);
  });

  it('T5 survives save and reopen in a fresh server', async () => {
    const a = await agent();
    const documentId = await loginFlow(a);
    const path = join(await mkdtemp(join(tmpdir(), 'ofk-eval-')), 'login.json');
    await a.call('diagram_save', { documentId, path });
    const b = await agent();
    const reopened = await b.call('diagram_open', { path });
    expect(await b.exported(reopened.documentId as string)).toEqual(await a.exported(documentId));
  });

  it('T6 bad input is a tool error, never a crash, and leaves the document intact', async () => {
    const a = await agent();
    const documentId = await loginFlow(a);
    expect(await a.tryCall('diagram_connect', { documentId, source: 'start', target: 'ghost' })).toBe(true);
    expect(await a.tryCall('diagram_add_node', { documentId, label: '' })).toBe(true);
    expect(await a.tryCall('diagram_set_label', { documentId: 'nope', id: 'start', label: 'x' })).toBe(true);
    expect((await a.exported(documentId)).edges).toHaveLength(4);
  });
});
