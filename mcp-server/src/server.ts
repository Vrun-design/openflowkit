import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './lib/version.js';
import { registerValidateDsl } from './tools/validateDsl.js';
import { registerAnalyzeCodebase } from './tools/analyzeCodebase.js';
import { registerListTemplates } from './tools/listTemplates.js';
import { registerGetTemplate } from './tools/getTemplate.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerFindIcon } from './tools/findIcon.js';
import { registerCreateViewerUrl } from './tools/createViewerUrl.js';
import { registerDiagramTools } from './tools/diagram.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerValidateDsl(server);
  registerAnalyzeCodebase(server);
  registerListTemplates(server);
  registerGetTemplate(server);
  registerDiscoveryTools(server);
  registerFindIcon(server);
  registerCreateViewerUrl(server);
  registerDiagramTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
