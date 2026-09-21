import { spawn } from 'node:child_process';
import { expect, test } from '@playwright/test';

// The live half of the agent check: a real editor window paired with a real MCP
// server, driven over stdio through create → get_diagram → update → screenshot.
// `npm run eval:agent` covers the deterministic half in file mode.
//
// Run headed: npm run e2e:headed -- e2e/agent-live.spec.ts

const REPO_ROOT = new URL('..', import.meta.url).pathname;
// A per-run port so a lingering bridge from an earlier run cannot shadow this
// one; CI may pin OPENFLOWKIT_BRIDGE_PORT explicitly.
const BRIDGE_PORT = process.env.OPENFLOWKIT_BRIDGE_PORT ?? String(44_000 + (process.pid % 1_000));

interface LiveEvalResult {
  readonly error?: string;
  readonly editor?: { documentName?: string; documentId?: string };
  readonly created?: { frameId: string; nodes: number; connectors: number };
  readonly read?: { frameId: string; edited: boolean; losses: readonly string[]; dslLength: number };
  readonly updated?: { nodes: number; connectors: number };
  readonly screenshot?: { mime: string; bytes: number; filename: string };
}

function runDriver(): Promise<LiveEvalResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['mcp-server/scripts/live-eval.mjs'], {
      cwd: REPO_ROOT,
      env: { ...process.env, OPENFLOWKIT_BRIDGE_PORT: BRIDGE_PORT },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      const line = stdout.trim().split('\n').at(-1) ?? '';
      try {
        const parsed = JSON.parse(line) as LiveEvalResult;
        if (parsed.error) reject(new Error(`${parsed.error}\n${stderr}`));
        else if (code !== 0) reject(new Error(`driver exited ${code}\n${stderr}`));
        else resolve(parsed);
      } catch {
        reject(new Error(`driver produced no JSON (exit ${code}): ${stdout}\n${stderr}`));
      }
    });
  });
}

test('an MCP agent creates, reads, updates and screenshots a diagram in the open editor', async ({ page }) => {
  test.setTimeout(120_000);
  // Pair before the app boots: same path the Connect-agent popover writes.
  await page.addInitScript((port) => {
    const key = 'openflowkit-v2-preferences';
    const current = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    window.localStorage.setItem(key, JSON.stringify({
      ...current, agentBridgeEnabled: true, bridgePort: port, bridgeToken: '',
    }));
  }, Number(BRIDGE_PORT));

  // The MCP server (and its bridge) must be listening before the editor tries
  // to pair, so the driver starts first and polls until the window shows up.
  const driver = runDriver();
  await page.goto(`/d/agent-live-${Date.now().toString(36)}`);
  await expect(page.getByTestId('v2-editor')).toBeVisible();
  await expect(page.locator('[data-bridge-status="connected"]')).toBeVisible({ timeout: 45_000 });

  const result = await driver;
  expect(result.error).toBeUndefined();
  expect(result.created).toMatchObject({ nodes: 3, connectors: 2 });
  expect(result.read).toMatchObject({ edited: false, losses: [] });
  expect(result.read!.frameId).toBe(result.created!.frameId);
  expect(result.read!.dslLength).toBeGreaterThan(40);
  expect(result.updated).toMatchObject({ nodes: 4, connectors: 3 });
  expect(result.screenshot).toMatchObject({ mime: 'image/png' });
  expect(result.screenshot!.bytes).toBeGreaterThan(1000);

  // The editor really drew it: the frame and its nodes are on the canvas, and
  // the agent's edit is one undo step.
  const canvas = await page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getDocument?: () => { pages: { nodes: { kind: string; content?: { label?: string } }[] }[] } } }).__V2__;
    const document = api?.getDocument?.();
    const page = document?.pages[0];
    return {
      nodes: page?.nodes.filter((node) => node.kind !== 'frame').length ?? 0,
      frames: page?.nodes.filter((node) => node.kind === 'frame').length ?? 0,
      labels: page?.nodes.map((node) => node.content?.label).filter(Boolean) ?? [],
      revision: (api as { getState?: () => { revision?: number } } | undefined)?.getState?.().revision ?? 0,
    };
  });
  expect(canvas.frames).toBe(1);
  expect(canvas.nodes).toBe(4);
  expect(canvas.labels).toEqual(expect.arrayContaining(['Client', 'Queue']));
  expect(canvas.revision).toBeGreaterThan(0);
});
