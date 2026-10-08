import { readFileSync } from 'node:fs';
import { expect, test, type Page } from './test';

// The MCP Apps viewer (mcp-server/src/viewer/viewer.html) inside a fake host on another origin.
// npx playwright test e2e/mcp-viewer.spec.ts

const VIEWER = readFileSync('mcp-server/src/viewer/viewer.html', 'utf8');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#39f"/></svg>';
const OPEN_URL = 'https://app.test/#/from/dsl?d=abc';

const HOST = `<!doctype html><body><iframe id="v" src="https://viewer.test/viewer.html" style="width:800px;height:500px;border:0"></iframe><script>
window.log = [];
const frame = document.getElementById('v');
const send = (m) => frame.contentWindow.postMessage({ jsonrpc: '2.0', ...m }, '*');
window.addEventListener('message', (e) => {
  if (e.source !== frame.contentWindow) return;
  const m = e.data; window.log.push(m);
  const p = m.params || {};
  if (m.method === 'ui/initialize') {
    // Strict, like AppBridge: McpUiInitializeRequestSchema.
    const ok = typeof p.protocolVersion === 'string' && p.appInfo && typeof p.appInfo.name === 'string' && typeof p.appInfo.version === 'string' && p.appCapabilities && typeof p.appCapabilities === 'object';
    if (!ok || window.refuseInit) send({ id: m.id, error: { code: -32602, message: 'Invalid params' } });
    else send({ id: m.id, result: { protocolVersion: '2026-01-26', hostInfo: { name: 'fake', version: '1' }, hostCapabilities: window.caps, hostContext: window.ctx } });
  } else if (m.method === 'ui/notifications/initialized') send({ method: 'ui/notifications/tool-result', params: { content: [], structuredContent: window.result } });
  else if (m.method === 'ui/open-link' || m.method === 'ui/request-display-mode') send({ id: m.id, result: m.method === 'ui/open-link' ? {} : { mode: m.params.mode } });
});
</script></body>`;

const CSP = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; connect-src 'none'";

async function openHost(page: Page, result: object, ctx: object = { theme: 'light', displayMode: 'inline', availableDisplayModes: ['inline'] }, extra: { caps?: object; refuseInit?: boolean } = {}) {
  await page.route('https://viewer.test/viewer.html', (route) => route.fulfill({ contentType: 'text/html', body: VIEWER, headers: { 'content-security-policy': CSP } }));
  await page.route('https://host.test/', (route) => route.fulfill({ contentType: 'text/html', body: HOST }));
  await page.addInitScript(([r, c, e]) => { Object.assign(window, { result: r, ctx: c, caps: (e as { caps?: object }).caps ?? {}, refuseInit: (e as { refuseInit?: boolean }).refuseInit }); }, [result, ctx, extra]);
  await page.goto('https://host.test/');
  return page.frameLocator('#v');
}
const sent = (page: Page, method: string) => page.evaluate((m) => (window as unknown as { log: { method?: string; params?: unknown }[] }).log.filter((x) => x.method === m), method);
const base = { title: 'Checkout', svg: SVG, dsl: 'flowchart\nA -> B', nodes: 2, connectors: 1, diagnostics: [], losses: [] };

test('the viewer renders, zooms and opens the editor link @gate', async ({ page }) => {
  const viewer = await openHost(page, { ...base, openUrl: OPEN_URL, losses: ['gradients'] });
  await expect(viewer.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await expect(viewer.getByText('2 nodes · 1 connector')).toBeVisible();
  const img = viewer.locator('#img');
  await expect(img).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(200);
  expect(await sent(page, 'ui/initialize')).toHaveLength(1);
  await expect.poll(async () => (await sent(page, 'ui/notifications/size-changed')).length).toBeGreaterThan(0);
  const size = (await sent(page, 'ui/notifications/size-changed'))[0]?.params as { width: number; height: number };
  expect(size.height).toBeGreaterThan(300);
  await expect(viewer.getByRole('button', { name: 'Download SVG' })).toBeHidden();
  const before = await img.evaluate((el) => el.style.transform);
  await viewer.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(() => img.evaluate((el) => el.style.transform)).not.toBe(before);
  await viewer.locator('#stage').focus();
  const zoomed = await img.evaluate((el) => el.style.transform);
  await page.keyboard.press('0');
  await expect.poll(() => img.evaluate((el) => el.style.transform)).not.toBe(zoomed);
  await viewer.getByText('1 note about this diagram').click();
  await expect(viewer.getByText('Not drawn: gradients')).toBeVisible();
  await viewer.getByRole('button', { name: 'Open in OpenFlowKit' }).click();
  await expect.poll(async () => (await sent(page, 'ui/open-link')).map((m) => m.params)).toEqual([{ url: OPEN_URL }]);
  await expect(viewer.getByRole('button', { name: 'Expand' })).toBeHidden();
});

test('no link disables Open in OpenFlowKit and says why @gate', async ({ page }) => {
  const viewer = await openHost(page, { ...base, openUrl: null });
  const open = viewer.getByRole('button', { name: 'Open in OpenFlowKit' });
  await expect(open).toBeDisabled();
  await expect(viewer.getByText(/no editor link was provided/)).toBeVisible();
  expect(await sent(page, 'ui/open-link')).toHaveLength(0);
});

test('Expand appears only when fullscreen is offered, and follows the dark theme @gate', async ({ page }) => {
  const viewer = await openHost(page, { ...base, openUrl: OPEN_URL }, { theme: 'dark', displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'] });
  await expect(viewer.locator('html')).toHaveAttribute('data-theme', 'dark');
  await viewer.getByRole('button', { name: 'Expand' }).click();
  await expect.poll(async () => (await sent(page, 'ui/request-display-mode')).map((m) => m.params)).toEqual([{ mode: 'fullscreen' }]);
  await expect(viewer.getByRole('button', { name: 'Collapse' })).toBeVisible();
});

test('a failed initialize shows an error instead of a blank view @gate', async ({ page }) => {
  const viewer = await openHost(page, { ...base, openUrl: OPEN_URL }, undefined, { refuseInit: true });
  await expect(viewer.getByRole('status')).toContainText('Could not connect to the host');
});

test('an error result without an SVG lists its diagnostics @gate', async ({ page }) => {
  const viewer = await openHost(page, { title: 'Broken', diagnostics: [{ severity: 'error', line: 3, message: 'Unknown shape "blob"' }], losses: [], openUrl: null });
  await expect(viewer.getByRole('status')).toContainText('error (line 3): Unknown shape "blob"');
  await expect(viewer.getByRole('button', { name: 'Open in OpenFlowKit' })).toBeDisabled();
});

test('a link that is not an OpenFlowKit DSL link keeps Open disabled @gate', async ({ page }) => {
  const viewer = await openHost(page, { ...base, openUrl: 'javascript:alert(1)' });
  await expect(viewer.getByRole('button', { name: 'Open in OpenFlowKit' })).toBeDisabled();
});

test('Download SVG uses ui/download-file when the host offers it @gate', async ({ page }) => {
  const viewer = await openHost(page, { ...base, openUrl: OPEN_URL }, undefined, { caps: { downloadFile: {} } });
  await viewer.getByRole('button', { name: 'Download SVG' }).click();
  await expect.poll(async () => (await sent(page, 'ui/download-file')).map((m) => m.params)).toEqual([
    { contents: [{ type: 'resource', resource: { uri: 'file:///Checkout.svg', mimeType: 'image/svg+xml', text: SVG } }] },
  ]);
});
