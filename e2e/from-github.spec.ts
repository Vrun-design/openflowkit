import { expect, test, type Page } from './test';

// Repo → diagram (#/from/github/<owner>/<repo>): GitHub's tree and raw files are served by
// page.route from a small fake repo, so the spec uses no network.
// npx playwright test e2e/from-github.spec.ts

const COMPOSE = 'services:\n  web:\n    build: ./web\n    environment:\n      API_URL: http://api:8080\n    depends_on: [api]\n  api:\n    build: ./api\n    depends_on: [db]\n  worker:\n    build: ./worker\n  db:\n    image: postgres:16\n';
const REPO: Readonly<Record<string, string>> = {
  'docker-compose.yml': COMPOSE,
  'web/package.json': '{"name":"web"}',
  'api/package.json': '{"name":"api"}',
  'worker/package.json': '{"name":"worker"}',
  'README.md': '# shop\n',
};

async function serveGitHub(page: Page, repo: Readonly<Record<string, string>> | null): Promise<void> {
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => repo
    ? route.fulfill({
      json: { sha: 'abc', truncated: false, tree: Object.entries(repo).map(([path, text]) => ({ path, type: 'blob', mode: '100644', sha: 'x', size: text.length })) },
      headers: { 'access-control-allow-origin': '*' },
    })
    : route.fulfill({ status: 404, json: { message: 'Not Found' }, headers: { 'access-control-allow-origin': '*' } }));
  await page.route('https://raw.githubusercontent.com/acme/shop/**', (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\/acme\/shop\/[^/]+\//, ''));
    return route.fulfill({ status: repo?.[path] === undefined ? 404 : 200, contentType: 'text/plain', body: repo?.[path] ?? '', headers: { 'access-control-allow-origin': '*' } });
  });
}

test('a public repo opens in the editor as its architecture @gate', async ({ page }) => {
  await serveGitHub(page, REPO);
  await page.goto('/#/from/github/acme/shop');
  await expect.poll(() => page.url(), { timeout: 20_000 }).toContain('#/d/');
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  for (const unit of ['container web', 'container api', 'container worker', 'store db']) await expect(source).toHaveValue(new RegExp(`^\\s*${unit}\\b`, 'm'));
  await expect(source).toHaveValue(/store db \[cylinder, tech: PostgreSQL/);
  // The arrow says where it came from: a GitHub link in the model panel.
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Architecture model' });
  const row = (unit: string) => panel.locator('.ofk-v2-model-row').filter({ has: page.locator('.ofk-v2-model-name', { hasText: new RegExp(`^${unit}$`) }) });
  for (const unit of ['web', 'api', 'worker', 'db']) await expect(row(unit)).toHaveCount(1);
  await row('web').click();
  await expect(panel.locator('a[href^="https://github.com/acme/shop/blob/"]').first()).toBeVisible();
});

test('a repo that is not found says so and offers the way home @gate', async ({ page }) => {
  await serveGitHub(page, null);
  await page.goto('/#/from/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('not found, or it is private');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect.poll(() => page.url()).toContain('#/home');
});
