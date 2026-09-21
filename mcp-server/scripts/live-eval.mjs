#!/usr/bin/env node
// Live eval driver: spawns the MCP server, waits for a paired editor, then runs
// the four ops the product promises over stdio — exactly what an MCP client
// does. Prints one JSON object on stdout; the Playwright spec asserts on it.
//
// The headed editor is the test's job (e2e/agent-live.spec.ts); this script
// only speaks MCP.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(HERE, '..');
const PORT = process.env.OPENFLOWKIT_BRIDGE_PORT ?? '43119';
const PAIR_TIMEOUT_MS = Number(process.env.OPENFLOWKIT_LIVE_TIMEOUT_MS ?? 45_000);
const FLOW = `%% ofk 1
flowchart
title: Live eval

  Client [blue] -> API [emerald] : HTTPS
  API -> Store [cylinder, red, bold]
`;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const [content] = result.content ?? [];
  const text = content?.text ?? '';
  if (result.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}

async function waitForEditor(client) {
  const deadline = Date.now() + PAIR_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await call(client, 'whoami');
    if (status.mode === 'live-editor') return status;
    await sleep(500);
  }
  throw new Error(`No editor paired on port ${PORT} within ${PAIR_TIMEOUT_MS}ms.`);
}

async function main() {
  /** @type {import('@modelcontextprotocol/sdk/client/index.js').Client | null} */
  let client = null;
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    cwd: SERVER_ROOT,
    env: { ...process.env, OPENFLOWKIT_BRIDGE_PORT: PORT },
    stderr: 'pipe',
  });
  client = new Client({ name: 'openflowkit-live-eval', version: '0.0.0' });
  await client.connect(transport);
  try {
    const editor = await waitForEditor(client);
    const created = await call(client, 'create_diagram', { dsl: FLOW });
    const read = await call(client, 'get_diagram', { frameId: created.frameId });
    const updated = await call(client, 'update_diagram', {
      frameId: created.frameId,
      dsl: FLOW.replace('API -> Store', 'API -> Queue [queue, amber]\n  Queue -> Store'),
    });
    const shot = await call(client, 'screenshot', { frameId: created.frameId, scale: 2 });
    process.stdout.write(`${JSON.stringify({
      editor: { documentName: editor.editor?.name, documentId: editor.editor?.documentId },
      created, read: { frameId: read.frameId, edited: read.edited, losses: read.losses, dslLength: read.dsl.length },
      updated, screenshot: { mime: shot.mime, bytes: shot.base64.length, filename: shot.filename },
    })}\n`);
  } finally {
    // Closing the transport kills the spawned server, so the bridge port is
    // free for the next run even when the eval failed.
    await client.close();
  }
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exit(1);
});
