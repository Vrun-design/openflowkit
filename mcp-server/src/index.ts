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
    console.error(`openflowkit: ${bridge.unpairedReason ?? `live bridge unavailable (${error instanceof Error ? error.message : String(error)}). File mode still works.`}`);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // The client closing stdin is the end of the session: answer what was asked, then free the bridge port
  // rather than linger as an orphan that keeps it (and refuses the next server's editor).
  const exit = () => { void bridge.stop().finally(() => process.exit(0)); };
  // Requests still being answered: a piped one-shot session (`printf … | openflowkit-mcp`) ends stdin first.
  let inFlight = 0;
  let closing = false;
  const receive = transport.onmessage!;
  transport.onmessage = (message) => { if ('method' in message && 'id' in message) inFlight += 1; receive(message); };
  const send = transport.send.bind(transport);
  transport.send = async (message) => {
    await send(message);
    if (!('method' in message) && 'id' in message) inFlight -= 1;
    if (closing && inFlight <= 0) exit();
  };
  const drain = () => { if (closing) return; closing = true; if (inFlight <= 0) exit(); };
  process.stdin.once('end', drain);
  process.stdin.once('close', drain);
}

main().catch((error) => {
  console.error('openflowkit-mcp failed to start:', error);
  process.exit(1);
});
