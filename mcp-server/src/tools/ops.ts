// The op surface as MCP tools. One tool per op, generated from the shared
// manifest, plus the document/whoami tools that say where a call lands:
//
//   • live mode  — an editor is paired through the local bridge; the op runs in
//                  that window, against the document the user sees.
//   • file mode  — a `.openflow.json` document opened in this process; the op
//                  runs here with the file host capabilities (no raster).
import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AGENT_OPS, runAgentOp, type AgentOpSchemaObject, type SceneDocumentV1 } from '../lib/agent.js';
import type { DocumentStore } from '../lib/documentStore.js';
import type { LiveBridge } from '../lib/bridge.js';
import { loadFileCapabilities } from '../lib/fileCapabilities.js';
import { toolError } from '../lib/errors.js';

export interface OpToolDeps {
  readonly store: DocumentStore;
  readonly bridge: LiveBridge;
}

const documentIdField = z.string().min(1).optional()
  .describe('File-mode document id from openflow_open; omit to use the paired editor.');

/** Tool results are plain JSON: agents parse them, humans read them. */
function text(payload: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

/** Live editor wins whenever one is paired; file mode needs an explicit id. */
export function registerOpTools(server: McpServer, deps: OpToolDeps): void {
  for (const op of AGENT_OPS) {
    const shape = (op.schema as unknown as AgentOpSchemaObject).shape;
    server.registerTool(op.name, {
      title: op.title,
      description: op.description,
      inputSchema: { ...shape, documentId: documentIdField },
    }, async (raw: Record<string, unknown>): Promise<CallToolResult> => {
      const { documentId, ...input } = raw;
      try {
        if (!documentId && deps.bridge.connected) {
          return text(await deps.bridge.call(op.name, input));
        }
        const id = (typeof documentId === 'string' ? documentId : undefined) ?? deps.store.list()[0]?.id;
        if (!id) throw new Error('No document: pair an editor ("Connect agent") or call openflow_open with a .openflow.json path.');
        const document = deps.store.get(id) as unknown as SceneDocumentV1;
        const requestedPage = typeof input.pageId === 'string' ? input.pageId : undefined;
        const pageId = requestedPage ?? document.pages[0]?.id ?? '';
        const capabilities = await loadFileCapabilities();
        const result = await runAgentOp(op, input, { document, pageId, capabilities });
        if (result.changed) deps.store.set(result.document as never);
        return text({ documentId: id, changed: result.changed, output: result.output });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    });
  }
}

export type DocumentToolDeps = OpToolDeps;

export function registerDocumentTools(server: McpServer, deps: DocumentToolDeps): void {
  server.registerTool('openflow_create', {
    title: 'New document',
    description: 'Create an empty file-mode document in this process.',
    inputSchema: { name: z.string().min(1).default('Untitled diagram') },
  }, async ({ name }) => text(deps.store.create(name)));

  server.registerTool('openflow_open', {
    title: 'Open a .openflow.json',
    description: 'Load a canonical document from disk into file mode and return its id.',
    inputSchema: { path: z.string().min(1).describe('Absolute or cwd-relative path to a .openflow.json file.') },
  }, async ({ path }) => {
    try {
      const document = await deps.store.open(path);
      return text({ documentId: document.id, name: document.name, pages: document.pages.map(({ id, name: pageName }) => ({ id, name: pageName })) });
    } catch (error) {
      return toolError(error instanceof Error ? error.message : String(error));
    }
  });

  server.registerTool('openflow_save', {
    title: 'Save to .openflow.json',
    description: 'Write a document to disk. With a paired editor and no documentId, saves what the editor currently shows.',
    inputSchema: {
      path: z.string().min(1),
      documentId: z.string().min(1).optional().describe('File-mode document; omit to save the paired editor document.'),
    },
  }, async ({ path, documentId }) => {
    try {
      if (!documentId && deps.bridge.connected) {
        // Live mode: the editor owns the document, so ask it for canonical
        // JSON and write the bytes here (the server owns disk IO).
        const exported = await deps.bridge.call('export', { format: 'json', scope: 'document' }) as {
          files?: readonly { text?: string }[];
        };
        const json = exported.files?.[0]?.text;
        if (!json) throw new Error('The editor did not return canonical JSON.');
        await writeFile(path, json, 'utf8');
        return text({ saved: path, mode: 'live-editor' });
      }
      const id = (typeof documentId === 'string' ? documentId : undefined) ?? deps.store.list()[0]?.id;
      if (!id) throw new Error('Nothing to save: pass a documentId or open a file first.');
      await deps.store.save(id, path);
      return text({ saved: path, documentId: id });
    } catch (error) {
      return toolError(error instanceof Error ? error.message : String(error));
    }
  });

  server.registerTool('whoami', {
    title: 'Who am I talking to',
    description: 'Local-only status: whether an editor is paired, and the documents this server holds.',
    inputSchema: {},
  }, async () => {
    const health = deps.bridge.health();
    return text({
      server: `${health.name} ${health.version}`,
      cloud: 'none — everything is local',
      mode: health.connected ? 'live-editor' : 'file',
      editor: health.connected
        ? { documentId: health.documentId, name: health.documentName, pageId: health.pageId, pages: health.pages, lastSeenMs: health.lastSeenMs }
        : null,
      documents: deps.store.list().map(({ id, name }) => ({ documentId: id, name })),
      hint: health.connected
        ? 'Ops act on the paired editor. Pass documentId to target a file-mode document instead.'
        : 'No editor paired. Use openflow_open for file mode, or open the app and click "Connect agent".',
    });
  });
}
