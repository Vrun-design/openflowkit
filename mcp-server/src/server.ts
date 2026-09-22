import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './lib/version.js';
import { LiveBridge } from './lib/bridge.js';
import { DocumentStore } from './lib/documentStore.js';
import { registerValidateDsl } from './tools/validateDsl.js';
import { registerAnalyzeCodebase } from './tools/analyzeCodebase.js';
import { registerListTemplates } from './tools/listTemplates.js';
import { registerGetTemplate } from './tools/getTemplate.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerArchitectureTools } from './tools/architecture.js';
import { registerDocumentTools, registerOpTools, type OpToolDeps } from './tools/ops.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export interface ServerOptions extends Partial<OpToolDeps> {
  /** Bridge port; defaults to OPENFLOWKIT_BRIDGE_PORT or 43119. */
  readonly port?: number;
  readonly log?: (message: string) => void;
}

export interface CreatedServer {
  readonly server: McpServer;
  readonly bridge: LiveBridge;
  readonly store: DocumentStore;
}

/**
 * Builds the MCP server and its live bridge. The bridge is started separately
 * (see index.ts) so tests can pair a fake editor without opening a socket.
 */
export function createServerWithDeps(options: ServerOptions = {}): CreatedServer {
  const store = options.store ?? new DocumentStore();
  const log = options.log ?? ((message: string) => console.error(message));
  const bridge = options.bridge ?? new LiveBridge({
    port: options.port ?? (Number.parseInt(process.env.OPENFLOWKIT_BRIDGE_PORT ?? '', 10) || 43119),
    ...(process.env.OPENFLOWKIT_BRIDGE_TOKEN ? { token: process.env.OPENFLOWKIT_BRIDGE_TOKEN } : {}),
    log,
  });
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  const deps: OpToolDeps = { store, bridge };

  registerValidateDsl(server);
  registerAnalyzeCodebase(server);
  registerListTemplates(server);
  registerGetTemplate(server);
  registerDiscoveryTools(server);
  registerArchitectureTools(server, store);
  registerDocumentTools(server, deps);
  registerOpTools(server, deps);
  registerResources(server);
  registerPrompts(server);

  return { server, bridge, store };
}

export function createServer(): McpServer {
  return createServerWithDeps().server;
}
