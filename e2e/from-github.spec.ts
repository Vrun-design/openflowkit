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


/** Regression guard: a standalone state renders inside the system root, with design-system buttons. */
async function expectSystemState(page: Page, testId: string, primary: string): Promise<void> {
  await expect(page.locator(`.ofk-system[data-ofk-appearance] [data-testid="${testId}"]`)).toBeVisible();
  await expect(page.getByRole('button', { name: primary })).toHaveAttribute('data-variant', 'primary');
  await expect(page.getByRole('button', { name: primary })).toHaveClass(/ofk-button/);
}

test('a public repo opens in the editor as its architecture @gate', async ({ page }) => {
  await serveGitHub(page, REPO);
  await page.goto('/#/from/github/acme/shop');
  await expect.poll(() => page.url(), { timeout: 20_000 }).toContain('#/d/');
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await expect(source).toBeVisible();
  for (const unit of ['container web', 'container api', 'container worker', 'store db']) await expect(source).toHaveValue(new RegExp(`^\\s*${unit}\\b`, 'm'));
  await expect(source).toHaveValue(/store db \[cylinder, tech: PostgreSQL/);
  // One product: the landing page is its services, not a lone system box.
  await expect.poll(() => page.evaluate(() => {
    type Api = { getDocument(): { pages: { name: string; nodes: { content?: { label?: string } }[] }[] } | null };
    const pages = (window as unknown as { __V2__?: Api }).__V2__?.getDocument()?.pages ?? [];
    return { count: pages.length, name: pages[0]?.name, labels: pages[0]?.nodes.map((node) => node.content?.label) };
  })).toMatchObject({ count: 1, name: expect.stringMatching(/^Services/), labels: expect.arrayContaining(['web', 'api', 'worker']) });
  // The arrow says where it came from: a GitHub link in the model panel.
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Architecture model' });
  const row = (unit: string) => panel.getByRole('treeitem').filter({ has: page.locator('.ofk-tree-label', { hasText: new RegExp(`^${unit}$`) }) });
  for (const unit of ['web', 'api', 'worker', 'db']) await expect(row(unit)).toHaveCount(1);
  await row('web').click();
  await expect(panel.locator('a[href^="https://github.com/acme/shop/blob/"]').first()).toBeVisible();
});

test('a repo that is not found says so and offers the way home @gate', async ({ page }) => {
  await serveGitHub(page, null);
  await page.goto('/#/from/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('not found, or it is private');
  await expectSystemState(page, 'v2-from-github', 'Back to home');
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect.poll(() => page.url()).toContain('#/home');
});

test('a rate-limited read asks for an optional token, sends it to the API only, and succeeds @gate', async ({ page }) => {
  await serveGitHub(page, REPO);
  const seen: { url: string; auth: string | undefined }[] = [];
  page.on('request', (request) => { if (/api\.github\.com|raw\.githubusercontent\.com/.test(request.url())) seen.push({ url: request.url(), auth: request.headers().authorization }); });
  let limited = true;
  await page.route('https://api.github.com/repos/acme/shop/git/trees/**', (route) => limited && !route.request().headers().authorization
    ? route.fulfill({ status: 403, json: { message: 'API rate limit exceeded' }, headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'x-ratelimit-remaining, x-ratelimit-reset', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791396922' } })
    : route.fallback());
  await page.goto('/#/from/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('limiting reads');
  await expect(page.getByRole('alert')).toContainText('The CLI reads a checkout');
  await expectSystemState(page, 'v2-from-github', 'Try with token');
  await expect(page.getByText('A token raises the limit to 5,000/hour.')).toBeVisible();
  await expect(page.getByRole('link', { name: /token on GitHub/ })).toHaveAttribute('href', 'https://github.com/settings/personal-access-tokens/new');
  limited = false;
  await page.getByLabel('GitHub token (optional)').fill('github_pat_test123');
  await page.getByRole('button', { name: 'Try with token' }).click();
  await expect.poll(() => page.url(), { timeout: 20_000 }).toContain('#/d/');
  const api = seen.filter((entry) => entry.url.startsWith('https://api.github.com/'));
  expect(api.some((entry) => entry.auth === 'Bearer github_pat_test123')).toBe(true);
  expect(seen.filter((entry) => entry.url.startsWith('https://raw.githubusercontent.com/')).every((entry) => entry.auth === undefined)).toBe(true);
  expect(page.url()).not.toContain('github_pat');
});

test('the state pages follow the dark theme @gate', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await serveGitHub(page, null);
  await page.goto('/#/from/github/acme/shop');
  await expect(page.getByRole('alert')).toContainText('not found, or it is private');
  const ground = await page.getByTestId('v2-from-github').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(ground).not.toBe('rgb(255, 255, 255)');
  await expect(page.locator('.ofk-system')).toHaveAttribute('data-ofk-appearance', 'dark');
});
