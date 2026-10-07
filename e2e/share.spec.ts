import { FakeBucket } from '../worker/fakeBucket';
import { handle, type Env } from '../worker/index';
import { expect, test, type BrowserContext, type Page } from './test';

// Share links: encrypt in the editor, store ciphertext, open read-only from the link.
// The share origin and Turnstile are served by the real Worker handler over an in-memory bucket.
// npm run e2e:headed -- e2e/share.spec.ts

const SHARE = 'https://share.openflowkit.com';
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js*';
const LABEL = 'Payments gateway';

/** `bulk` characters of padding in the first node's label: a cheap way past the 1 MB cap. */
const file = (nodes: number, bulk = 0) => ({
  name: 'Shared flow',
  nodes: Array.from({ length: nodes }, (_, i) => ({
    id: `n${i}`, type: 'process', position: { x: i * 240, y: 0 }, data: { label: i === 0 ? bulk ? LABEL + ' ' + 'x'.repeat(bulk) : LABEL : `Step ${i}` },
  })),
  edges: nodes > 1 ? [{ id: 'e1', source: 'n0', target: 'n1' }] : [],
});

interface Backend { readonly bucket: FakeBucket; online: boolean }

async function serve(context: BrowserContext): Promise<Backend> {
  const backend: Backend = { bucket: new FakeBucket(), online: true };
  const env: Env = { SHARES: backend.bucket, TURNSTILE_SECRET: 'secret' };
  const siteverify: typeof fetch = async (_url, init) =>
    Response.json((init?.body as URLSearchParams).get('response') === 'stub-token'
      ? { success: true, 'error-codes': [] } : { success: false, 'error-codes': ['invalid-input-response'] });
  await context.route(`${SHARE}/**`, async (route) => {
    if (!backend.online) return route.abort('internetdisconnected');
    const request = route.request();
    const body = request.postDataBuffer();
    const response = await handle(new Request(request.url(), {
      method: request.method(), headers: await request.allHeaders(), ...(body ? { body } : {}),
    }), env, siteverify);
    return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  // The widget script itself is stubbed; the app's real loading and callback path runs against it.
  await context.route(TURNSTILE_SCRIPT, (route) => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback("stub-token"),10);return "w1"},remove:()=>{}};',
  }));
  return backend;
}

async function openFile(page: Page, nodes: number, bulk = 0): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-testid="v2-canvas"]')).toBeVisible();
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Open file…' }).click();
  await (await chooser).setFiles({ name: 'flow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file(nodes, bulk))) });
  await expect.poll(() => page.url()).toContain('#/d/');
}

async function exportPanel(page: Page) {
  await page.getByRole('button', { name: 'Canvas menu' }).click();
  await page.getByRole('menuitem', { name: 'Export…' }).click();
  return page.getByRole('dialog', { name: 'Export' });
}

const labels = (page: Page) => page.evaluate(() => {
  const api = (window as unknown as { __V2__?: { getDocument(): { pages: { nodes: { content: { label?: string } }[] }[] } | null } }).__V2__;
  return api?.getDocument()?.pages[0]?.nodes.map((node) => node.content.label) ?? [];
});

async function shareLink(page: Page): Promise<string> {
  const panel = await exportPanel(page);
  await panel.getByRole('button', { name: 'Copy share link' }).click();
  await expect(page.getByText('Share link copied.')).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('share → open in another tab → delete → deleted message @gate', async ({ page, context }) => {
  const backend = await serve(context);
  await openFile(page, 3);
  const link = await shareLink(page);
  expect(link).toMatch(/#\/s\/[0-9a-f]{32}\/[\w-]{43}$/);

  // The server holds ciphertext only.
  expect(backend.bucket.objects.size).toBe(1);
  const [stored] = [...backend.bucket.objects.values()];
  expect(Buffer.from(stored!.bytes).toString('latin1')).not.toContain(LABEL);

  const viewer = await context.newPage();
  await viewer.goto(link);
  await expect(viewer.getByText('Shared diagram, read-only.')).toBeVisible();
  await expect.poll(() => labels(viewer)).toContain(LABEL);

  // The viewer's camera is the visitor's: a pan stays put (a refit on every render would undo it).
  const nodeRect = () => viewer.evaluate(() => {
    const api = (window as unknown as { __V2__: { getState(): { nodes: string[] }; getNodeRect(id: string): { x: number; y: number } | null } }).__V2__;
    const first = api.getState().nodes[0];
    return first ? api.getNodeRect(first) : null;
  });
  await expect.poll(nodeRect).not.toBeNull();
  await viewer.waitForTimeout(400);
  const before = (await nodeRect())!;
  await viewer.evaluate(() => {
    const canvas = document.querySelector('[data-testid="v2-canvas"] canvas')!;
    for (let i = 0; i < 5; i++) canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 40, clientX: 600, clientY: 400 }));
  });
  await expect.poll(async () => (await nodeRect())!.y).toBeLessThan(before.y - 50);
  const panned = (await nodeRect())!;
  await viewer.waitForTimeout(600);
  expect(await nodeRect()).toEqual(panned);

  // A shared viewer offers no sharing: its URL holds another link's key, so no Turnstile script loads here.
  let turnstileRequests = 0;
  viewer.on('request', (request) => { if (request.url().startsWith('https://challenges.cloudflare.com')) turnstileRequests++; });
  await viewer.getByRole('button', { name: 'Canvas menu' }).click();
  await viewer.getByRole('menuitem', { name: 'Export…' }).click();
  await expect(viewer.getByRole('dialog', { name: 'Export' })).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Copy share link' })).toHaveCount(0);
  await viewer.keyboard.press('Escape');
  expect(turnstileRequests).toBe(0);

  // Edit in OpenFlowKit is document-bar chrome, keyboard reachable. A copy that can't be saved says so and stays put.
  await viewer.getByRole('button', { name: 'Edit in OpenFlowKit' }).focus();
  await viewer.evaluate(() => { const open = indexedDB.open; indexedDB.open = () => { indexedDB.open = open; throw new Error('storage blocked'); }; });
  await viewer.keyboard.press('Enter');
  await expect(viewer.getByText(/storage blocked|Could not save|storage/i).first()).toBeVisible();
  expect(viewer.url()).toContain('#/s/');
  // Edit in OpenFlowKit: a local copy that is editable and survives the link.
  await viewer.getByRole('button', { name: 'Edit in OpenFlowKit' }).click();
  await expect.poll(() => viewer.url()).toContain('#/d/');
  await expect.poll(() => labels(viewer)).toContain(LABEL);
  await viewer.close();

  await (await exportPanel(page)).getByRole('button', { name: 'Delete link' }).click();
  await expect(page.getByText('Link deleted. It no longer opens.')).toBeVisible();
  expect(backend.bucket.objects.size).toBe(0);

  const gone = await context.newPage();
  await gone.goto(link);
  await expect(gone.getByText('This link has been deleted.')).toBeVisible();
});

test('a link with its key stripped or cut short says so @gate', async ({ page, context }) => {
  await serve(context);
  await openFile(page, 2);
  const link = await shareLink(page);
  const [, id, key] = /#\/s\/(\w+)\/([\w-]+)$/.exec(link)!;

  const stripped = await context.newPage();
  await stripped.goto(`/#/s/${id}`);
  await expect(stripped.getByText('This link is missing its key.')).toBeVisible();
  await stripped.goto(`/#/s/${id}/${key!.slice(0, 20)}`);
  await expect(stripped.getByText('This link’s key is incomplete.')).toBeVisible();
});

test('opened offline shows try again that works once back online @gate', async ({ page, context }) => {
  const backend = await serve(context);
  await openFile(page, 2);
  const link = await shareLink(page);

  const viewer = await context.newPage();
  backend.online = false;
  await viewer.goto(link);
  await expect(viewer.getByText('You’re offline.')).toBeVisible();
  backend.online = true;
  await viewer.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => labels(viewer)).toContain(LABEL);
});

test('sharing offline says so in words @gate', async ({ page, context }) => {
  const backend = await serve(context);
  await openFile(page, 2);
  backend.online = false;
  await (await exportPanel(page)).getByRole('button', { name: 'Copy share link' }).click();
  await expect(page.getByText('Couldn’t reach the share service. Check your connection and try again.')).toBeVisible();
});

test('a diagram over 1 MB offers the file instead @gate', async ({ page, context }) => {
  const backend = await serve(context);
  await openFile(page, 1, 1_100_000);
  await (await exportPanel(page)).getByRole('button', { name: 'Copy share link' }).click();
  await expect(page.getByText('Too big to share as a link.')).toBeVisible();
  expect(backend.bucket.objects.size).toBe(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
});
