// The agent eval: the exact sequence the product promises an MCP client can
// run, driven through the tool layer. No model in the loop — this is the
// deterministic half of the check; the live half (paired editor, real PNG) is
// e2e/agent-live.spec.ts, and `npm run eval:agent` runs this one.
import { afterAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServerWithDeps } from '../src/server.js';
import type { LiveBridge } from '../src/lib/agent.js';

interface EvalClient {
  readonly client: Client;
  call(name: string, args?: Record<string, unknown>): Promise<unknown>;
  raw(name: string, args?: Record<string, unknown>): Promise<{ isError: boolean; text: string }>;
}

async function agent(bridge?: LiveBridge): Promise<EvalClient> {
  const { server } = createServerWithDeps({ ...(bridge ? { bridge } : {}), log: () => undefined });
  const client = new Client({ name: 'openflowkit-eval', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const raw = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const [content] = (result.content ?? []) as { text?: string }[];
    return { isError: result.isError === true, text: content?.text ?? '' };
  };
  return {
    client,
    raw,
    async call(name, args = {}) {
      const { isError, text } = await raw(name, args);
      if (isError) throw new Error(text);
      return JSON.parse(text);
    },
  };
}

const FLOWCHART = `%% ofk 1
flowchart

  Client [blue] -> API [emerald] : HTTPS
  API -> Store [cylinder, red, bold]
`;

describe('agent eval — create, read, update, screenshot', () => {
  let evalClient: EvalClient | null = null;
  afterAll(() => { evalClient?.client.close(); });

  it('creates a flowchart, reads it back, updates it and exports a preview', async () => {
    const a = (evalClient = await agent());
    const created = await a.call('openflow_create', { name: 'Eval — checkout' }) as { id: string };
    const documentId = created.id;

    // 1. create_diagram
    const diagram = await a.call('create_diagram', { documentId, dsl: FLOWCHART }) as {
      changed: boolean; output: { frameId: string; family: string; nodes: number; connectors: number };
    };
    expect(diagram.changed).toBe(true);
    expect(diagram.output).toMatchObject({ family: 'flowchart', nodes: 3, connectors: 2 });
    const frameId = diagram.output.frameId;

    // 2. get_diagram — authored text, no drift, and the frame is listed
    const read = await a.call('get_diagram', { documentId, frameId }) as { output: { dsl: string; edited: boolean; losses: unknown[] } };
    expect(read.output.edited).toBe(false);
    expect(read.output.dsl).toBe(FLOWCHART);
    expect(read.output.losses).toEqual([]);
    const listed = await a.call('list_diagrams', { documentId }) as { output: { diagrams: { frameId: string }[] } };
    expect(listed.output.diagrams.map(({ frameId: id }) => id)).toContain(frameId);

    // 3. update_diagram — same frame, new body
    const updated = await a.call('update_diagram', {
      documentId, frameId,
      dsl: '%% ofk 1\nflowchart\n\n  Client -> API : HTTPS\n  API -> Queue [queue, amber]\n  Queue -> Worker\n  Worker -> Store [cylinder, red, bold]\n',
    }) as { output: { frameId: string; nodes: number; connectors: number } };
    expect(updated.output).toMatchObject({ frameId, nodes: 5, connectors: 4 });
    const reread = await a.call('get_diagram', { documentId, frameId }) as { output: { dsl: string } };
    expect(reread.output.dsl).toContain('Worker -> Store');

    // 4. preview — file mode renders SVG/PDF; PNG needs the paired editor and
    //    says so, which is the honest failure the live eval replaces.
    const exported = await a.call('export', { documentId, frameId, format: 'svg', scope: 'page' }) as {
      output: { files: { filename: string; mime: string; text: string }[] };
    };
    expect(exported.output.files[0]).toMatchObject({ mime: 'image/svg+xml' });
    expect(exported.output.files[0]!.text).toContain('data-node-id');
    const screenshot = await a.raw('screenshot', { documentId, frameId });
    expect(screenshot.isError).toBe(true);
    expect(screenshot.text).toMatch(/live editor/);

    // Syntax and icons are part of the same surface.
    const syntax = await a.call('get_syntax', { family: 'sequence' }) as { output: { syntax: string } };
    expect(syntax.output.syntax).toContain('sequence');
    const icons = await a.call('find_icons_for', { documentId, concept: 'database', limit: 3 }) as {
      output: { matches: { provider: string; slug: string }[] };
    };
    expect(icons.output.matches.length).toBeGreaterThan(0);

    // Bad input never touches the document.
    const bad = await a.raw('update_diagram', { documentId, frameId: 'missing-frame', dsl: 'flowchart\n A -> B' });
    expect(bad.isError).toBe(true);
    const after = await a.call('get_diagram', { documentId, frameId }) as { output: { dsl: string } };
    expect(after.output.dsl).toContain('Worker -> Store');
  });

  it('runs the same four ops against a paired editor', async () => {
    // A scripted editor stands in for the browser: it proves tool routing and
    // the PNG pass-through; the real window is exercised by the Playwright spec.
    const seen: string[] = [];
    const editor = {
      connected: true,
      health: () => ({
        ok: true, protocol: 1, name: 'openflowkit', version: '0.0.0', connected: true,
        documentId: 'live-doc', documentName: 'Live checkout', pageId: 'p1',
        pages: [{ pageId: 'p1', name: 'Page 1', nodes: 3, connectors: 2 }], lastSeenMs: 10,
      }),
      call: async (op: string) => {
        seen.push(op);
        if (op === 'create_diagram') return { frameId: 'dsl-live', family: 'flowchart', nodes: 3, connectors: 2 };
        if (op === 'get_diagram') return { frameId: 'dsl-live', edited: false, losses: [], dsl: FLOWCHART };
        if (op === 'update_diagram') return { frameId: 'dsl-live', family: 'flowchart', nodes: 5, connectors: 4 };
        if (op === 'screenshot') return { frameId: 'dsl-live', mime: 'image/png', base64: 'iVBORw0KGgo=' };
        return {};
      },
    } as unknown as LiveBridge;
    const a = await agent(editor);

    const created = await a.call('create_diagram', { dsl: FLOWCHART }) as { frameId: string };
    expect(created).toMatchObject({ frameId: 'dsl-live' });
    const read = await a.call('get_diagram', { frameId: 'dsl-live' }) as { edited: boolean };
    expect(read.edited).toBe(false);
    const updated = await a.call('update_diagram', { frameId: 'dsl-live', dsl: FLOWCHART }) as { nodes: number };
    expect(updated.nodes).toBe(5);
    const shot = await a.call('screenshot', { frameId: 'dsl-live', scale: 2 }) as { base64: string; mime: string };
    expect(shot).toMatchObject({ mime: 'image/png' });
    expect(shot.base64.startsWith('iVBOR')).toBe(true);
    expect(seen).toEqual(['create_diagram', 'get_diagram', 'update_diagram', 'screenshot']);

    const whoami = await a.call('whoami') as { mode: string; editor: { documentId: string } };
    expect(whoami).toMatchObject({ mode: 'live-editor', editor: { documentId: 'live-doc' } });
  });
});
