#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServerWithDeps } from './server.js';

async function main(): Promise<void> {
  const { server, bridge } = createServerWithDeps();
  try {
    const port = await bridge.start();
    // stderr only — stdout is the MCP protocol channel.
    console.error(`openflowkit: local bridge listening on http://127.0.0.1:${port}`);
    console.error('openflowkit: in the app, click "Connect agent" and pair this port.');
  } catch (error) {
    console.error(`openflowkit: live bridge unavailable (${error instanceof Error ? error.message : String(error)}). File mode still works.`);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('openflowkit-mcp failed to start:', error);
  process.exit(1);
});
