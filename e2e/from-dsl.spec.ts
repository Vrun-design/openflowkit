import { deflateRawSync } from 'node:zlib';
import { expect, test } from './test';

// The MCP viewer's "Open in OpenFlowKit" link (#/from/dsl?d=<base64url deflate-raw DSL>).
// npx playwright test e2e/from-dsl.spec.ts

const DSL = 'flowchart\nCart -> Payment -> Receipt\n';
const payload = (text: string) => deflateRawSync(Buffer.from(text, 'utf8')).toString('base64url');

test('a DSL link opens in the editor @gate', async ({ page }) => {
  await page.goto(`/#/from/dsl?d=${payload(DSL)}`);
  await expect.poll(() => page.url(), { timeout: 20_000 }).toContain('#/d/');
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  await expect(source).toHaveValue(/Cart -> Payment/);
  await expect(source).toHaveValue(/Receipt/);
});

test('a damaged DSL link says so and offers home @gate', async ({ page }) => {
  await page.goto('/#/from/dsl?d=AAAA_not_deflate');
  await expect(page.getByTestId('v2-from-dsl')).toContainText('could not be opened');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect.poll(() => page.url()).toContain('#/home');
});
