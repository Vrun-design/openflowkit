// Icons from labels, end to end: generate from text, see the icons land, then
// take them off at each scale a user reaches for — one node, then the diagram —
// and check undo gives back exactly what a removal took.
import { expect, test, type Page } from '@playwright/test';
import { centreOf, doc, openCanvas, rect, state, type V2Node } from './helpers';

const META = process.platform === 'darwin' ? 'Meta' : 'Control';

async function nodeById(page: Page, id: string): Promise<V2Node & { content: Record<string, unknown>; metadata: Record<string, unknown> }> {
  const document = await doc(page);
  return document!.pages[0]!.nodes.find((candidate) => candidate.id === id) as never;
}

test('generated nodes get icons from their labels, and each scale of "no" works', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nWeb app [tech: React] -> API [tech: Node.js] -> Postgres\nAPI -> Validate input');
  await source.press(`${META}+Enter`);
  await expect.poll(async () => (await state(page)).nodes.length, { timeout: 15_000 }).toBeGreaterThan(3);

  expect((await nodeById(page, 'postgres')).content.icon).toBe('developer/database-postgresql');
  expect((await nodeById(page, 'web-app')).content.icon).toBe('developer/frontend-reactjs');
  expect((await nodeById(page, 'api')).content.icon).toBe('developer/backend-nodejs');
  expect((await nodeById(page, 'validate-input')).content.icon).toBeUndefined();
  await expect(page.getByText('3 icons added from labels.')).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  // One node: right-click → Remove icon, then undo.
  const postgres = await centreOf(page, 'postgres');
  await page.mouse.click(postgres.x, postgres.y);
  await page.mouse.click(postgres.x, postgres.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove icon' }).click();
  await expect.poll(async () => (await nodeById(page, 'postgres')).content.icon).toBeUndefined();
  expect((await nodeById(page, 'postgres')).kind).toBe('process');
  expect((await nodeById(page, 'postgres')).metadata.dsl).toMatchObject({ icon: 'none' });
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press(`${META}+z`);
  await expect.poll(async () => (await nodeById(page, 'postgres')).content.icon).toBe('developer/database-postgresql');

  // The whole diagram: the frame's menu shows the toggle ticked; untick it.
  const frameId = (await doc(page))!.pages[0]!.nodes.find((candidate) => candidate.kind === 'frame')!.id;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const frame = (await rect(page, frameId))!;
  await page.mouse.click(box.x + frame.x + frame.width / 2, box.y + frame.y + 12, { button: 'right' });
  const toggle = page.getByRole('menuitemcheckbox', { name: 'Icons from labels' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect.poll(async () => (await doc(page))!.pages[0]!.nodes.filter((candidate) => (candidate as unknown as { content: { icon?: string } }).content.icon).length).toBe(0);
  expect((await nodeById(page, frameId)).metadata.dsl).toMatchObject({ icons: 'off' });
});

const iconsByLabel = async (page: Page): Promise<Record<string, unknown>> => Object.fromEntries(
  (await doc(page))!.pages[0]!.nodes.map((candidate) => {
    const content = (candidate as unknown as { content: { label?: string; icon?: unknown } }).content;
    return [content.label ?? candidate.id, content.icon];
  }));

test('a Mermaid import gets icons from its labels', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart LR\n  fe[React App] --> api[Node.js API]\n  api --> db[(Postgres)]\n  api --> ok{Valid?}');
  await page.getByRole('button', { name: /^Convert/ }).click();
  await expect(source).not.toHaveValue(/-->/);
  await source.press(`${META}+Enter`);
  await expect.poll(async () => (await iconsByLabel(page))['Postgres'], { timeout: 15_000 }).toBe('developer/database-postgresql');
  expect(await iconsByLabel(page)).toMatchObject({
    'React App': 'developer/frontend-reactjs', 'Node.js API': 'developer/backend-nodejs', 'Valid?': undefined,
  });
});

test('an AI-generated diagram gets icons once the proposal is applied', async ({ page }) => {
  const reply = 'flowchart right\nWeb app [tech: Next.js] -> API [tech: FastAPI] -> Postgres\nAPI -> Redis cache';
  await page.route('http://127.0.0.1:4399/v1/chat/completions', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ choices: [{ message: { content: reply } }] }),
  }));
  await page.goto('/');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'AI assistant', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'AI assistant' });
  await panel.getByRole('button', { name: 'Connect an AI provider' }).click();
  const dialog = page.getByRole('dialog', { name: 'AI provider' });
  await dialog.getByRole('button', { name: 'Use Custom' }).click();
  await dialog.getByLabel('API key').fill('sk-ok');
  await dialog.locator('summary').click();
  await dialog.getByLabel('Base URL').fill('http://127.0.0.1:4399/v1');
  await dialog.getByLabel('Model').fill('stub-model');
  await dialog.getByRole('button', { name: 'Connect', exact: true }).click();
  await panel.getByRole('textbox').fill('A web app with an API, Postgres and a cache');
  await panel.getByRole('textbox').press('Enter');
  await panel.getByRole('button', { name: 'Apply' }).click();
  await expect.poll(async () => (await iconsByLabel(page))['Postgres'], { timeout: 15_000 }).toBe('developer/database-postgresql');
  expect(await iconsByLabel(page)).toMatchObject({
    'Web app': 'developer/frontend-nextjs', API: 'developer/others-fast-api', 'Redis cache': 'developer/database-redis',
  });
});

test('SVG and PNG exports carry the icon art, self-contained', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nUsers -> Web app [tech: React] -> Postgres');
  await source.press(`${META}+Enter`);
  await expect.poll(async () => (await iconsByLabel(page))['Postgres'], { timeout: 15_000 }).toBe('developer/database-postgresql');
  await page.getByRole('button', { name: 'Close panel' }).click();

  const exportAs = async (format: 'SVG' | 'PNG') => {
    await page.getByRole('button', { name: 'Canvas menu' }).click();
    await page.getByRole('menuitem', { name: 'Export…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export' });
    await dialog.getByRole('radio', { name: format }).click();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download' }).click();
    return download;
  };
  const svgFile = await exportAs('SVG');
  const svg = (await (await svgFile.createReadStream()).toArray()).join('');
  // Three icons (a Tabler glyph, a React logo, a Postgres logo), all inlined:
  // the file opens anywhere with no fetch.
  expect(svg.match(/<image href="data:image\//g)).toHaveLength(3);
  expect(svg).not.toMatch(/<image href="(?!data:)/);

  // The animated SVG from the motion dialog inlines the same art.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  await page.getByRole('button', { name: /Animate this page/ }).click();
  const animated = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  const motion = (await (await (await animated).createReadStream()).toArray()).join('');
  expect(motion.match(/<image href="data:image\//g)).toHaveLength(3);
  await page.keyboard.press('Escape');

  const pngFile = await exportAs('PNG');
  const path = await pngFile.path();
  expect(path).toBeTruthy();
  if (process.env.AUTO_ICONS_SHOT) await pngFile.saveAs(process.env.AUTO_ICONS_SHOT);
});

test('C4: removing an element\'s icon updates every view, and the workspace toggle sticks', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill(`architecture
model {
  system Shop {
    container Web [tech: React]
    container API [tech: Node.js]
    store DB [tech: PostgreSQL]
    Web -> API
    API -> DB
  }
}
views {
  view container of Shop
}`);
  await source.press(`${META}+Enter`);
  const nodes = async () => (await doc(page))!.pages.flatMap((candidate) => candidate.nodes) as unknown as {
    id: string; kind: string; content: { label?: string; icon?: string }; metadata: { dsl?: { arch?: { model?: { icons?: string } } } };
  }[];
  const byLabel = async (label: string) => (await nodes()).filter((candidate) => candidate.content.label === label);
  await expect.poll(async () => (await byLabel('DB'))[0]?.content.icon, { timeout: 15_000 }).toBe('developer/database-postgresql');
  await page.getByRole('button', { name: 'Close panel' }).click();

  const dbId = (await doc(page))!.pages.flatMap((candidate) => candidate.nodes)
    .find((candidate) => (candidate as unknown as { content: { label?: string } }).content.label === 'DB')!.id;
  const centre = await centreOf(page, dbId);
  await page.mouse.click(centre.x, centre.y);
  await page.mouse.click(centre.x, centre.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Remove icon' }).click();
  await expect.poll(async () => (await byLabel('DB')).every((candidate) => !candidate.content.icon && candidate.kind === 'process')).toBe(true);
  expect((await byLabel('API'))[0]!.content.icon).toBe('developer/backend-nodejs');

  const frameId = (await nodes()).find((candidate) => candidate.kind === 'frame' && candidate.metadata.dsl?.arch)!.id;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const frame = (await rect(page, frameId))!;
  await page.mouse.click(box.x + frame.x + frame.width / 2, box.y + frame.y + 12, { button: 'right' });
  const toggle = page.getByRole('menuitemcheckbox', { name: 'Icons from labels' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect.poll(async () => (await nodes()).filter((candidate) => candidate.content.icon).length).toBe(0);
  expect((await nodes()).find((candidate) => candidate.metadata.dsl?.arch)!.metadata.dsl!.arch!.model!.icons).toBe('off');
});

test('renaming a node moves its inferred icon with the label', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill('flowchart right\nAPI [tech: Node.js] -> Postgres');
  await source.press(`${META}+Enter`);
  await expect.poll(async () => (await iconsByLabel(page))['Postgres'], { timeout: 15_000 }).toBe('developer/database-postgresql');
  await page.getByRole('button', { name: 'Close panel' }).click();
  const rename = async (from: string, to: string) => {
    const id = (await doc(page))!.pages[0]!.nodes
      .find((candidate) => (candidate as unknown as { content: { label?: string } }).content.label === from)!.id;
    const centre = await centreOf(page, id);
    await page.mouse.dblclick(centre.x, centre.y);
    await page.keyboard.press(`${META}+a`);
    await page.keyboard.type(to);
    await page.keyboard.press('Enter');
    await expect.poll(async () => Object.keys(await iconsByLabel(page))).toContain(to);
  };
  await rename('Postgres', 'MySQL');
  expect((await iconsByLabel(page))['MySQL']).toBe('developer/database-mysql');
  await rename('MySQL', 'Ledger');
  expect((await iconsByLabel(page))['Ledger']).toBeUndefined();
});
