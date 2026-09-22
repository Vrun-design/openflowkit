import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

type SceneNodeShape = {
  id: string; kind: string; parentId: string | null;
  content: Record<string, unknown>; appearance: Record<string, unknown>;
};
type SceneConnectorShape = { source: { nodeId: string | null }; target: { nodeId: string | null }; appearance: Record<string, unknown> };
type V2Api = {
  getState(): { nodes: string[] };
  getDocument(): { pages: Array<{ nodes: SceneNodeShape[]; connectors: SceneConnectorShape[] }> } | null;
  getNodeRect(nodeId: string): { x: number; y: number; width: number; height: number } | null;
};

const fixture = (name: string) => readFileSync(`src/dsl/fixtures/${name}.dsl`, 'utf8');
const fixtureFile = (path: string) => readFileSync(`src/dsl/fixtures/${path}.dsl`, 'utf8');

async function generate(page: import('@playwright/test').Page, source: string) {
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(source);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0)).toBeGreaterThan(1);
  return editor;
}

const read = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getDocument() ?? null);

test('generated architecture diagrams carry shapes, icons, colours and arrowheads', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await generate(page, fixture('04-aws-architecture'));

  const document = await read(page);
  const nodes = document?.pages[0]?.nodes ?? [];
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  expect(byId.client).toMatchObject({ kind: 'process', content: { shape: 'actor' } });
  expect(byId.gateway).toMatchObject({ kind: 'architecture', content: { icon: 'aws/api-gateway', assetPresentation: 'icon' } });
  expect(byId.resize?.content.archIconShapeId).toBeTruthy();
  expect(byId.bucket).toMatchObject({ content: { color: 'amber' } });

  const frame = nodes.find((node) => node.kind === 'frame');
  expect(frame?.content.label).toBe('Serverless upload pipeline');
  const connectors = document?.pages[0]?.connectors ?? [];
  expect(connectors.filter((connector) => connector.appearance.markerEnd === 'arrow')).toHaveLength(4);
  expect(connectors.filter((connector) => connector.appearance.dashPattern === 'dashed')).toHaveLength(1);
});

test('groups nest their members inside the frame', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await generate(page, fixture('06-nested-groups'));

  const document = await read(page);
  const nodes = document?.pages[0]?.nodes ?? [];
  const frame = nodes.find((node) => node.kind === 'frame');
  const cloud = nodes.find((node) => node.content.label === 'Cloud');
  const publicEdge = nodes.find((node) => node.content.label === 'Public edge');
  expect(cloud?.parentId).toBe(frame?.id);
  expect(publicEdge?.parentId).toBe(cloud?.id);
  expect(nodes.find((node) => node.id === 'load-balancer')?.parentId).toBe(publicEdge?.id);
});

test('Mermaid pasted into the panel converts to DSL', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill('flowchart LR\n  A[Start] --> B{Check}\n  B -->|yes| C(Go)');
  const convert = page.getByRole('button', { name: /Convert/ });
  await expect(convert).toBeVisible();
  await convert.click();
  await expect(editor).toHaveValue(/flowchart right/);
  await expect(editor).toHaveValue(/Check \[diamond\]/);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes.length ?? 0)).toBe(4);
});

test('Structurizr pasted into the panel converts to a C4 workspace', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill('workspace {\n  model {\n    u = person "User"\n    s = softwareSystem "Shop" {\n      web = container "Web"\n    }\n    u -> web "Uses"\n  }\n  views {\n    systemContext s { include * }\n    container s { include * }\n  }\n}');
  await expect(page.getByText('Structurizr detected.')).toBeVisible();
  await page.getByRole('button', { name: /Convert/ }).click();
  await expect(editor).toHaveValue(/person User/);
  await expect(editor).toHaveValue(/view container of Shop/);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getDocument()?.pages.length ?? 0)).toBe(3);
});

test('every family generates scene records with its own node kinds', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const families: Array<[string, string, string]> = [
    ['gitgraph', 'gitgraph/basic', 'process'],
    ['sequence', 'sequence/activations', 'sequence_participant'],
    ['state', 'state/controls', 'process'],
    ['erd', 'erd/shop', 'er_entity'],
    ['class', 'class/shop', 'class'],
    ['mindmap', 'mindmap/product', 'mindmap'],
  ];
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  for (const [name, fixture, kind] of families) {
    await editor.fill(fixtureFile(fixture));
    await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
    // Each generate replaces the bound frame, so wait for this family's kind to land.
    await expect.poll(
      async () => page.evaluate(() => {
        const nodes = (window as unknown as { __V2__?: V2Api }).__V2__?.getDocument()?.pages[0]?.nodes ?? [];
        return nodes.filter((node) => node.kind !== 'frame').map((node) => node.kind);
      }),
      { message: `${name} kinds` },
    ).toContain(kind);
  }
});

test('canvas edits re-serialize through Edit as code', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const editor = await generate(page, 'flowchart Icons\nA -> B'.replace('flowchart Icons', 'flowchart'));
  const frameId = await page.evaluate(() => (window as unknown as { __V2__?: V2Api }).__V2__?.getState().nodes[0] ?? null);
  expect(frameId).toBeTruthy();
  await page.getByRole('button', { name: 'Close panel' }).click();

  // Drag the first node inside the frame so the canvas no longer matches the
  // source hash. Stay inside: dragging a node out of a container reparents it
  // (containment), and then it is no longer part of this frame's text.
  const rect = await page.evaluate((id) => (window as unknown as { __V2__?: V2Api }).__V2__?.getNodeRect(id) ?? null, 'a');
  expect(rect).toBeTruthy();
  const x = rect!.x + rect!.width / 2;
  const y = rect!.y + rect!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 30, { steps: 8 });
  await page.mouse.up();

  const frameRect = await page.evaluate((id) => (window as unknown as { __V2__?: V2Api }).__V2__?.getNodeRect(id) ?? null, frameId!);
  expect(frameRect).toBeTruthy();
  await page.mouse.click(frameRect!.x + frameRect!.width / 2, frameRect!.y + 12, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Edit as code' }).click();
  const reopened = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(reopened).toHaveValue(/A -> B/);
  await expect(page.getByText('Canvas edited — regenerate will overwrite those changes.')).toBeVisible();
  void editor;
});

test('diagnostics surface under the editor and bad lines still generate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await generate(page, '%% ofk 1\nflowchart\nGood [green]\nWonder [octahedron]\nBroken [green\nGood -> Missing [icon: aws/nope]');
  await expect(page.getByText('W131', { exact: true })).toBeVisible();
  await expect(page.getByText('W101', { exact: true })).toBeVisible();
  await expect(page.getByText('W132', { exact: true })).toBeVisible();
  const document = await read(page);
  expect(document?.pages[0]?.nodes.some((node) => node.id === 'good')).toBe(true);
});
