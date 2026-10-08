import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../lib/version.js';
import { registerRemoteTools, VIEWER_URI, type RemoteToolOptions } from './tools.js';

export const VIEWER_MIME = 'text/html;profile=mcp-app';
// The viewer draws the SVG it is handed: no network, no external assets.
const VIEWER_UI_META = { ui: { csp: { connectDomains: [], resourceDomains: [] } } };

export interface RemoteServerOptions extends Pick<RemoteToolOptions, 'deadlineMs' | 'layout'> {
  readonly viewerHtml: string;
  readonly appOrigin: string;
}

/** A fresh server per request: stateless, nothing shared between callers. */
export function createRemoteServer({ viewerHtml, appOrigin, ...tool }: RemoteServerOptions): McpServer {
  const server = new McpServer({ name: `${MCP_SERVER_NAME}-remote`, version: MCP_SERVER_VERSION });
  registerRemoteTools(server, { appOrigin, ...tool });
  server.registerResource('viewer', VIEWER_URI, { title: 'Diagram viewer', mimeType: VIEWER_MIME, _meta: VIEWER_UI_META }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: VIEWER_MIME, text: viewerHtml, _meta: VIEWER_UI_META }],
  }));
  return server;
}
