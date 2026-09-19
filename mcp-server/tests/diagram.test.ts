import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function text(result: Awaited<ReturnType<Client['callTool']>>) {
  const content = result.content as { type: string; text: string }[];
  return JSON.parse(content[0]!.text) as Record<string, unknown>;
}

describe('diagram tools', () => {
  let client: Client;
  beforeAll(async () => {
    client = await connect();
  });

  it('exposes one tool per agent action with the documentId added', async () => {
    const { tools } = await client.listTools();
    const names = tools.map(({ name }) => name);
    expect(names).toEqual(expect.arrayContaining([
      'diagram_create', 'diagram_open', 'diagram_save', 'diagram_export',
      'diagram_get_document', 'diagram_add_node', 'diagram_connect', 'diagram_set_label',
      'diagram_move_node', 'diagram_delete_node',
    ]));
    const addNode = tools.find(({ name }) => name === 'diagram_add_node')!;
    expect(Object.keys(addNode.inputSchema.properties ?? {})).toEqual(
      expect.arrayContaining(['documentId', 'label', 'kind', 'x', 'y'])
    );
  });

  it('creates, edits, exports, saves, and reopens a document', async () => {
    const created = text(await client.callTool({ name: 'diagram_create', arguments: { name: 'Login flow' } }));
    const documentId = created.documentId as string;

    text(await client.callTool({ name: 'diagram_add_node', arguments: { documentId, id: 'start', kind: 'start', label: 'Open app' } }));
    text(await client.callTool({ name: 'diagram_add_node', arguments: { documentId, id: 'login', label: 'Log in', x: 240 } }));
    const connected = text(await client.callTool({ name: 'diagram_connect', arguments: { documentId, source: 'start', target: 'login', id: 'e1' } }));
    expect(connected).toEqual({ changed: true, output: { id: 'e1' } });

    const read = text(await client.callTool({ name: 'diagram_get_document', arguments: { documentId } }));
    expect((read.output as { nodes: unknown[] }).nodes).toHaveLength(2);

    const exported = text(await client.callTool({ name: 'diagram_export', arguments: { documentId } }));
    expect(exported.nodes).toHaveLength(2);
    expect(exported.edges).toHaveLength(1);

    const path = join(await mkdtemp(join(tmpdir(), 'ofk-')), 'login.json');
    text(await client.callTool({ name: 'diagram_save', arguments: { documentId, path } }));
    expect(JSON.parse(await readFile(path, 'utf8')).pages[0].nodes).toHaveLength(2);
    const reopened = text(await client.callTool({ name: 'diagram_open', arguments: { path } }));
    expect(reopened.documentId).toBe(documentId);
  });

  it('reports errors without touching the document', async () => {
    const created = text(await client.callTool({ name: 'diagram_create', arguments: { name: 'Errors' } }));
    const documentId = created.documentId as string;
    const missing = await client.callTool({ name: 'diagram_set_label', arguments: { documentId, id: 'nope', label: 'X' } });
    expect(missing.isError).toBe(true);
    const unknownDocument = await client.callTool({ name: 'diagram_get_document', arguments: { documentId: 'ghost' } });
    expect(unknownDocument.isError).toBe(true);
  });
});
