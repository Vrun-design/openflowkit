import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AGENT_ACTIONS,
  exportAgentDocumentPage,
  runAgentAction,
} from '../lib/agent.js';
import { DocumentStore } from '../lib/documentStore.js';
import { toolError } from '../lib/errors.js';

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function summary(document: { id: string; name: string; pages: readonly { id: string; name: string }[] }) {
  return { documentId: document.id, name: document.name, pages: document.pages.map(({ id, name }) => ({ id, name })) };
}

/**
 * Live diagram editing. Every action from the app's agent registry becomes a
 * `diagram_<action>` tool that takes a documentId, so the MCP surface and the
 * in-browser WebMCP surface expose the same operations with the same schemas.
 */
export function registerDiagramTools(server: McpServer, store = new DocumentStore()): void {
  const documentId = z.string().min(1).describe('Id returned by diagram_create or diagram_open.');
  const pageId = z.string().min(1).optional().describe('Page to act on; defaults to the first page.');

  server.registerTool('diagram_create', {
    title: 'Create a diagram document',
    description: 'Create an empty diagram and keep it open for editing. Returns its documentId and page ids.',
    inputSchema: { name: z.string().min(1) },
  }, async ({ name }) => json(summary(store.create(name))));

  server.registerTool('diagram_open', {
    title: 'Open a diagram document file',
    description: 'Open a canonical OpenFlowKit document (.json) from disk for editing.',
    inputSchema: { path: z.string().min(1) },
  }, async ({ path }) => {
    try {
      return json(summary(await store.open(path)));
    } catch (error) {
      return toolError(`Could not open "${path}": ${(error as Error).message}`);
    }
  });

  server.registerTool('diagram_save', {
    title: 'Save a diagram document file',
    description: 'Write an open document to disk as canonical OpenFlowKit JSON. Reopen it later with diagram_open.',
    inputSchema: { documentId, path: z.string().min(1) },
  }, async (args) => {
    try {
      await store.save(args.documentId, args.path);
      return json({ saved: args.path });
    } catch (error) {
      return toolError((error as Error).message);
    }
  });

  server.registerTool('diagram_export', {
    title: 'Export a diagram page for the OpenFlowKit app',
    description: 'Return the nodes/edges JSON of one page, the format the OpenFlowKit app imports.',
    inputSchema: { documentId, pageId },
  }, async (args) => {
    try {
      return json(exportAgentDocumentPage(store.get(args.documentId), args.pageId));
    } catch (error) {
      return toolError((error as Error).message);
    }
  });

  for (const action of AGENT_ACTIONS) {
    server.registerTool(`diagram_${action.name}`, {
      title: action.name.replaceAll('_', ' '),
      description: action.description,
      inputSchema: { documentId, pageId, ...action.schema.shape },
    }, async ({ documentId: id, pageId: page, ...input }) => {
      try {
        const document = store.get(id);
        const targetPage = page ?? document.pages[0]?.id ?? '';
        const result = runAgentAction(action, input, document, targetPage);
        store.set(result.document);
        return json({ changed: result.changed, output: result.output });
      } catch (error) {
        return toolError((error as Error).message);
      }
    });
  }
}
