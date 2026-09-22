import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServerWithDeps } from '../src/server.js';
import { AGENT_OPS, type LiveBridge } from '../src/lib/agent.js';

// The MCP tool surface in file mode: document tools, the op tools generated
// from the shared manifest, and whoami. No browser, no network.

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

async function client(): Promise<Client> {
  const { server } = createServerWithDeps({ log: () => undefined });
  const instance = new Client({ name: 'test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), instance.connect(clientTransport)]);
  return instance;
}

async function call(target: Client, name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await target.callTool({ name, arguments: args });
  const [content] = (result.content ?? []) as { type: string; text?: string }[];
  const raw = content?.text ?? 'null';
  if (result.isError) throw new Error(raw);
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Op tools wrap their output with {documentId, changed, output}. */
async function run(target: Client, name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await call(target, name, args);
  return (result.output ?? {}) as Record<string, unknown>;
}

describe('op tools', () => {
  it('exposes every op in the manifest with a title and description', async () => {
    const target = await client();
    const { tools } = await target.listTools();
    const names = tools.map(({ name }) => name);
    expect(names).toEqual(expect.arrayContaining(AGENT_OPS.map(({ name }) => name)));
    expect(names).toEqual(expect.arrayContaining(['openflow_create', 'openflow_open', 'openflow_save', 'whoami']));
    expect(names).not.toContain('diagram_create');
    for (const op of AGENT_OPS) {
      const tool = tools.find(({ name }) => name === op.name)!;
      expect(tool.description, op.name).toBe(op.description);
      expect(tool.inputSchema, op.name).toBeTruthy();
    }
  });

  it('creates, reads, updates and exports a diagram in file mode', async () => {
    const target = await client();
    const created = await call(target, 'openflow_create', { name: 'Eval doc' });
    const documentId = created.id as string;

    const diagram = await run(target, 'create_diagram', {
      documentId, dsl: '%% ofk 1\nflowchart\n\n  Client [blue] -> API [emerald]\n  API -> Store [cylinder, red]',
    });
    expect(diagram).toMatchObject({ family: 'flowchart', nodes: 3, connectors: 2 });
    const frameId = diagram.frameId as string;

    const read = await run(target, 'get_diagram', { documentId, frameId });
    expect(read).toMatchObject({ edited: false });
    expect(String(read.dsl)).toContain('Client [blue]');

    const updated = await run(target, 'update_diagram', {
      documentId, frameId, dsl: '%% ofk 1\nflowchart\n\n  Client -> API -> Store -> Cache',
    });
    expect(updated).toMatchObject({ frameId, nodes: 4, connectors: 3 });

    const exported = await run(target, 'export', { documentId, format: 'svg', scope: 'document' });
    const [file] = exported.files as { filename: string; text: string }[];
    // Animated SVG is a file-mode format too; raster animation is not.
    const animated = await run(target, 'export', { documentId, format: 'svg-animated', scope: 'page', preset: 'walkthrough' });
    expect((animated.files as { text: string }[])[0]?.text).toContain('@keyframes');
    const refused = await target.callTool({ name: 'export', arguments: { documentId, format: 'mp4', scope: 'page' } });
    expect(refused.isError).toBe(true);
    expect(JSON.stringify(refused.content)).toContain('live editor');
    expect(file?.text).toContain('<svg');
    expect(file?.text).toContain('Cache');

    // PNG needs a live editor; the tool says so instead of failing silently.
    expect(await call(target, 'screenshot', { documentId, frameId }).catch((error: Error) => error.message))
      .toMatch(/live editor/);

    const pages = await run(target, 'list_pages', { documentId });
    expect((pages.pages as unknown[]).length).toBe(1);
  });

  it('persists a document through openflow_open and openflow_save', async () => {
    const target = await client();
    const dir = await mkdtemp(join(tmpdir(), 'openflowkit-ops-'));
    tempDirs.push(dir);
    const path = join(dir, 'eval.openflow.json');

    const created = await call(target, 'openflow_create', { name: 'Round trip' });
    await run(target, 'create_diagram', { documentId: created.id, dsl: 'sequence\n  A -> B : hello' });
    const saved = await call(target, 'openflow_save', { documentId: created.id, path });
    expect(saved).toMatchObject({ documentId: created.id });

    const onDisk = JSON.parse(await readFile(path, 'utf8')) as { name: string; pages: unknown[] };
    expect(onDisk.name).toBe('Round trip');
    expect(onDisk.pages).toHaveLength(1);

    const reopened = await call(target, 'openflow_open', { path });
    expect(reopened).toMatchObject({ documentId: created.id, name: 'Round trip' });
    const read = await run(target, 'get_diagram', { documentId: reopened.documentId as string });
    expect(String(read.dsl)).toContain('A -> B');
  });

  it('validates DSL with the real parser and reports diagnostics', async () => {
    const target = await client();
    const good = await call(target, 'validate_openflow_dsl', { dsl: '%% ofk 1\nflowchart\n\n  A -> B\n' });
    expect(good).toMatchObject({ ok: true, family: 'flowchart', reservedFamily: false, statements: 1 });

    const empty = await call(target, 'validate_openflow_dsl', { dsl: '   ' });
    expect(empty.ok).toBe(false);
    expect((empty.diagnostics as { code: string }[]).some(({ code }) => code === 'E001')).toBe(true);

    // Reserved families parse as graph syntax today: honest warning, not an error.
    const reserved = await call(target, 'validate_openflow_dsl', { dsl: 'bpmn\n  A -> B\n' });
    expect(reserved).toMatchObject({ ok: true, family: 'bpmn', reservedFamily: true });
    expect((reserved.diagnostics as { code: string }[]).some(({ code }) => code === 'W105')).toBe(true);
  });

  it('reports the mode and local documents through whoami', async () => {
    const target = await client();
    const before = await call(target, 'whoami', {});
    expect(before).toMatchObject({ mode: 'file', editor: null, cloud: expect.stringContaining('local') });
    await call(target, 'openflow_create', { name: 'Listed doc' });
    const after = await call(target, 'whoami', {});
    expect(after.documents).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Listed doc' })]));
  });

  it('routes op calls to a paired editor instead of the file store', async () => {
    const calls: { op: string; input: unknown }[] = [];
    const bridge = {
      connected: true,
      health: () => ({ ok: true, protocol: 1, name: 'openflowkit', version: '0.0.0', connected: true, documentId: 'live-doc', documentName: 'Live', pageId: 'p1', pages: [{ pageId: 'p1', name: 'Page 1', nodes: 1, connectors: 0 }], lastSeenMs: 5 }),
      call: async (op: string, input: unknown) => { calls.push({ op, input }); return { frameId: 'dsl-live' }; },
    } as unknown as LiveBridge;
    const { server } = createServerWithDeps({ bridge, log: () => undefined });
    const instance = new Client({ name: 'test', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), instance.connect(clientTransport)]);

    const result = await call(instance, 'create_diagram', { dsl: 'flowchart\n  A -> B' });
    expect(result).toMatchObject({ frameId: 'dsl-live' });
    expect(calls).toEqual([{ op: 'create_diagram', input: { dsl: 'flowchart\n  A -> B' } }]);

    const status = await call(instance, 'whoami', {});
    expect(status).toMatchObject({ mode: 'live-editor', editor: { documentId: 'live-doc' } });
  });
});
