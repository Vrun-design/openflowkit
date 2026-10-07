import { readFileSync } from 'node:fs';
import { doc } from './helpers';
import { expect, test } from './test';

// One layout everywhere: the editor's ELK worker places the golden DSL where the headless
// file host does (mcp-server/tests/layoutGolden.test.ts holds Node to the same file).
// Both hosts infer icons by default, which sizes the nodes, so this also holds icon
// inference equal; connector routes are drawn by shared code from these positions.
const golden = JSON.parse(readFileSync('e2e/fixtures/layout-golden.json', 'utf8')) as {
  dsl: string; positions: Record<string, { x: number; y: number }>;
};

test('the editor lays out the golden diagram exactly as the headless host does @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill(golden.dsl);
  await source.press('ControlOrMeta+Enter');
  const labels = Object.keys(golden.positions);
  await expect.poll(async () => {
    const nodes = (await doc(page))?.pages[0]?.nodes ?? [];
    return labels.filter((label) => nodes.some((node) => (node.content as { label?: string } | undefined)?.label === label)).length;
  }).toBe(labels.length);
  const nodes = (await doc(page))!.pages[0]!.nodes;
  for (const [label, expected] of Object.entries(golden.positions)) {
    const actual = nodes.find((node) => (node.content as { label?: string } | undefined)?.label === label)!.transform!.translation;
    expect(Math.abs(actual.x - expected.x), `${label} x`).toBeLessThanOrEqual(1);
    expect(Math.abs(actual.y - expected.y), `${label} y`).toBeLessThanOrEqual(1);
  }
});
